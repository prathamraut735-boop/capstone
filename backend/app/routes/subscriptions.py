import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from firebase_admin.exceptions import FirebaseError
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import firestore as cloud_firestore

from app.dependencies import get_authenticated_parent
from app.schemas import SubscriptionPlanChange
from app.services.students import _transaction_read
from app.services.subscriptions import (
    PLAN_DEFINITIONS,
    effective_plan_id,
    get_plan,
    subscription_overview,
)

logger = logging.getLogger("toy_choir_api")
router = APIRouter()


def _read_subscription(database: Any, parent_id: str) -> dict[str, Any] | None:
    snapshot = database.collection("subscriptions").document(parent_id).get()
    return snapshot.to_dict() if snapshot.exists else None


def _subscription_response(database: Any, parent_id: str) -> dict[str, Any]:
    try:
        subscription = _read_subscription(database, parent_id)
        return {
            "plans": list(PLAN_DEFINITIONS.values()),
            "subscription": subscription_overview(database, parent_id, subscription),
        }
    except ValueError:
        logger.exception("Stored subscription data is invalid.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Subscription data is temporarily unavailable.",
        ) from None


@router.get("/api/v1/users/me/subscription")
def get_my_subscription(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> dict[str, Any]:
    try:
        return _subscription_response(request.app.state.firestore_client, current_user["uid"])
    except HTTPException:
        raise
    except GoogleAPICallError:
        logger.exception("Subscription lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Subscription service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected subscription lookup failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the subscription.",
        ) from None


@router.put("/api/v1/users/me/subscription")
def change_my_subscription(
    change: SubscriptionPlanChange,
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> dict[str, Any]:
    database = request.app.state.firestore_client
    parent_id = current_user["uid"]
    subscription_ref = database.collection("subscriptions").document(parent_id)
    plan = get_plan(change.planId)

    @cloud_firestore.transactional
    def save_plan(transaction: Any) -> None:
        snapshot = _transaction_read(transaction, subscription_ref)
        current = snapshot.to_dict() if snapshot.exists else None
        if current and current.get("status") == "active" and current.get("planId") == change.planId:
            return
        if current:
            effective_plan_id(current)

        data: dict[str, Any] = {
            "parentId": parent_id,
            "planId": change.planId,
            "status": "active",
            "priceCents": plan["priceCents"],
            "currency": plan["currency"],
            "billingCycle": "monthly",
            "planLimits": {
                "maxLearners": plan["maxLearners"],
                "maxLearningLevel": plan["maxLearningLevel"],
                "practiceSubmissionsPerMonth": plan["practiceSubmissionsPerMonth"],
            },
            "startedAt": cloud_firestore.SERVER_TIMESTAMP,
            "cancelledAt": None,
            "updatedAt": cloud_firestore.SERVER_TIMESTAMP,
        }
        if not current:
            data["createdAt"] = cloud_firestore.SERVER_TIMESTAMP
        transaction.set(subscription_ref, data)

    try:
        save_plan(database.transaction())
        return _subscription_response(database, parent_id)
    except HTTPException:
        raise
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Subscription plan change failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Subscription service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected subscription plan change failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to change the subscription plan.",
        ) from None


@router.post("/api/v1/users/me/subscription/cancel")
def cancel_my_subscription(
    request: Request,
    current_user: dict[str, Any] = Depends(get_authenticated_parent),
) -> dict[str, Any]:
    database = request.app.state.firestore_client
    parent_id = current_user["uid"]
    subscription_ref = database.collection("subscriptions").document(parent_id)

    @cloud_firestore.transactional
    def cancel_plan(transaction: Any) -> None:
        snapshot = _transaction_read(transaction, subscription_ref)
        if not snapshot.exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The Free Plan has no subscription to cancel.",
            )
        current = snapshot.to_dict() or {}
        effective_plan_id(current)
        if current.get("status") == "cancelled":
            return
        if current.get("planId") == "free":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The Free Plan has no subscription to cancel.",
            )
        transaction.update(
            subscription_ref,
            {
                "status": "cancelled",
                "cancelledAt": cloud_firestore.SERVER_TIMESTAMP,
                "updatedAt": cloud_firestore.SERVER_TIMESTAMP,
            },
        )

    try:
        cancel_plan(database.transaction())
        return _subscription_response(database, parent_id)
    except HTTPException:
        raise
    except (GoogleAPICallError, FirebaseError):
        logger.exception("Subscription cancellation failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Subscription service is temporarily unavailable.",
        ) from None
    except Exception:
        logger.exception("Unexpected subscription cancellation failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to cancel the subscription.",
        ) from None
