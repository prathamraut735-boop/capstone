import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as URLRequest, urlopen

import firebase_admin
from google.cloud import firestore as cloud_firestore
from fastapi import HTTPException, status
from firebase_admin import auth as firebase_auth
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError

from app.config import (
    firebase_web_api_key,
    student_auth_email_domain,
)

logger = logging.getLogger("toy_choir_api")


def _student_email(student_id: str) -> str:
    return f"{student_id.lower()}@{student_auth_email_domain}"

def _invitation_ref(database: Any, code: str) -> Any:
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return database.collection("studentInvitations").document(code_hash)


def _student_username_ref(database: Any, username: str) -> Any:
    return database.collection("studentUsernames").document(username)


def _transaction_read(transaction: Any, reference: Any) -> Any:
    snapshots = transaction.get(reference)
    try:
        return next(snapshots)
    except StopIteration:
        raise RuntimeError("Firestore transaction did not return a document snapshot.") from None

def _next_student_id(transaction: Any, database: Any) -> tuple[str, Any, int, Any, Any]:
    year = datetime.now(timezone.utc).year
    counter_ref = database.collection("studentIdCounters").document(str(year))
    counter_snapshot = _transaction_read(transaction, counter_ref)
    counter_data = counter_snapshot.to_dict() or {}
    last_sequence = counter_data.get("lastSequence", 0)
    if not isinstance(last_sequence, int) or isinstance(last_sequence, bool) or last_sequence < 0:
        raise RuntimeError("The student ID counter is invalid.")

    sequence = last_sequence + 1
    while True:
        student_id = f"TC{year}{sequence:03d}"
        student_id_ref = database.collection("studentIds").document(student_id)
        student_id_snapshot = _transaction_read(transaction, student_id_ref)
        if not student_id_snapshot.exists:
            return student_id, counter_ref, sequence, student_id_ref, student_id_snapshot
        sequence += 1

def _student_account_status(learner: dict[str, Any]) -> str:
    if learner.get("status") != "active":
        return "deactivated"
    if learner.get("studentUid"):
        return "active"
    if learner.get("pendingInvitationHash"):
        return "invitation_pending"
    return "profile_only"

def _ensure_student_id(
    database: Any,
    admin_app: firebase_admin.App,
    parent_id: str,
    learner_id: str,
) -> tuple[str, dict[str, Any]]:
    learner_ref = database.collection("users").document(parent_id).collection("children").document(learner_id)
    initial_snapshot = learner_ref.get()
    if not initial_snapshot.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
    initial_data = initial_snapshot.to_dict() or {}
    initial_uid = initial_data.get("studentUid")
    auth_email = None
    if initial_uid:
        try:
            firebase_user = firebase_auth.get_user(initial_uid, app=admin_app)
            auth_email = firebase_user.email
            if firebase_user.email_verified:
                firebase_auth.update_user(initial_uid, email_verified=False, app=admin_app)
        except firebase_auth.UserNotFoundError:
            logger.warning("Linked Firebase student user is missing during Student ID migration.")

    @cloud_firestore.transactional
    def assign_student_id(transaction: Any) -> tuple[str, dict[str, Any]]:
        learner_snapshot = _transaction_read(transaction, learner_ref)
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        learner_data = learner_snapshot.to_dict() or {}
        student_id = learner_data.get("studentId")
        is_new_student_id = not isinstance(student_id, str) or not student_id
        counter_ref = None
        sequence = None

        if is_new_student_id:
            student_id, counter_ref, sequence, student_id_ref, student_id_snapshot = _next_student_id(
                transaction,
                database,
            )
        else:
            student_id_ref = database.collection("studentIds").document(student_id)
            student_id_snapshot = _transaction_read(transaction, student_id_ref)

        mapping_data = student_id_snapshot.to_dict() or {}
        if student_id_snapshot.exists and (
            mapping_data.get("parentId") != parent_id
            or mapping_data.get("learnerId") != learner_id
            or (mapping_data.get("studentUid") and mapping_data.get("studentUid") != learner_data.get("studentUid"))
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID mapping is inconsistent.")

        student_uid = learner_data.get("studentUid")
        student_account_ref = database.collection("studentAccounts").document(student_uid) if student_uid else None
        student_account_snapshot = (
            _transaction_read(transaction, student_account_ref) if student_account_ref is not None else None
        )
        if student_account_snapshot and student_account_snapshot.exists:
            account_data = student_account_snapshot.to_dict() or {}
            if account_data.get("parentId") != parent_id or account_data.get("learnerId") != learner_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student account mapping is inconsistent.")

        invitation_hash = learner_data.get("pendingInvitationHash")
        invitation_ref = database.collection("studentInvitations").document(invitation_hash) if invitation_hash else None
        invitation_snapshot = _transaction_read(transaction, invitation_ref) if invitation_ref is not None else None

        current_uid_matches = initial_uid == student_uid
        stored_email = auth_email if current_uid_matches else None
        status_value = _student_account_status(learner_data)
        if is_new_student_id:
            transaction.set(counter_ref, {"lastSequence": sequence})
        if student_id_snapshot.exists:
            transaction.update(
                student_id_ref,
                {
                    "studentUid": student_uid,
                    "authEmail": stored_email or mapping_data.get("authEmail"),
                    "status": status_value,
                },
            )
        else:
            transaction.set(
                student_id_ref,
                {
                    "studentId": student_id,
                    "parentId": parent_id,
                    "learnerId": learner_id,
                    "studentUid": student_uid,
                    "authEmail": stored_email,
                    "status": status_value,
                    "createdAt": datetime.now(timezone.utc),
                },
            )
        if student_uid and student_account_ref is not None:
            account_updates = {"studentId": student_id}
            if student_account_snapshot and student_account_snapshot.exists:
                transaction.update(student_account_ref, account_updates)
            else:
                transaction.set(
                    student_account_ref,
                    {
                        "uid": student_uid,
                        "role": "student",
                        "studentId": student_id,
                        "parentId": parent_id,
                        "learnerId": learner_id,
                        "createdAt": datetime.now(timezone.utc),
                    },
                )
        if invitation_ref is not None and invitation_snapshot is not None and invitation_snapshot.exists:
            transaction.update(invitation_ref, {"studentId": student_id})
        if learner_data.get("studentId") != student_id:
            transaction.update(learner_ref, {"studentId": student_id})

        learner_data["studentId"] = student_id
        return student_id, learner_data

    try:
        return assign_student_id(database.transaction())
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student ID assignment failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student profile service is temporarily unavailable.",
        ) from None

def _set_student_auth_disabled(uid: str, disabled: bool, admin_app: firebase_admin.App) -> None:
    try:
        firebase_auth.update_user(uid, disabled=disabled, app=admin_app)
    except firebase_auth.UserNotFoundError:
        if not disabled:
            raise


def _set_student_username(
    database: Any,
    uid: str,
    account: dict[str, Any],
    learner: dict[str, Any],
    username: str,
) -> str:
    parent_id = account.get("parentId")
    learner_id = account.get("learnerId")
    student_id = learner.get("studentId")
    if not all(isinstance(value, str) and value for value in (parent_id, learner_id, student_id)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student account mapping is inconsistent.")

    account_ref = database.collection("studentAccounts").document(uid)
    student_id_ref = database.collection("studentIds").document(student_id)
    username_ref = _student_username_ref(database, username)

    @cloud_firestore.transactional
    def save_username(transaction: Any) -> None:
        account_snapshot = _transaction_read(transaction, account_ref)
        student_id_snapshot = _transaction_read(transaction, student_id_ref)
        username_snapshot = _transaction_read(transaction, username_ref)
        account_data = account_snapshot.to_dict() or {}
        student_id_data = student_id_snapshot.to_dict() or {}
        username_data = username_snapshot.to_dict() or {}

        if (
            not account_snapshot.exists
            or account_data.get("uid") != uid
            or account_data.get("role") != "student"
            or account_data.get("parentId") != parent_id
            or account_data.get("learnerId") != learner_id
            or not student_id_snapshot.exists
            or student_id_data.get("studentUid") != uid
            or student_id_data.get("parentId") != parent_id
            or student_id_data.get("learnerId") != learner_id
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student account mapping is inconsistent.")

        current_username = account_data.get("username")
        if current_username:
            if current_username == username:
                return
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A username is already set for this account.")
        if username_snapshot.exists and (
            username_data.get("studentUid") != uid
            or username_data.get("studentId") != student_id
        ):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken.")

        transaction.set(
            username_ref,
            {
                "username": username,
                "studentId": student_id,
                "studentUid": uid,
                "parentId": parent_id,
                "learnerId": learner_id,
                "status": "active",
                "createdAt": datetime.now(timezone.utc),
            },
        )
        transaction.update(account_ref, {"username": username})
        transaction.update(student_id_ref, {"username": username})

    try:
        save_username(database.transaction())
        return username
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Student username assignment failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student username service is temporarily unavailable.",
        ) from None


def _firebase_password_sign_in(email: str, password: str) -> dict[str, Any]:
    if not firebase_web_api_key:
        logger.error("Firebase Web API key is not configured for student login.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student sign-in is not configured.",
        )

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?{urlencode({'key': firebase_web_api_key})}"
    request = URLRequest(
        url,
        data=json.dumps(
            {"email": email, "password": password, "returnSecureToken": True}
        ).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read())
    except HTTPError as error:
        try:
            error_body = json.loads(error.read())
        except (json.JSONDecodeError, UnicodeDecodeError):
            error_body = {}
        error_code = (
            error_body.get("error", {}).get("message")
            if isinstance(error_body, dict)
            else None
        )
        if error_code in {
            "EMAIL_NOT_FOUND",
            "INVALID_PASSWORD",
            "INVALID_LOGIN_CREDENTIALS",
            "USER_DISABLED",
        }:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student ID or password is incorrect.",
            ) from None
        logger.error("Firebase student sign-in failed with code %s.", error_code or error.code)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student sign-in is temporarily unavailable.",
        ) from None
    except (URLError, TimeoutError, OSError):
        logger.exception("Firebase student sign-in request failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student sign-in is temporarily unavailable.",
        ) from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.exception("Firebase student sign-in returned invalid JSON.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Student sign-in returned an invalid response.",
        ) from None

    if not isinstance(result, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Student sign-in returned an invalid response.",
        )
    return result

def learner_data_name(learner: dict[str, Any]) -> str:
    return learner.get("preferredName") or learner.get("firstName", "Student")
