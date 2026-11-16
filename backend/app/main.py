import hashlib
import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

import firebase_admin
from google.cloud import firestore as cloud_firestore
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore, storage as firebase_storage
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError
from pydantic import AwareDatetime, BaseModel, Field, field_validator

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger("toy_choir_api")
firebase_bearer = HTTPBearer(auto_error=False)
firebase_app_name = "toy-choir-api"
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "capstone-af3eb")
firebase_storage_bucket = os.getenv(
    "FIREBASE_STORAGE_BUCKET",
    f"{firebase_project_id}.firebasestorage.app",
)
student_auth_email_domain = os.getenv(
    "STUDENT_AUTH_EMAIL_DOMAIN",
    f"students.{firebase_project_id}.firebaseapp.com",
)
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


class LearnerCreate(BaseModel):
    firstName: str = Field(min_length=1, max_length=60)
    ageRange: Literal["8-10", "11-13", "14-16"]
    preferredName: str | None = Field(default=None, max_length=40)
    musicalExperience: Literal["Beginner", "Some experience", "Experienced"] | None = None
    learningInterests: list[Literal["Singing", "Ukulele", "Songwriting"]] = Field(default_factory=list, max_length=3)

    @field_validator("firstName")
    @classmethod
    def normalize_first_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("A first name is required.")
        return name

    @field_validator("preferredName")
    @classmethod
    def normalize_preferred_name(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("learningInterests")
    @classmethod
    def unique_interests(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("Learning interests cannot contain duplicates.")
        return value


class Learner(BaseModel):
    id: str
    firstName: str
    ageRange: Literal["8-10", "11-13", "14-16"]
    preferredName: str | None = None
    musicalExperience: Literal["Beginner", "Some experience", "Experienced"] | None = None
    learningInterests: list[Literal["Singing", "Ukulele", "Songwriting"]] = Field(default_factory=list)
    profilePicturePath: str | None = None
    parentId: str
    createdAt: AwareDatetime
    learningLevel: str
    accountStatus: Literal["profile_only", "invitation_pending", "active", "deactivated"]
    accessStatus: Literal["not_created", "invitation_pending", "active", "deactivated"]
    assignedTeacher: str | None = None
    lessonProgress: dict[str, int]
    practiceSubmissionStatus: str
    teacherApprovalStatus: str
    studentUsername: str | None = None
    invitationExpiresAt: AwareDatetime | None = None


class LearnerUpdate(BaseModel):
    firstName: str | None = Field(default=None, min_length=1, max_length=60)
    ageRange: Literal["8-10", "11-13", "14-16"] | None = None
    preferredName: str | None = Field(default=None, max_length=40)
    musicalExperience: Literal["Beginner", "Some experience", "Experienced"] | None = None
    learningInterests: list[Literal["Singing", "Ukulele", "Songwriting"]] | None = Field(default=None, max_length=3)
    status: Literal["active", "deactivated"] | None = None

    @field_validator("firstName")
    @classmethod
    def normalize_first_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = value.strip()
        if not name:
            raise ValueError("A first name is required.")
        return name

    @field_validator("preferredName")
    @classmethod
    def normalize_preferred_name(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("learningInterests")
    @classmethod
    def unique_interests(cls, value: list[str] | None) -> list[str] | None:
        if value is not None and len(set(value)) != len(value):
            raise ValueError("Learning interests cannot contain duplicates.")
        return value


class StudentInvitation(BaseModel):
    code: str
    username: str
    expiresAt: AwareDatetime


class StudentActivation(BaseModel):
    code: str = Field(min_length=30, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class StudentProfile(BaseModel):
    uid: str
    role: Literal["student"] = "student"
    learnerId: str
    firstName: str
    preferredName: str | None = None
    ageRange: Literal["8-10", "11-13", "14-16"]
    learningLevel: str
    lessonProgress: dict[str, int]
    practiceSubmissionStatus: str
    teacherApprovalStatus: str


class SessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    venue: str = Field(min_length=1, max_length=160)
    startAt: AwareDatetime
    endAt: AwareDatetime
    capacity: int = Field(gt=0, le=500)
    priceCents: int = Field(ge=0, le=10_000_000)

    @field_validator("title", "venue")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("This field is required.")
        return text


class Session(BaseModel):
    id: str
    title: str
    venue: str
    startAt: AwareDatetime
    endAt: AwareDatetime
    capacity: int
    availableSeats: int
    priceCents: int
    currency: str


class BookingCreate(BaseModel):
    sessionId: str = Field(min_length=1, max_length=100)
    learnerId: str = Field(min_length=1, max_length=100)


class Booking(BaseModel):
    id: str
    sessionId: str
    sessionTitle: str
    venue: str
    startAt: AwareDatetime
    endAt: AwareDatetime
    learnerId: str
    learnerNickname: str
    status: str
    paymentStatus: str
    amountCents: int
    currency: str
    createdAt: AwareDatetime


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
            options={
                "projectId": firebase_project_id,
                "storageBucket": firebase_storage_bucket,
            },
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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
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
    if learner_data.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This student account is inactive.")
    return current_user, account, learner_data


def _learner_response(learner_id: str, data: dict[str, Any], parent_id: str) -> Learner:
    return Learner(
        id=learner_id,
        parentId=parent_id,
        firstName=data["firstName"],
        ageRange=data["ageRange"],
        preferredName=data.get("preferredName"),
        musicalExperience=data.get("musicalExperience"),
        learningInterests=data.get("learningInterests", []),
        profilePicturePath=data.get("profilePicturePath"),
        createdAt=data["createdAt"],
        learningLevel=data.get("learningLevel", "Level 1"),
        accountStatus=data.get("accountStatus", "profile_only"),
        accessStatus=data.get("accessStatus", "not_created"),
        assignedTeacher=data.get("assignedTeacher"),
        lessonProgress=data.get("lessonProgress", {"completed": 0, "total": 32}),
        practiceSubmissionStatus=data.get("practiceSubmissionStatus", "none"),
        teacherApprovalStatus=data.get("teacherApprovalStatus", "not_requested"),
        studentUsername=data.get("studentUsername"),
        invitationExpiresAt=data.get("invitationExpiresAt"),
    )


def _student_username() -> str:
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
    return "learner-" + "".join(secrets.choice(alphabet) for _ in range(8))


def _student_email(username: str) -> str:
    return f"{username}@{student_auth_email_domain}"


def _invitation_ref(database: Any, code: str) -> Any:
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return database.collection("studentInvitations").document(code_hash)


def _set_student_auth_disabled(uid: str, disabled: bool) -> None:
    try:
        firebase_auth.update_user(uid, disabled=disabled)
    except firebase_auth.UserNotFoundError:
        if not disabled:
            raise


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/users/me", response_model=UserProfile)
def get_my_profile(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_user),
) -> UserProfile:
    uid = current_user["uid"]
    profile = get_user_profile(request, uid)

    return UserProfile(
        uid=uid,
        email=_optional_string(profile.get("email")) or _optional_string(current_user.get("email")),
        displayName=_optional_string(profile.get("displayName")),
        role=_optional_string(profile.get("role")),
    )


@app.get("/api/v1/users/me/children", response_model=list[Learner])
def list_my_children(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> list[Learner]:
    database = request.app.state.firestore_client
    children = database.collection("users").document(current_user["uid"]).collection("children")
    try:
        learner_records = []
        for snapshot in children.stream():
            data = snapshot.to_dict() or {}
            invitation_expires_at = data.get("invitationExpiresAt")
            if invitation_expires_at and invitation_expires_at <= datetime.now(timezone.utc):
                data["accountStatus"] = "profile_only"
                data["accessStatus"] = "not_created"
                data.pop("invitationExpiresAt", None)
            learner_records.append(_learner_response(snapshot.id, data, current_user["uid"]))
        return learner_records
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


@app.post(
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
        "studentUsername": None,
    }
    learner_ref = (
        request.app.state.firestore_client
        .collection("users")
        .document(current_user["uid"])
        .collection("children")
        .document(learner_id)
    )
    try:
        learner_ref.set(learner_data)
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


@app.patch("/api/v1/users/me/children/{learner_id}", response_model=Learner)
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
        if updates.get("status") == "active":
            updates["accountStatus"] = "active" if current_data.get("studentUid") else "profile_only"
            updates["accessStatus"] = "active" if current_data.get("studentUid") else "not_created"
        if updates.get("status") == "deactivated":
            student_uid = current_data.get("studentUid") or current_data.get("pendingStudentUid")
            if student_uid:
                _set_student_auth_disabled(student_uid, disabled=True)
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
            _set_student_auth_disabled(current_data["studentUid"], disabled=False)
        updates["updatedAt"] = datetime.now(timezone.utc)
        learner_ref.update(updates)
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


@app.put("/api/v1/users/me/children/{learner_id}/profile-picture", response_model=Learner)
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
        learner_data = learner_snapshot.to_dict() or {}
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


@app.get("/api/v1/users/me/children/{learner_id}/profile-picture")
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


@app.delete("/api/v1/users/me/children/{learner_id}/profile-picture", status_code=status.HTTP_204_NO_CONTENT)
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


@app.post(
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
    code = secrets.token_urlsafe(32)
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    invitation_ref = database.collection("studentInvitations").document(code_hash)

    @cloud_firestore.transactional
    def create_invite(transaction: Any) -> tuple[str, str]:
        learner_snapshot = transaction.get(learner_ref)
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
        learner_data = learner_snapshot.to_dict() or {}
        if learner_data.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reactivate the learner before creating student access.")
        if learner_data.get("studentUid"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner already has student access.")

        username = learner_data.get("studentUsername") or _student_username()
        username_ref = database.collection("studentUsernames").document(username)
        username_snapshot = transaction.get(username_ref)
        if username_snapshot.exists:
            username_data = username_snapshot.to_dict() or {}
            if username_data.get("parentId") != current_user["uid"] or username_data.get("learnerId") != learner_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not allocate a student username. Please retry.")

        old_invitation_hash = learner_data.get("pendingInvitationHash")
        if old_invitation_hash:
            old_invitation_ref = database.collection("studentInvitations").document(old_invitation_hash)
            old_invitation = transaction.get(old_invitation_ref)
            if old_invitation.exists and (old_invitation.to_dict() or {}).get("status") in {"pending", "activating"}:
                transaction.update(old_invitation_ref, {"status": "revoked"})

        student_uid = learner_data.get("pendingStudentUid") or uuid4().hex
        invitation_data = {
            "parentId": current_user["uid"],
            "learnerId": learner_id,
            "studentUid": student_uid,
            "username": username,
            "status": "pending",
            "createdAt": datetime.now(timezone.utc),
            "expiresAt": expires_at,
        }
        transaction.set(
            username_ref,
            {
                "parentId": current_user["uid"],
                "learnerId": learner_id,
                "status": "reserved",
                "createdAt": datetime.now(timezone.utc),
            },
        )
        transaction.set(invitation_ref, invitation_data)
        transaction.update(
            learner_ref,
            {
                "studentUsername": username,
                "pendingStudentUid": student_uid,
                "pendingInvitationHash": code_hash,
                "invitationExpiresAt": expires_at,
                "accountStatus": "invitation_pending",
                "accessStatus": "invitation_pending",
            },
        )
        return username, student_uid

    try:
        username, _ = create_invite(database.transaction())
        return StudentInvitation(code=code, username=username, expiresAt=expires_at)
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


@app.post("/api/v1/student-invitations/activate")
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
        username = invitation_data["username"]
        learner_ref = database.collection("users").document(parent_id).collection("children").document(learner_id)

        @cloud_firestore.transactional
        def claim_invitation(transaction: Any) -> None:
            current_invitation = transaction.get(invitation_ref)
            current_learner = transaction.get(learner_ref)
            current_invitation_data = current_invitation.to_dict() or {}
            current_learner_data = current_learner.to_dict() or {}
            if (
                not current_invitation.exists
                or current_invitation_data.get("status") not in {"pending", "activating"}
                or current_invitation_data.get("expiresAt") <= now
                or current_learner_data.get("pendingInvitationHash") != invitation_ref.id
            ):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid or expired.")
            if current_invitation_data.get("status") == "activating":
                current_lease = current_invitation_data.get("activationLeaseUntil")
                if isinstance(current_lease, datetime) and current_lease > now:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation is already being activated.")
            if not current_learner.exists or current_learner_data.get("status") != "active":
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner profile is inactive.")
            if current_learner_data.get("studentUid"):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student access already exists.")
            transaction.update(
                invitation_ref,
                {"status": "activating", "activationLeaseUntil": now + timedelta(minutes=5)},
            )

        claim_invitation(database.transaction())
        email = _student_email(username)
        try:
            try:
                firebase_auth.create_user(
                    uid=student_uid,
                    email=email,
                    password=activation.password,
                    display_name=learner_data_name(learner_ref.get().to_dict() or {}),
                    email_verified=True,
                )
            except firebase_auth.UidAlreadyExistsError:
                existing_user = firebase_auth.get_user(student_uid)
                if existing_user.email != email:
                    raise
                firebase_auth.update_user(student_uid, password=activation.password, disabled=False)
        except FirebaseError:
            logger.exception("Firebase student account creation failed.")
            @cloud_firestore.transactional
            def release_claim(transaction: Any) -> None:
                current_invitation = transaction.get(invitation_ref)
                current_learner = transaction.get(learner_ref)
                current_invitation_data = current_invitation.to_dict() or {}
                current_learner_data = current_learner.to_dict() or {}
                if (
                    current_invitation_data.get("status") == "activating"
                    and current_learner_data.get("pendingInvitationHash") == invitation_ref.id
                ):
                    transaction.update(invitation_ref, {"status": "pending", "activationLeaseUntil": None})

            release_claim(database.transaction())
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create student credentials. Check the password and try again.") from None

        @cloud_firestore.transactional
        def complete_activation(transaction: Any) -> None:
            current_invitation = transaction.get(invitation_ref)
            current_learner = transaction.get(learner_ref)
            current_invitation_data = current_invitation.to_dict() or {}
            current_learner_data = current_learner.to_dict() or {}
            if (
                current_invitation_data.get("status") != "activating"
                or current_invitation_data.get("studentUid") != student_uid
                or not current_learner.exists
                or current_learner_data.get("status") != "active"
                or current_learner_data.get("pendingInvitationHash") != invitation_ref.id
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The invitation can no longer be activated.")

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
            transaction.set(
                database.collection("studentAccounts").document(student_uid),
                {
                    "uid": student_uid,
                    "role": "student",
                    "parentId": parent_id,
                    "learnerId": learner_id,
                    "username": username,
                    "createdAt": datetime.now(timezone.utc),
                },
            )
            transaction.update(
                database.collection("studentUsernames").document(username),
                {"status": "active", "studentUid": student_uid},
            )
            transaction.update(invitation_ref, {"status": "used", "usedAt": datetime.now(timezone.utc)})

        try:
            complete_activation(database.transaction())
        except HTTPException:
            account_snapshot = database.collection("studentAccounts").document(student_uid).get()
            if not account_snapshot.exists:
                try:
                    firebase_auth.update_user(student_uid, disabled=True)
                except FirebaseError:
                    logger.exception("Unable to disable an unlinked student account after invitation revocation.")
            raise
        return {"uid": student_uid, "username": username}
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


def learner_data_name(learner: dict[str, Any]) -> str:
    return learner.get("preferredName") or learner.get("firstName", "Student")


@app.get("/api/v1/students/me", response_model=StudentProfile)
def get_my_student_profile(
    authenticated: tuple[dict[str, Any], dict[str, Any], dict[str, Any]] = Depends(get_authenticated_student),
) -> StudentProfile:
    user, account, learner = authenticated
    return StudentProfile(
        uid=user["uid"],
        learnerId=account["learnerId"],
        firstName=learner["firstName"],
        preferredName=learner.get("preferredName"),
        ageRange=learner["ageRange"],
        learningLevel=learner.get("learningLevel", "Level 1"),
        lessonProgress=learner.get("lessonProgress", {"completed": 0, "total": 32}),
        practiceSubmissionStatus=learner.get("practiceSubmissionStatus", "none"),
        teacherApprovalStatus=learner.get("teacherApprovalStatus", "not_requested"),
    )


@app.get("/api/v1/sessions", response_model=list[Session])
def list_available_sessions(
    request: Request,
    _: dict[str, Any] = Depends(get_authenticated_parent),
) -> list[Session]:
    try:
        snapshots = request.app.state.firestore_client.collection("sessions").stream()
        now = datetime.now(timezone.utc)
        sessions = []
        for snapshot in snapshots:
            data = snapshot.to_dict() or {}
            start_at = data.get("startAt")
            if (
                data.get("status") == "published"
                and isinstance(start_at, datetime)
                and start_at > now
                and data.get("availableSeats", 0) > 0
            ):
                sessions.append(Session(id=snapshot.id, **data))
        return sorted(sessions, key=lambda session: session.startAt)
    except GoogleAPICallError:
        logger.exception("Firestore session lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Session availability is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore session lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve session availability.",
        ) from None


@app.post(
    "/api/v1/admin/sessions",
    response_model=Session,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    session: SessionCreate,
    request: Request,
    _: dict[str, Any] = Depends(get_authenticated_admin),
) -> Session:
    now = datetime.now(timezone.utc)
    if session.startAt <= now or session.endAt <= session.startAt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Session times must be in the future and end after they start.",
        )

    session_id = uuid4().hex
    session_data = {
        "title": session.title,
        "venue": session.venue,
        "startAt": session.startAt,
        "endAt": session.endAt,
        "capacity": session.capacity,
        "availableSeats": session.capacity,
        "priceCents": session.priceCents,
        "currency": "AUD",
        "status": "published",
        "createdAt": now,
    }
    session_ref = request.app.state.firestore_client.collection("sessions").document(session_id)
    try:
        session_ref.set(session_data)
    except GoogleAPICallError:
        logger.exception("Firestore session creation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Session service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore session creation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the session.",
        ) from None
    return Session(id=session_id, **session_data)


@app.post(
    "/api/v1/users/me/bookings",
    response_model=Booking,
    status_code=status.HTTP_201_CREATED,
)
def create_my_booking(
    booking: BookingCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Booking:
    database = request.app.state.firestore_client
    parent_ref = database.collection("users").document(current_user["uid"])
    learner_ref = parent_ref.collection("children").document(booking.learnerId)
    session_ref = database.collection("sessions").document(booking.sessionId)
    booking_id = uuid4().hex
    booking_ref = parent_ref.collection("bookings").document(booking_id)
    created_at = datetime.now(timezone.utc)

    def reserve_slot(transaction: Any) -> dict[str, Any]:
        session_snapshot = transaction.get(session_ref)
        learner_snapshot = transaction.get(learner_ref)
        if not session_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")

        session_data = session_snapshot.to_dict() or {}
        learner_data = learner_snapshot.to_dict() or {}
        if session_data.get("status") != "published":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        if session_data.get("startAt") <= created_at:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session has already started.")
        available_seats = session_data.get("availableSeats", 0)
        if available_seats <= 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session is fully booked.")

        booking_data = {
            "sessionId": booking.sessionId,
            "sessionTitle": session_data["title"],
            "venue": session_data["venue"],
            "startAt": session_data["startAt"],
            "endAt": session_data["endAt"],
            "learnerId": booking.learnerId,
            "learnerNickname": learner_data["nickname"],
            "status": "confirmed",
            "paymentStatus": "simulated",
            "amountCents": session_data["priceCents"],
            "currency": session_data["currency"],
            "createdAt": created_at,
        }
        transaction.update(session_ref, {"availableSeats": available_seats - 1})
        transaction.update(learner_ref, {"lastBookingAt": created_at})
        transaction.set(booking_ref, booking_data)
        return {"id": booking_id, **booking_data}

    try:
        result = cloud_firestore.transactional(reserve_slot)(database.transaction())
        return Booking(**result)
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Firestore booking transaction failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Booking service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore booking transaction failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the booking.",
        ) from None


@app.get("/api/v1/users/me/bookings", response_model=list[Booking])
def list_my_bookings(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> list[Booking]:
    bookings = (
        request.app.state.firestore_client
        .collection("users")
        .document(current_user["uid"])
        .collection("bookings")
    )
    try:
        records = [Booking(id=snapshot.id, **(snapshot.to_dict() or {})) for snapshot in bookings.stream()]
        return sorted(records, key=lambda booking: booking.startAt)
    except GoogleAPICallError:
        logger.exception("Firestore booking lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Booking history is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore booking lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve booking history.",
        ) from None


@app.delete(
    "/api/v1/users/me/bookings/{booking_id}",
    response_model=Booking,
)
def cancel_my_booking(
    booking_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> Booking:
    database = request.app.state.firestore_client
    parent_ref = database.collection("users").document(current_user["uid"])
    booking_ref = parent_ref.collection("bookings").document(booking_id)
    now = datetime.now(timezone.utc)

    def release_slot(transaction: Any) -> dict[str, Any]:
        booking_snapshot = transaction.get(booking_ref)
        if not booking_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        booking_data = booking_snapshot.to_dict() or {}
        if booking_data.get("status") == "cancelled":
            return {"id": booking_id, **booking_data}

        session_ref = database.collection("sessions").document(booking_data["sessionId"])
        session_snapshot = transaction.get(session_ref)
        if not session_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The session is no longer available.")
        session_data = session_snapshot.to_dict() or {}
        if booking_data["startAt"] <= now:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Started bookings cannot be cancelled.")

        booking_data["status"] = "cancelled"
        transaction.update(booking_ref, {"status": "cancelled", "updatedAt": now})
        transaction.update(
            session_ref,
            {"availableSeats": min(session_data["capacity"], session_data["availableSeats"] + 1)},
        )
        return {"id": booking_id, **booking_data}

    try:
        result = cloud_firestore.transactional(release_slot)(database.transaction())
        return Booking(**result)
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Firestore booking cancellation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Booking service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected Firestore booking cancellation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to cancel the booking.",
        ) from None


def _optional_string(value: object) -> str | None:
    return value if isinstance(value, str) else None
