import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

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
