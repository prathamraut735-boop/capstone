from typing import Any

from app.schemas import Learner


def _learner_response(learner_id: str, data: dict[str, Any], parent_id: str) -> Learner:
    return Learner(
        id=learner_id,
        parentId=parent_id,
        firstName=data["firstName"],
        ageRange=data["ageRange"],
        studentId=data["studentId"],
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
        invitationExpiresAt=data.get("invitationExpiresAt"),
    )

def _optional_string(value: object) -> str | None:
    return value if isinstance(value, str) else None
