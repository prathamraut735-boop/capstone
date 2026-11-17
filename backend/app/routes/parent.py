import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from firebase_admin import auth as firebase_auth, storage as firebase_storage
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import firestore as cloud_firestore

from app.dependencies import get_authenticated_parent
from app.schemas import (
    Learner,
    LearnerCreate,
    LearnerUpdate,
    StudentInvitation,
    StudentPasswordResetResponse,
)
from app.services.learners import _learner_response
from app.services.subscriptions import effective_plan_id, get_plan
from app.services.students import (
    _ensure_student_id,
    _next_student_id,
    _set_student_auth_disabled,
    _student_account_status,
    _student_email,
    _transaction_read,
)

logger = logging.getLogger("toy_choir_api")
router = APIRouter()


@router.get("/api/v1/users/me/children", response_model=list[Learner])
def list_my_children(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> list[Learner]:
    database = request.app.state.firestore_client
    children = database.collection("users").document(current_user["uid"]).collection("children")
    try:
        learner_records = []
        for snapshot in children.stream():
            _, data = _ensure_student_id(
                database,
                request.app.state.firebase_admin_app,
                current_user["uid"],
                snapshot.id,
            )
            invitation_expires_at = data.get("invitationExpiresAt")
            if invitation_expires_at and invitation_expires_at <= datetime.now(timezone.utc):
                data["accountStatus"] = "profile_only"
                data["accessStatus"] = "not_created"
                data.pop("invitationExpiresAt", None)
            learner_records.append(_learner_response(snapshot.id, data, current_user["uid"]))
        return learner_records
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Firestore learner lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learner service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore learner lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve learner profiles.",
        ) from None

@router.post(
    "/api/v1/users/me/children",
    response_model=Learner,
    status_code=status.HTTP_201_CREATED,
)
def create_my_child(
    learner: LearnerCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Learner:
    learner_id = uuid4().hex
    created_at = datetime.now(timezone.utc)
    interests = learner.learningInterests
    if "All activities" in interests:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select individual learning interests; All activities is not a valid stored interest.",
        )
    learner_data = {
        **learner.model_dump(),
        "parentId": current_user["uid"],
        "createdAt": created_at,
        "learningLevel": "Level 1",
        "accountStatus": "profile_only",
        "accessStatus": "not_created",
        "assignedTeacher": None,
        "lessonProgress": {"completed": 0, "total": 32},
        "practiceSubmissionStatus": "none",
        "teacherApprovalStatus": "not_requested",
        "status": "active",
        "studentUid": None,
    }
    database = request.app.state.firestore_client
    learner_ref = (
        database.collection("users").document(current_user["uid"]).collection("children").document(learner_id)
    )
    subscription_ref = database.collection("subscriptions").document(current_user["uid"])
    children_ref = database.collection("users").document(current_user["uid"]).collection("children")

    @cloud_firestore.transactional
    def create_learner(transaction: Any) -> str:
        subscription_snapshot = _transaction_read(transaction, subscription_ref)
        subscription_data = subscription_snapshot.to_dict() if subscription_snapshot.exists else None
        plan = get_plan(effective_plan_id(subscription_data))
        existing_children = transaction.get(children_ref)
        active_learners = sum(
            1
            for child in existing_children
            if (child.to_dict() or {}).get("status", "active") == "active"
        )
        if active_learners >= plan["maxLearners"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"The {plan['name']} Plan allows up to {plan['maxLearners']} active learner(s). Upgrade your plan to add another learner.",
            )
        student_id, counter_ref, sequence, student_id_ref, _ = _next_student_id(transaction, database)
        transaction.set(counter_ref, {"lastSequence": sequence})
        transaction.set(
            student_id_ref,
            {
                "studentId": student_id,
                "parentId": current_user["uid"],
                "learnerId": learner_id,
                "studentUid": None,
                "authEmail": None,
                "status": "profile_only",
                "createdAt": created_at,
            },
        )
        learner_data["studentId"] = student_id
        transaction.set(learner_ref, learner_data)
        return student_id

    try:
        create_learner(database.transaction())
    except GoogleAPICallError:
        logger.exception("Firestore learner creation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learner service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore learner creation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the learner profile.",
        ) from None
    return _learner_response(learner_id, learner_data, current_user["uid"])

@router.patch("/api/v1/users/me/children/{learner_id}", response_model=Learner)
def update_my_child(
    learner_id: str,
    learner_update: LearnerUpdate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Learner:
    database = request.app.state.firestore_client
    learner_ref = (
        database.collection("users")
        .document(current_user["uid"])
        .collection("children")
        .document(learner_id)
    )
    updates = learner_update.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No profile changes were provided.")
    if "learningInterests" in updates and len(set(updates["learningInterests"] or [])) != len(updates["learningInterests"] or []):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Learning interests cannot contain duplicates.")
    try:
        learner_snapshot = learner_ref.get()
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        current_data = learner_snapshot.to_dict() or {}
        _, current_data = _ensure_student_id(
            database,
            request.app.state.firebase_admin_app,
            current_user["uid"],
            learner_id,
        )
        if updates.get("status") == "active":
            updates["accountStatus"] = "active" if current_data.get("studentUid") else "profile_only"
            updates["accessStatus"] = "active" if current_data.get("studentUid") else "not_created"
        if updates.get("status") == "deactivated":
            student_uid = current_data.get("studentUid") or current_data.get("pendingStudentUid")
            if student_uid:
                _set_student_auth_disabled(
                    student_uid,
                    disabled=True,
                    admin_app=request.app.state.firebase_admin_app,
                )
            updates["accountStatus"] = "deactivated"
            updates["accessStatus"] = "deactivated"
            invitation_hash = current_data.get("pendingInvitationHash")
            if invitation_hash:
                invitation_ref = database.collection("studentInvitations").document(invitation_hash)
                invitation_snapshot = invitation_ref.get()
                if invitation_snapshot.exists:
                    invitation_ref.update({"status": "revoked"})
            updates["pendingInvitationHash"] = None
        elif current_data.get("status") == "deactivated" and updates.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reactivate the learner profile before editing it.",
            )
        if updates.get("status") == "active" and current_data.get("studentUid"):
            _set_student_auth_disabled(
                current_data["studentUid"],
                disabled=False,
                admin_app=request.app.state.firebase_admin_app,
            )
        updates["updatedAt"] = datetime.now(timezone.utc)
        learner_ref.update(updates)
        if updates.get("status"):
            database.collection("studentIds").document(current_data["studentId"]).update(
                {"status": "deactivated" if updates["status"] == "deactivated" else _student_account_status({**current_data, **updates})}
            )
        current_data.update(updates)
        return _learner_response(learner_id, current_data, current_user["uid"])
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Firestore learner update failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learner service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected learner update failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the learner profile.",
        ) from None

@router.put("/api/v1/users/me/children/{learner_id}/profile-picture", response_model=Learner)
async def upload_child_profile_picture(
    learner_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Learner:
    content_type = request.headers.get("content-type", "").split(";", maxsplit=1)[0].strip().lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Use a JPEG, PNG, or WebP profile picture.",
        )

    image = await request.body()
    if not image or len(image) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile pictures must be smaller than 2 MB.",
        )
    valid_signature = (
        content_type == "image/jpeg" and image.startswith(b"\xff\xd8\xff")
    ) or (
        content_type == "image/png" and image.startswith(b"\x89PNG\r\n\x1a\n")
    ) or (
        content_type == "image/webp"
        and image.startswith(b"RIFF")
        and image[8:12] == b"WEBP"
    )
    if not valid_signature:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The uploaded file does not match its image format.",
        )

    database = request.app.state.firestore_client
    learner_ref = database.collection("users").document(current_user["uid"]).collection("children").document(learner_id)
    picture_path = f"learner-profiles/{current_user['uid']}/{learner_id}/profile"
    try:
        learner_snapshot = learner_ref.get()
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        _, learner_data = _ensure_student_id(
            database,
            request.app.state.firebase_admin_app,
            current_user["uid"],
            learner_id,
        )
        if learner_data.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reactivate the learner before editing the profile.")
        blob = firebase_storage.bucket(app=request.app.state.firebase_admin_app).blob(picture_path)
        blob.upload_from_string(image, content_type=content_type)
        learner_ref.update({"profilePicturePath": picture_path, "updatedAt": datetime.now(timezone.utc)})
        learner_data["profilePicturePath"] = picture_path
        learner_data["updatedAt"] = datetime.now(timezone.utc)
        return _learner_response(learner_id, learner_data, current_user["uid"])
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Profile picture storage operation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile picture service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected profile picture upload failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the profile picture.",
        ) from None

@router.get("/api/v1/users/me/children/{learner_id}/profile-picture")
def get_child_profile_picture(
    learner_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Response:
    database = request.app.state.firestore_client
    learner_ref = database.collection("users").document(current_user["uid"]).collection("children").document(learner_id)
    try:
        learner_snapshot = learner_ref.get()
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        learner_data = learner_snapshot.to_dict() or {}
        expected_path = f"learner-profiles/{current_user['uid']}/{learner_id}/profile"
        if learner_data.get("profilePicturePath") != expected_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile picture is available.")
        blob = firebase_storage.bucket(app=request.app.state.firebase_admin_app).blob(expected_path)
        if not blob.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile picture is available.")
        image = blob.download_as_bytes()
        content_type = blob.content_type
        if content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Invalid profile picture format.")
        return Response(
            content=image,
            media_type=content_type,
            headers={
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Profile picture lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile picture service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected profile picture lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the profile picture.",
        ) from None

@router.delete("/api/v1/users/me/children/{learner_id}/profile-picture", status_code=status.HTTP_204_NO_CONTENT)
def delete_child_profile_picture(
    learner_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> None:
    database = request.app.state.firestore_client
    learner_ref = database.collection("users").document(current_user["uid"]).collection("children").document(learner_id)
    try:
        learner_snapshot = learner_ref.get()
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        learner_data = learner_snapshot.to_dict() or {}
        expected_path = f"learner-profiles/{current_user['uid']}/{learner_id}/profile"
        if learner_data.get("profilePicturePath") != expected_path:
            return
        learner_ref.update({"profilePicturePath": None, "updatedAt": datetime.now(timezone.utc)})
        firebase_storage.bucket(app=request.app.state.firebase_admin_app).blob(expected_path).delete()
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Profile picture removal failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile picture service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected profile picture removal failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to remove the profile picture.",
        ) from None

@router.post(
    "/api/v1/users/me/children/{learner_id}/student-invitations",
    response_model=StudentInvitation,
    status_code=status.HTTP_201_CREATED,
)
def create_student_invitation(
    learner_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> StudentInvitation:
    database = request.app.state.firestore_client
    learner_ref = database.collection("users").document(current_user["uid"]).collection("children").document(learner_id)
    student_id, _ = _ensure_student_id(
        database,
        request.app.state.firebase_admin_app,
        current_user["uid"],
        learner_id,
    )
    code = secrets.token_urlsafe(32)
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    invitation_ref = database.collection("studentInvitations").document(code_hash)

    @cloud_firestore.transactional
    def create_invite(transaction: Any) -> str:
        learner_snapshot = _transaction_read(transaction, learner_ref)
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        learner_data = learner_snapshot.to_dict() or {}
        if learner_data.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reactivate the learner before creating student access.")
        if learner_data.get("studentUid"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner already has student access.")
        if learner_data.get("studentId") != student_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID changed. Refresh and retry.")

        student_id_ref = database.collection("studentIds").document(student_id)
        student_id_snapshot = _transaction_read(transaction, student_id_ref)
        student_id_data = student_id_snapshot.to_dict() or {}
        if (
            not student_id_snapshot.exists
            or student_id_data.get("parentId") != current_user["uid"]
            or student_id_data.get("learnerId") != learner_id
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID mapping is inconsistent.")

        old_invitation_hash = learner_data.get("pendingInvitationHash")
        old_invitation_ref = None
        old_invitation = None
        if old_invitation_hash:
            old_invitation_ref = database.collection("studentInvitations").document(old_invitation_hash)
            old_invitation = _transaction_read(transaction, old_invitation_ref)

        student_uid = learner_data.get("pendingStudentUid") or uuid4().hex
        invitation_data = {
            "parentId": current_user["uid"],
            "learnerId": learner_id,
            "studentId": student_id,
            "studentUid": student_uid,
            "status": "pending",
            "createdAt": datetime.now(timezone.utc),
            "expiresAt": expires_at,
        }
        if old_invitation_ref is not None and old_invitation is not None and old_invitation.exists:
            if (old_invitation.to_dict() or {}).get("status") in {"pending", "activating"}:
                transaction.update(old_invitation_ref, {"status": "revoked"})
        transaction.set(invitation_ref, invitation_data)
        transaction.update(
            learner_ref,
            {
                "pendingStudentUid": student_uid,
                "pendingInvitationHash": code_hash,
                "invitationExpiresAt": expires_at,
                "accountStatus": "invitation_pending",
                "accessStatus": "invitation_pending",
            },
        )
        transaction.update(
            student_id_ref,
            {
                "status": "invitation_pending",
                "authEmail": _student_email(student_id),
            },
        )
        return student_id

    try:
        student_id = create_invite(database.transaction())
        return StudentInvitation(code=code, studentId=student_id, expiresAt=expires_at)
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student invitation creation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student access service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student invitation creation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create student access.",
        ) from None

@router.post(
    "/api/v1/users/me/children/{learner_id}/student-password-reset",
    response_model=StudentPasswordResetResponse,
)
def reset_student_password(
    learner_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> StudentPasswordResetResponse:
    database = request.app.state.firestore_client
    try:
        student_id, learner_data = _ensure_student_id(
            database,
            request.app.state.firebase_admin_app,
            current_user["uid"],
            learner_id,
        )
        student_uid = learner_data.get("studentUid")
        if learner_data.get("status") != "active" or not student_uid:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student access must be active before its password can be reset.",
            )
        student_account_snapshot = database.collection("studentAccounts").document(student_uid).get()
        student_account = student_account_snapshot.to_dict() or {}
        if (
            not student_account_snapshot.exists
            or student_account.get("parentId") != current_user["uid"]
            or student_account.get("learnerId") != learner_id
            or student_account.get("studentId") != student_id
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student account mapping is inconsistent.")

        temporary_password = secrets.token_urlsafe(18)
        firebase_auth.update_user(
            student_uid,
            password=temporary_password,
            disabled=False,
            app=request.app.state.firebase_admin_app,
        )
        return StudentPasswordResetResponse(
            studentId=student_id,
            temporaryPassword=temporary_password,
        )
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student password reset lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student password reset is temporarily unavailable.",
        ) from None
    except FirebaseError:
        logger.exception("Firebase student password reset failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student password reset is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student password reset failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset the student password.",
        ) from None
