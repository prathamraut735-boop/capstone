import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from firebase_admin import auth as firebase_auth
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import firestore as cloud_firestore

from app.dependencies import get_authenticated_student
from app.schemas import (
    StudentActivation,
    StudentLoginRequest,
    StudentLoginResponse,
    StudentPracticeSubmission,
    StudentProfile,
    StudentUsernameResponse,
    StudentUsernameUpdate,
)
from app.services.students import (
    _ensure_student_id,
    _firebase_password_sign_in,
    _invitation_ref,
    _set_student_username,
    _student_email,
    _student_username_ref,
    _transaction_read,
    learner_data_name,
)
from app.services.lessons import LESSON_CATALOG, LESSON_LEVELS, PUBLISHED_LEARNING_LEVEL_IDS
from app.services.subscriptions import (
    current_month_key,
    effective_plan_id,
    get_plan,
)

logger = logging.getLogger("toy_choir_api")
router = APIRouter()


@router.post("/api/v1/student-invitations/activate")
def activate_student_invitation(
    activation: StudentActivation,
    request: Request,
) -> dict[str, str]:
    database = request.app.state.firestore_client
    invitation_ref = _invitation_ref(database, activation.code)
    now = datetime.now(timezone.utc)
    try:
        invitation_snapshot = invitation_ref.get()
        if not invitation_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid or expired.")
        invitation_data = invitation_snapshot.to_dict() or {}
        expires_at = invitation_data.get("expiresAt")
        if invitation_data.get("status") not in {"pending", "activating"} or not isinstance(expires_at, datetime) or expires_at <= now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid or expired.")
        if invitation_data.get("status") == "activating":
            lease_until = invitation_data.get("activationLeaseUntil")
            if isinstance(lease_until, datetime) and lease_until > now:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation is already being activated.")

        parent_id = invitation_data["parentId"]
        learner_id = invitation_data["learnerId"]
        student_uid = invitation_data["studentUid"]
        learner_ref = database.collection("users").document(parent_id).collection("children").document(learner_id)
        student_id, learner_data = _ensure_student_id(
            database,
            request.app.state.firebase_admin_app,
            parent_id,
            learner_id,
        )
        if invitation_data.get("studentId") not in {None, student_id}:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The invitation does not match this learner.")
        username = activation.username
        student_id_ref = database.collection("studentIds").document(student_id)
        student_account_ref = database.collection("studentAccounts").document(student_uid)
        username_ref = _student_username_ref(database, username)

        @cloud_firestore.transactional
        def claim_invitation(transaction: Any) -> None:
            current_invitation = _transaction_read(transaction, invitation_ref)
            current_learner = _transaction_read(transaction, learner_ref)
            current_username = _transaction_read(transaction, username_ref)
            current_invitation_data = current_invitation.to_dict() or {}
            current_learner_data = current_learner.to_dict() or {}
            current_username_data = current_username.to_dict() or {}
            if (
                not current_invitation.exists
                or current_invitation_data.get("status") not in {"pending", "activating"}
                or not isinstance(current_invitation_data.get("expiresAt"), datetime)
                or current_invitation_data["expiresAt"] <= now
                or current_learner_data.get("pendingInvitationHash") != invitation_ref.id
                or current_learner_data.get("studentId") != student_id
            ):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid or expired.")
            if current_invitation_data.get("studentId") not in {None, student_id}:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid or expired.")
            if current_invitation_data.get("status") == "activating":
                current_lease = current_invitation_data.get("activationLeaseUntil")
                if isinstance(current_lease, datetime) and current_lease > now:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation is already being activated.")
            if not current_learner.exists or current_learner_data.get("status") != "active":
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner profile is inactive.")
            if current_learner_data.get("studentUid"):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student access already exists.")
            if current_username.exists and current_username_data.get("invitationId") != invitation_ref.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken.")
            transaction.set(
                username_ref,
                {
                    "username": username,
                    "studentId": student_id,
                    "studentUid": student_uid,
                    "parentId": parent_id,
                    "learnerId": learner_id,
                    "invitationId": invitation_ref.id,
                    "status": "activating",
                    "createdAt": now,
                },
            )
            transaction.update(
                invitation_ref,
                {
                    "status": "activating",
                    "studentId": student_id,
                    "username": username,
                    "activationLeaseUntil": now + timedelta(minutes=5),
                },
            )

        claim_invitation(database.transaction())
        email = _student_email(student_id)
        admin_app = request.app.state.firebase_admin_app

        @cloud_firestore.transactional
        def release_claim(transaction: Any) -> None:
            current_invitation = _transaction_read(transaction, invitation_ref)
            current_learner = _transaction_read(transaction, learner_ref)
            current_username = _transaction_read(transaction, username_ref)
            current_invitation_data = current_invitation.to_dict() or {}
            current_learner_data = current_learner.to_dict() or {}
            current_username_data = current_username.to_dict() or {}
            if (
                current_invitation_data.get("status") == "activating"
                and current_learner_data.get("pendingInvitationHash") == invitation_ref.id
            ):
                transaction.update(invitation_ref, {"status": "pending", "activationLeaseUntil": None})
            if current_username_data.get("invitationId") == invitation_ref.id:
                transaction.delete(username_ref)

        try:
            try:
                firebase_auth.create_user(
                    uid=student_uid,
                    email=email,
                    password=activation.password,
                    display_name=learner_data_name(learner_data),
                    email_verified=False,
                    app=admin_app,
                )
            except firebase_auth.UidAlreadyExistsError:
                firebase_auth.get_user(student_uid, app=admin_app)
                firebase_auth.update_user(
                    student_uid,
                    email=email,
                    password=activation.password,
                    email_verified=False,
                    disabled=False,
                    app=admin_app,
                )
        except FirebaseError:
            logger.exception("Firebase student account creation failed.")
            release_claim(database.transaction())
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create student credentials. Check the password and try again.",
            ) from None

        @cloud_firestore.transactional
        def complete_activation(transaction: Any) -> None:
            current_invitation = _transaction_read(transaction, invitation_ref)
            current_learner = _transaction_read(transaction, learner_ref)
            current_student_id = _transaction_read(transaction, student_id_ref)
            current_student_account = _transaction_read(transaction, student_account_ref)
            current_username = _transaction_read(transaction, username_ref)
            current_invitation_data = current_invitation.to_dict() or {}
            current_learner_data = current_learner.to_dict() or {}
            current_student_id_data = current_student_id.to_dict() or {}
            current_student_account_data = current_student_account.to_dict() or {}
            current_username_data = current_username.to_dict() or {}
            if (
                current_invitation_data.get("status") != "activating"
                or current_invitation_data.get("studentUid") != student_uid
                or current_invitation_data.get("username") != username
                or not current_learner.exists
                or current_learner_data.get("status") != "active"
                or current_learner_data.get("pendingInvitationHash") != invitation_ref.id
                or current_learner_data.get("studentId") != student_id
                or not current_student_id.exists
                or current_student_id_data.get("parentId") != parent_id
                or current_student_id_data.get("learnerId") != learner_id
                or not current_username.exists
                or current_username_data.get("studentUid") != student_uid
                or current_username_data.get("studentId") != student_id
                or current_username_data.get("invitationId") != invitation_ref.id
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The invitation can no longer be activated.")
            if current_student_account.exists and (
                current_student_account_data.get("parentId") != parent_id
                or current_student_account_data.get("learnerId") != learner_id
                or current_student_account_data.get("studentId") != student_id
                or current_student_account_data.get("username") not in {None, username}
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student access already exists.")

            transaction.update(
                learner_ref,
                {
                    "studentUid": student_uid,
                    "pendingStudentUid": None,
                    "accountStatus": "active",
                    "accessStatus": "active",
                    "activatedAt": datetime.now(timezone.utc),
                    "pendingInvitationHash": None,
                    "invitationExpiresAt": None,
                },
            )
            transaction.set(student_account_ref, {
                "uid": student_uid,
                "role": "student",
                "studentId": student_id,
                "username": username,
                "parentId": parent_id,
                "learnerId": learner_id,
                "createdAt": datetime.now(timezone.utc),
            })
            transaction.update(student_id_ref, {
                "studentUid": student_uid,
                "authEmail": email,
                "status": "active",
                "username": username,
            })
            transaction.set(username_ref, {
                "username": username,
                "studentId": student_id,
                "studentUid": student_uid,
                "parentId": parent_id,
                "learnerId": learner_id,
                "status": "active",
                "createdAt": datetime.now(timezone.utc),
            })
            transaction.update(invitation_ref, {"status": "used", "usedAt": datetime.now(timezone.utc)})

        try:
            complete_activation(database.transaction())
        except HTTPException:
            account_snapshot = database.collection("studentAccounts").document(student_uid).get()
            if not account_snapshot.exists:
                try:
                    firebase_auth.update_user(student_uid, disabled=True, app=admin_app)
                except FirebaseError:
                    logger.exception("Unable to disable an unlinked student account after invitation revocation.")
                release_claim(database.transaction())
            raise
        return {"studentId": student_id, "username": username}
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student invitation activation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student account service is temporarily unavailable. The invitation can be retried shortly.",
        ) from None
    except Exception:
        logger.exception("Unexpected student invitation activation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to activate the student account.",
        ) from None

@router.post("/api/v1/students/login", response_model=StudentLoginResponse)
def login_student(
    student_login: StudentLoginRequest,
    request: Request,
) -> StudentLoginResponse:
    database = request.app.state.firestore_client
    identifier = student_login.studentId
    try:
        username_data = None
        if re.fullmatch(r"TC[0-9]{7,}", identifier, re.IGNORECASE):
            student_id = identifier.upper()
        else:
            if not re.fullmatch(r"[a-z0-9_]{3,20}", identifier):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Student ID or username and password are incorrect.",
                )
            username_snapshot = database.collection("studentUsernames").document(identifier).get()
            username_data = username_snapshot.to_dict() or {}
            student_id = username_data.get("studentId")
            if not username_snapshot.exists or username_data.get("status") != "active":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Student ID or username and password are incorrect.",
                )

        if not isinstance(student_id, str) or not student_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or username and password are incorrect.",
            )
        student_id_snapshot = database.collection("studentIds").document(student_id).get()
        student_id_data = student_id_snapshot.to_dict() or {}
        student_uid = student_id_data.get("studentUid")
        parent_id = student_id_data.get("parentId")
        learner_id = student_id_data.get("learnerId")
        auth_email = student_id_data.get("authEmail") or _student_email(student_id)
        if (
            not student_id_snapshot.exists
            or student_id_data.get("status") != "active"
            or not isinstance(student_uid, str)
            or not isinstance(parent_id, str)
            or not isinstance(learner_id, str)
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or username and password are incorrect.",
            )
        if username_data is not None and (
            username_data.get("username") != identifier
            or username_data.get("studentUid") != student_uid
            or student_id_data.get("username") != identifier
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or username and password are incorrect.",
            )

        learner_snapshot = (
            database.collection("users").document(parent_id).collection("children").document(learner_id).get()
        )
        learner_data = learner_snapshot.to_dict() or {}
        if (
            not learner_snapshot.exists
            or learner_data.get("status") != "active"
            or learner_data.get("studentUid") != student_uid
            or learner_data.get("studentId") != student_id
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or username and password are incorrect.",
            )

        auth_result = _firebase_password_sign_in(auth_email, student_login.password)
        if auth_result.get("localId") != student_uid:
            logger.warning("Firebase returned a different UID for a mapped Student ID.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or username and password are incorrect.",
            )
        custom_token = firebase_auth.create_custom_token(
            student_uid,
            app=request.app.state.firebase_admin_app,
        )
        if isinstance(custom_token, bytes):
            custom_token = custom_token.decode("utf-8")
        return StudentLoginResponse(customToken=custom_token, studentId=student_id)
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student ID lookup failed during login.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student sign-in is temporarily unavailable.",
        ) from None
    except FirebaseError:
        logger.exception("Firebase custom token creation failed for student login.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student sign-in is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student login failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to sign in the student.",
        ) from None


@router.put("/api/v1/students/me/username", response_model=StudentUsernameResponse)
def set_my_student_username(
    username_update: StudentUsernameUpdate,
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> StudentUsernameResponse:
    user, account, learner = authenticated
    _, learner = _ensure_student_id(
        request.app.state.firestore_client,
        request.app.state.firebase_admin_app,
        account["parentId"],
        account["learnerId"],
    )
    username = _set_student_username(
        request.app.state.firestore_client,
        user["uid"],
        account,
        learner,
        username_update.username,
    )
    return StudentUsernameResponse(username=username)


@router.get("/api/v1/students/me", response_model=StudentProfile)
def get_my_student_profile(
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> StudentProfile:
    user, account, learner = authenticated
    return StudentProfile(
        uid=user["uid"],
        studentId=learner["studentId"],
        username=account.get("username"),
        learnerId=account["learnerId"],
        firstName=learner["firstName"],
        preferredName=learner.get("preferredName"),
        ageRange=learner["ageRange"],
        learningLevel=learner.get("learningLevel", "Level 1"),
        lessonProgress=learner.get("lessonProgress", {"completed": 0, "total": 32}),
        practiceSubmissionStatus=learner.get("practiceSubmissionStatus", "none"),
        teacherApprovalStatus=learner.get("teacherApprovalStatus", "not_requested"),
    )


def _student_plan_and_usage(database: Any, parent_id: str) -> tuple[dict[str, Any], int, str]:
    subscription_snapshot = database.collection("subscriptions").document(parent_id).get()
    subscription = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
    plan = get_plan(effective_plan_id(subscription))
    month_key = current_month_key()
    usage_snapshot = (
        database.collection("users")
        .document(parent_id)
        .collection("practiceUsage")
        .document(month_key)
        .get()
    )
    usage = usage_snapshot.to_dict() or {}
    submissions_used = usage.get("submissionCount", 0)
    if not isinstance(submissions_used, int) or submissions_used < 0:
        raise ValueError("The stored practice usage count is invalid.")
    return plan, submissions_used, month_key


@router.get("/api/v1/students/me/entitlements")
def get_my_learning_entitlements(
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> dict[str, Any]:
    _, account, _ = authenticated
    try:
        plan, submissions_used, month_key = _student_plan_and_usage(
            request.app.state.firestore_client,
            account["parentId"],
        )
        remaining = max(0, plan["practiceSubmissionsPerMonth"] - submissions_used)
        return {
            "planId": plan["id"],
            "planName": plan["name"],
            "status": "active",
            "limits": {
                "maxLearners": plan["maxLearners"],
                "maxLearningLevel": plan["maxLearningLevel"],
                "practiceSubmissionsPerMonth": plan["practiceSubmissionsPerMonth"],
            },
            "practiceSubmissionsUsed": submissions_used,
            "practiceSubmissionsRemaining": remaining,
            "practiceMonth": month_key,
            "publishedLearningLevelIds": sorted(PUBLISHED_LEARNING_LEVEL_IDS),
        }
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Student entitlement lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learning access is temporarily unavailable.",
        ) from None
    except ValueError:
        logger.exception("Stored student entitlement data is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Learning access is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student entitlement lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve learning access.",
        ) from None


@router.get("/api/v1/students/me/lessons/{lesson_id}/access")
def check_my_lesson_access(
    lesson_id: str,
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> dict[str, Any]:
    _, account, _ = authenticated
    level_id = LESSON_LEVELS.get(lesson_id)
    if level_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    try:
        subscription_snapshot = (
            request.app.state.firestore_client.collection("subscriptions")
            .document(account["parentId"])
            .get()
        )
        subscription = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
        plan = get_plan(effective_plan_id(subscription))
        if level_id not in PUBLISHED_LEARNING_LEVEL_IDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This learning level has not been published.",
            )
        if level_id > plan["maxLearningLevel"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The {plan['name']} Plan does not include this learning level.",
            )
        return {"lessonId": lesson_id, "levelId": level_id, "allowed": True}
    except HTTPException:
        raise
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Student lesson entitlement lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Lesson access is temporarily unavailable.",
        ) from None
    except ValueError:
        logger.exception("Stored lesson entitlement data is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lesson access is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student lesson authorization failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify lesson access.",
        ) from None


@router.get("/api/v1/students/me/lessons")
def get_my_lessons(
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> dict[str, Any]:
    _, account, _ = authenticated
    database = request.app.state.firestore_client
    parent_id = account["parentId"]
    try:
        subscription_snapshot = database.collection("subscriptions").document(parent_id).get()
        subscription = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
        plan = get_plan(effective_plan_id(subscription))
        lessons = [
            lesson
            for lesson in LESSON_CATALOG
            if lesson["levelId"] in PUBLISHED_LEARNING_LEVEL_IDS
            and lesson["levelId"] <= plan["maxLearningLevel"]
        ]
        learner_id = account["learnerId"]
        progress_snapshots = (
            database.collection("users")
            .document(parent_id)
            .collection("children")
            .document(learner_id)
            .collection("lessonProgress")
            .stream()
        )
        completed_ids = {
            snapshot.id
            for snapshot in progress_snapshots
            if (snapshot.to_dict() or {}).get("status") == "complete"
        }
        accessible_ids = {lesson["id"] for lesson in lessons}
        completed_count = len(completed_ids & accessible_ids)
        return {
            "lessons": [
                {**lesson, "status": "complete" if lesson["id"] in completed_ids else "available"}
                for lesson in lessons
            ],
            "progress": {"completed": completed_count, "total": len(lessons)},
        }
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Student lesson catalog lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Your lessons are temporarily unavailable.",
        ) from None
    except ValueError:
        logger.exception("Stored student lesson entitlement data is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Your lessons are temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student lesson catalog lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve your lessons.",
        ) from None


@router.post("/api/v1/students/me/lessons/{lesson_id}/complete")
def complete_my_lesson(
    lesson_id: str,
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> dict[str, Any]:
    _, account, _ = authenticated
    level_id = LESSON_LEVELS.get(lesson_id)
    if level_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")

    database = request.app.state.firestore_client
    parent_id = account["parentId"]
    learner_id = account["learnerId"]
    try:
        subscription_ref = database.collection("subscriptions").document(parent_id)
        subscription_snapshot = subscription_ref.get()
        subscription = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
        plan = get_plan(effective_plan_id(subscription))
        if level_id not in PUBLISHED_LEARNING_LEVEL_IDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This learning level has not been published.",
            )
        if level_id > plan["maxLearningLevel"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The {plan['name']} Plan does not include this learning level.",
            )

        learner_ref = (
            database.collection("users")
            .document(parent_id)
            .collection("children")
            .document(learner_id)
        )
        progress_collection = learner_ref.collection("lessonProgress")
        progress_ref = progress_collection.document(lesson_id)

        @cloud_firestore.transactional
        def persist_completion(transaction: Any) -> int:
            progress_snapshot = _transaction_read(transaction, progress_ref)
            learner_snapshot = _transaction_read(transaction, learner_ref)
            if not learner_snapshot.exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner profile not found.")

            learner_data = learner_snapshot.to_dict() or {}
            existing_progress = learner_data.get("lessonProgress", {})
            if not isinstance(existing_progress, dict):
                raise ValueError("The stored lesson progress summary is invalid.")
            completed_count = existing_progress.get("completed", 0)
            total = existing_progress.get("total", 32)
            if (
                not isinstance(completed_count, int)
                or isinstance(completed_count, bool)
                or completed_count < 0
                or not isinstance(total, int)
                or isinstance(total, bool)
                or total < len(LESSON_CATALOG)
                or completed_count > total
            ):
                raise ValueError("The stored lesson progress summary is invalid.")

            already_complete = (
                progress_snapshot.exists
                and (progress_snapshot.to_dict() or {}).get("status") == "complete"
            )
            next_count = max(completed_count, 1) if already_complete else completed_count + 1
            if not already_complete:
                transaction.set(
                    progress_ref,
                    {
                        "lessonId": lesson_id,
                        "status": "complete",
                        "completedAt": cloud_firestore.SERVER_TIMESTAMP,
                    },
                )
            transaction.update(
                learner_ref,
                {
                    "lessonProgress": {"completed": next_count, "total": total},
                    "updatedAt": cloud_firestore.SERVER_TIMESTAMP,
                },
            )
            return next_count

        completed_count = persist_completion(database.transaction())
        return {
            "lessonId": lesson_id,
            "status": "complete",
            "completedLessons": completed_count,
            "totalLessons": len(LESSON_CATALOG),
        }
    except HTTPException:
        raise
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Student lesson completion could not be saved.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Lesson progress could not be saved. Please try again.",
        ) from None
    except ValueError:
        logger.exception("Stored student lesson progress data or transaction is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lesson progress could not be saved.",
        ) from None
    except Exception:
        logger.exception("Unexpected student lesson completion failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save lesson progress.",
        ) from None


@router.post("/api/v1/students/me/practice-submissions", status_code=status.HTTP_201_CREATED)
def create_my_practice_submission(
    submission: StudentPracticeSubmission,
    request: Request,
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> dict[str, Any]:
    user, account, _ = authenticated
    level_id = LESSON_LEVELS.get(submission.lessonId)
    if level_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    if level_id not in PUBLISHED_LEARNING_LEVEL_IDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Practice submissions are unavailable for unpublished lessons.",
        )

    database = request.app.state.firestore_client
    parent_id = account["parentId"]
    month_key = current_month_key()
    subscription_ref = database.collection("subscriptions").document(parent_id)
    usage_ref = (
        database.collection("users")
        .document(parent_id)
        .collection("practiceUsage")
        .document(month_key)
    )
    submission_id = uuid4().hex
    practice_ref = (
        database.collection("users")
        .document(parent_id)
        .collection("practiceSubmissions")
        .document(submission_id)
    )
    now = datetime.now(timezone.utc)

    @cloud_firestore.transactional
    def record_submission(transaction: Any) -> tuple[dict[str, Any], int]:
        subscription_snapshot = _transaction_read(transaction, subscription_ref)
        subscription = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
        plan = get_plan(effective_plan_id(subscription))
        if level_id > plan["maxLearningLevel"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The {plan['name']} Plan does not include this learning level.",
            )
        usage_snapshot = _transaction_read(transaction, usage_ref)
        usage = usage_snapshot.to_dict() if usage_snapshot.exists else {}
        submissions_used = usage.get("submissionCount", 0)
        if not isinstance(submissions_used, int) or submissions_used < 0:
            raise ValueError("The stored practice usage count is invalid.")
        limit = plan["practiceSubmissionsPerMonth"]
        if submissions_used >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"The {plan['name']} Plan's {limit} monthly practice submissions have been used.",
            )
        next_count = submissions_used + 1
        transaction.set(
            usage_ref,
            {
                "parentId": parent_id,
                "month": month_key,
                "submissionCount": next_count,
                "updatedAt": cloud_firestore.SERVER_TIMESTAMP,
            },
        )
        transaction.set(
            practice_ref,
            {
                "parentId": parent_id,
                "learnerId": account["learnerId"],
                "studentUid": user["uid"],
                "lessonId": submission.lessonId,
                "planId": plan["id"],
                "month": month_key,
                "status": "simulated",
                "createdAt": cloud_firestore.SERVER_TIMESTAMP,
            },
        )
        return plan, next_count

    try:
        plan, submissions_used = record_submission(database.transaction())
        return {
            "id": submission_id,
            "lessonId": submission.lessonId,
            "status": "simulated",
            "submittedAt": now.isoformat(),
            "practiceSubmissionsUsed": submissions_used,
            "practiceSubmissionsRemaining": max(
                0, plan["practiceSubmissionsPerMonth"] - submissions_used
            ),
            "monthlyLimit": plan["practiceSubmissionsPerMonth"],
            "practiceMonth": month_key,
        }
    except HTTPException:
        raise
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Practice submission could not be recorded.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Practice submissions are temporarily unavailable.",
        ) from None
    except ValueError:
        logger.exception("Stored practice submission data is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Practice submissions are temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected practice submission failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to record the practice submission.",
        ) from None
