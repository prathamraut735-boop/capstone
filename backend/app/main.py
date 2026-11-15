import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import firebase_admin
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger("toy_choir_api")
firebase_bearer = HTTPBearer(auto_error=False)
firebase_app_name = "toy-choir-api"
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "capstone-af3eb")
environment = os.getenv("ENVIRONMENT", "development").lower()


def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("FRONTEND_ORIGINS")
    if not configured_origins:
        if environment == "production":
            raise RuntimeError("FRONTEND_ORIGINS must be configured in production.")
        return ["http://localhost:5173"]

    origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    if not origins or "*" in origins:
        raise RuntimeError("FRONTEND_ORIGINS must contain explicit frontend origins.")
    return origins


allowed_origins = get_allowed_origins()


class UserProfile(BaseModel):
    uid: str
    email: str | None = None
    displayName: str | None = None
    role: str | None = None


def initialize_firebase() -> tuple[firebase_admin.App, Any]:
    try:
        admin_app = firebase_admin.get_app(firebase_app_name)
    except ValueError:
        credential_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credential_path:
            path = Path(credential_path).expanduser()
            if not path.is_absolute():
                path = (BACKEND_DIR / path).resolve()
            if not path.is_file():
                raise RuntimeError(
                    "GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist."
                )
            credential = credentials.Certificate(str(path))
        else:
            credential = credentials.ApplicationDefault()

        admin_app = firebase_admin.initialize_app(
            credential,
            options={"projectId": firebase_project_id},
            name=firebase_app_name,
        )

    return admin_app, firestore.client(app=admin_app)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.firebase_admin_app, app.state.firestore_client = initialize_firebase()
    yield


app = FastAPI(title="Toy Choir TV API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)


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


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/users/me", response_model=UserProfile)
def get_my_profile(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_user),
) -> UserProfile:
    uid = current_user["uid"]

    try:
        snapshot = (
            request.app.state.firestore_client
            .collection("users")
            .document(uid)
            .get()
        )
        profile_exists = snapshot.exists
        profile = {}
        if profile_exists:
            profile = snapshot.to_dict() or {}
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

    if not profile_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile exists for the authenticated user.",
        )

    return UserProfile(
        uid=uid,
        email=_optional_string(profile.get("email")) or _optional_string(current_user.get("email")),
        displayName=_optional_string(profile.get("displayName")),
        role=_optional_string(profile.get("role")),
    )


def _optional_string(value: object) -> str | None:
    return value if isinstance(value, str) else None
