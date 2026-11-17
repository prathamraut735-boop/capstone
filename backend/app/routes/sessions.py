import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import firestore as cloud_firestore

from app.dependencies import get_authenticated_admin, get_authenticated_parent
from app.schemas import Booking, BookingCreate, Session, SessionCreate
from app.services.students import _transaction_read

logger = logging.getLogger("toy_choir_api")
router = APIRouter()


@router.get("/api/v1/sessions", response_model=list[Session])
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

@router.post(
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

@router.post(
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
        session_snapshot = _transaction_read(transaction, session_ref)
        learner_snapshot = _transaction_read(transaction, learner_ref)
        if not session_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        if not learner_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")

        session_data = session_snapshot.to_dict() or {}
        learner_data = learner_snapshot.to_dict() or {}
        if session_data.get("status") != "published":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        if learner_data.get("status", "active") != "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only active learner profiles can be booked.",
            )
        if session_data.get("startAt") <= created_at:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session has already started.")
        available_seats = session_data.get("availableSeats", 0)
        if available_seats <= 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session is fully booked.")
        learner_name = (
            learner_data.get("preferredName")
            or learner_data.get("nickname")
            or learner_data.get("firstName")
        )
        if not isinstance(learner_name, str) or not learner_name.strip():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The learner profile does not have a name for the booking.",
            )

        booking_data = {
            "sessionId": booking.sessionId,
            "sessionTitle": session_data["title"],
            "venue": session_data["venue"],
            "startAt": session_data["startAt"],
            "endAt": session_data["endAt"],
            "learnerId": booking.learnerId,
            "learnerNickname": learner_name.strip(),
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

@router.get("/api/v1/users/me/bookings", response_model=list[Booking])
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

@router.delete(
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
        booking_snapshot = _transaction_read(transaction, booking_ref)
        if not booking_snapshot.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        booking_data = booking_snapshot.to_dict() or {}
        if booking_data.get("status") == "cancelled":
            return {"id": booking_id, **booking_data}

        session_ref = database.collection("sessions").document(booking_data["sessionId"])
        session_snapshot = _transaction_read(transaction, session_ref)
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
