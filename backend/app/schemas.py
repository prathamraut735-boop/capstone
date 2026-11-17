import re
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, Field, field_validator


def _normalize_student_username(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    username = value.strip().lower()
    if re.fullmatch(r"tc[0-9]{7,}", username):
        raise ValueError("A username cannot use the Student ID format.")
    return username


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
    studentId: str
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
    studentId: str
    expiresAt: AwareDatetime

class StudentLoginRequest(BaseModel):
    studentId: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("studentId", mode="before")
    @classmethod
    def normalize_student_id(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        identifier = value.strip()
        if re.fullmatch(r"TC[0-9]{7,}", identifier, re.IGNORECASE):
            return identifier.upper()
        return identifier.lower()

class StudentLoginResponse(BaseModel):
    customToken: str
    studentId: str

class StudentPasswordResetResponse(BaseModel):
    studentId: str
    temporaryPassword: str

class StudentActivation(BaseModel):
    code: str = Field(min_length=30, max_length=100)
    username: str = Field(min_length=3, max_length=20, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: Any) -> Any:
        return _normalize_student_username(value)


class StudentUsernameUpdate(BaseModel):
    username: str = Field(min_length=3, max_length=20, pattern=r"^[A-Za-z0-9_]+$")

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: Any) -> Any:
        return _normalize_student_username(value)


class StudentUsernameResponse(BaseModel):
    username: str


class StudentProfile(BaseModel):
    uid: str
    role: Literal["student"] = "student"
    studentId: str
    username: str | None = None
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
