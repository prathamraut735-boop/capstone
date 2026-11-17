from typing import Any

from fastapi import APIRouter, Depends, Request

from app.dependencies import get_authenticated_user, get_user_profile
from app.schemas import UserProfile
from app.services.learners import _optional_string

router = APIRouter()


@router.get("/api/v1/users/me", response_model=UserProfile)
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
