import logging
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError

from app.services.students import _ensure_student_id

logger = logging.getLogger("toy_choir_api")
firebase_bearer = HTTPBearer(auto_error=False)


def get_authenticated_user(
    request: Request,
    credentials_header: HTTPAuthorizationCredentials | None = Depends(firebase_bearer),
) -> dict[str, Any]:
    if credentials_header is None or credentials_header.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Firebase ID token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = firebase_auth.verify_id_token(
            credentials_header.credentials,
            app=request.app.state.firebase_admin_app,
            check_revoked=True,
        )
    except (
        firebase_auth.InvalidIdTokenError,
        firebase_auth.UserDisabledError,
        firebase_auth.UserNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Firebase ID token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except (firebase_auth.CertificateFetchError, FirebaseError):
        logger.exception("Firebase ID-token verification service failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firebase ID-token verification failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the authentication token.",
        ) from None

    uid = claims.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Firebase ID token does not contain a valid user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims

def get_user_profile(request: Request, uid: str) -> dict[str, Any]:
    try:
        snapshot = request.app.state.firestore_client.collection("users").document(uid).get()
    except GoogleAPICallError:
        logger.exception("Firestore profile lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore profile lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the user profile.",
        ) from None

    if not snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile exists for the authenticated user.",
        )
    return snapshot.to_dict() or {}

def get_authenticated_parent(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_user),
) -> dict[str, Any]:
    try:
        student_account = (
            request.app.state.firestore_client.collection("studentAccounts")
            .document(current_user["uid"])
            .get()
        )
    except GoogleAPICallError:
        logger.exception("Account role lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected account role lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the account role.",
        ) from None
    if student_account.exists:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student accounts cannot access parent functions.")

    profile = get_user_profile(request, current_user["uid"])
    if profile.get("role") != "parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A parent account is required for this action.",
        )
    return current_user

def get_authenticated_admin(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_user),
) -> dict[str, Any]:
    profile = get_user_profile(request, current_user["uid"])
    if profile.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An administrator account is required for this action.",
        )
    return current_user

def get_authenticated_student(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_user),
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    try:
        account_snapshot = (
            request.app.state.firestore_client.collection("studentAccounts")
            .document(current_user["uid"])
            .get()
        )
    except GoogleAPICallError:
        logger.exception("Student account lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student account service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected student account lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the student account.",
        ) from None

    if not account_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not linked to a student profile.",
        )
    account = account_snapshot.to_dict() or {}
    if account.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A student account is required.")

    try:
        learner = (
            request.app.state.firestore_client.collection("users")
            .document(account["parentId"])
            .collection("children")
            .document(account["learnerId"])
            .get()
        )
    except GoogleAPICallError:
        logger.exception("Linked learner lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student profile service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected linked learner lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the student profile.",
        ) from None

    learner_data = learner.to_dict() or {}
    if not learner.exists or learner_data.get("studentUid") != current_user["uid"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This student profile is not available.")
    if not learner_data.get("studentId"):
        _, learner_data = _ensure_student_id(
            request.app.state.firestore_client,
            request.app.state.firebase_admin_app,
            account["parentId"],
            account["learnerId"],
        )
    if account.get("studentId") and learner_data.get("studentId") != account["studentId"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This student profile is not available.")
    if learner_data.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This student account is inactive.")
    return current_user, account, learner_data
