from datetime import datetime, timezone
from typing import Any

from app.services.lessons import PUBLISHED_LEARNING_LEVEL_IDS


PLAN_DEFINITIONS: dict[str, dict[str, Any]] = {
    "free": {
        "id": "free",
        "name": "Free",
        "priceCents": 0,
        "currency": "GBP",
        "billingCycle": "monthly",
        "maxLearners": 1,
        "maxLearningLevel": 1,
        "practiceSubmissionsPerMonth": 3,
        "features": [
            "Introductory lessons (Level 1)",
            "3 practice submissions per UTC month",
            "Basic progress tracking",
        ],
    },
    "standard": {
        "id": "standard",
        "name": "Standard",
        "priceCents": 999,
        "currency": "GBP",
        "billingCycle": "monthly",
        "maxLearners": 2,
        "maxLearningLevel": 2,
        "practiceSubmissionsPerMonth": 10,
        "features": [
            "Levels 1–2 when published",
            "10 practice submissions per UTC month",
            "Full progress tracking",
            "Teacher feedback and revision support",
        ],
    },
    "premium": {
        "id": "premium",
        "name": "Premium",
        "priceCents": 1999,
        "currency": "GBP",
        "billingCycle": "monthly",
        "maxLearners": 4,
        "maxLearningLevel": 4,
        "practiceSubmissionsPerMonth": 25,
        "features": [
            "All published learning levels",
            "25 practice submissions per UTC month",
            "Complete progress tracking",
            "Additional learning resources",
        ],
    },
}

def get_plan(plan_id: str) -> dict[str, Any]:
    plan = PLAN_DEFINITIONS.get(plan_id)
    if plan is None:
        raise ValueError("The stored subscription references an unknown plan.")
    return plan


def effective_plan_id(subscription: dict[str, Any] | None) -> str:
    if not subscription:
        return "free"
    subscription_status = subscription.get("status")
    if subscription_status == "cancelled":
        return "free"
    if subscription_status != "active":
        raise ValueError("The stored subscription has an invalid status.")
    plan_id = subscription.get("planId")
    if not isinstance(plan_id, str):
        raise ValueError("The stored subscription has an invalid plan.")
    get_plan(plan_id)
    return plan_id


def current_month_key(now: datetime | None = None) -> str:
    current_time = now or datetime.now(timezone.utc)
    return current_time.astimezone(timezone.utc).strftime("%Y-%m")


def subscription_overview(
    database: Any,
    parent_id: str,
    subscription: dict[str, Any] | None,
) -> dict[str, Any]:
    stored_plan_id = (subscription or {}).get("planId", "free")
    stored_plan = get_plan(stored_plan_id)
    subscription_status = (subscription or {}).get("status", "active")
    effective_id = effective_plan_id(subscription)
    effective_plan = get_plan(effective_id)

    children = database.collection("users").document(parent_id).collection("children")
    active_learner_count = sum(
        1
        for child in children.stream()
        if (child.to_dict() or {}).get("status", "active") == "active"
    )
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

    return {
        "parentId": parent_id,
        "isPersisted": subscription is not None,
        "planId": stored_plan_id,
        "effectivePlanId": effective_id,
        "status": subscription_status,
        "priceCents": (subscription or {}).get("priceCents", stored_plan["priceCents"]),
        "currency": (subscription or {}).get("currency", stored_plan["currency"]),
        "billingCycle": (subscription or {}).get("billingCycle", "monthly"),
        "startedAt": _timestamp_string((subscription or {}).get("startedAt")),
        "cancelledAt": _timestamp_string((subscription or {}).get("cancelledAt")),
        "updatedAt": _timestamp_string((subscription or {}).get("updatedAt")),
        "planLimits": (subscription or {}).get("planLimits", _plan_limits(stored_plan)),
        "limits": _plan_limits(effective_plan),
        "activeLearnerCount": active_learner_count,
        "practiceSubmissionsUsed": submissions_used,
        "practiceSubmissionsRemaining": max(
            0, effective_plan["practiceSubmissionsPerMonth"] - submissions_used
        ),
    }


def _plan_limits(plan: dict[str, Any]) -> dict[str, int]:
    return {
        "maxLearners": plan["maxLearners"],
        "maxLearningLevel": plan["maxLearningLevel"],
        "practiceSubmissionsPerMonth": plan["practiceSubmissionsPerMonth"],
    }


def _timestamp_string(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, datetime):
        raise ValueError("The stored subscription has an invalid timestamp.")
    return value.isoformat()
