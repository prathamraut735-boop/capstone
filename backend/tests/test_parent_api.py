from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any

import pytest
from firebase_admin import auth as firebase_auth
from google.cloud import firestore as cloud_firestore
from fastapi.testclient import TestClient

from app import main
from app.schemas import SessionCreate
from app.services.students import _invitation_ref, _student_email


class MemorySnapshot:
    def __init__(self, path: tuple[str, ...], data: dict[str, Any] | None):
        self.id = path[-1]
        self.exists = data is not None
        self._data = data or {}

    def to_dict(self) -> dict[str, Any]:
        return self._data.copy()


class MemoryDocument:
    def __init__(self, database: "MemoryFirestore", path: tuple[str, ...]):
        self.database = database
        self.path = path

    def get(self) -> MemorySnapshot:
        return MemorySnapshot(self.path, self.database.documents.get(self.path))

    def set(self, data: dict[str, Any]) -> None:
        self.database.documents[self.path] = {
            key: datetime.now(timezone.utc) if value is cloud_firestore.SERVER_TIMESTAMP else value
            for key, value in data.items()
        }

    def update(self, data: dict[str, Any]) -> None:
        self.database.documents[self.path].update({
            key: datetime.now(timezone.utc) if value is cloud_firestore.SERVER_TIMESTAMP else value
            for key, value in data.items()
        })

    def delete(self) -> None:
        self.database.documents.pop(self.path, None)

    def collection(self, name: str) -> "MemoryCollection":
        return MemoryCollection(self.database, (*self.path, name))


class MemoryCollection:
    def __init__(self, database: "MemoryFirestore", path: tuple[str, ...]):
        self.database = database
        self.path = path

    def document(self, document_id: str) -> MemoryDocument:
        return MemoryDocument(self.database, (*self.path, document_id))

    def stream(self) -> list[MemorySnapshot]:
        return [
            MemorySnapshot(path, data)
            for path, data in self.database.documents.items()
            if len(path) == len(self.path) + 1 and path[:-1] == self.path
        ]


class MemoryTransaction:
    def get(self, reference: MemoryDocument | MemoryCollection) -> list[MemorySnapshot]:
        return reference.stream() if isinstance(reference, MemoryCollection) else [reference.get()]

    def set(self, document: MemoryDocument, data: dict[str, Any]) -> None:
        document.set(data)

    def update(self, document: MemoryDocument, data: dict[str, Any]) -> None:
        document.update(data)

    def delete(self, document: MemoryDocument) -> None:
        document.delete()


class MemoryFirestore:
    def __init__(self):
        self.documents: dict[tuple[str, ...], dict[str, Any]] = {}

    def collection(self, name: str) -> MemoryCollection:
        return MemoryCollection(self, (name,))

    def transaction(self) -> MemoryTransaction:
        return MemoryTransaction()


@pytest.fixture
def parent_client(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]]]:
    database = MemoryFirestore()
    database.collection("users").document("user-123").set(
        {"email": "parent@example.com", "displayName": "Parent", "role": "parent"}
    )
    firebase_users: dict[str, dict[str, Any]] = {}
    monkeypatch.setattr(main, "initialize_firebase", lambda: (object(), database))
    monkeypatch.setattr(
        firebase_auth,
        "verify_id_token",
        lambda token, app, check_revoked: {
            "uid": "student-uid" if token == "student-token" else "user-123",
            "email": "student@example.invalid" if token == "student-token" else "parent@example.com",
        },
    )
    monkeypatch.setattr(
        firebase_auth,
        "create_user",
        lambda uid, email, password, display_name, email_verified: firebase_users.setdefault(
            uid,
            {
                "uid": uid,
                "email": email,
                "password": password,
                "display_name": display_name,
                "email_verified": email_verified,
                "disabled": False,
            },
        ),
    )
    monkeypatch.setattr(
        firebase_auth,
        "get_user",
        lambda uid: type("FirebaseUser", (), {"email": firebase_users[uid]["email"]})(),
    )
    monkeypatch.setattr(
        firebase_auth,
        "update_user",
        lambda uid, **changes: firebase_users[uid].update(changes),
    )
    monkeypatch.setattr(
        cloud_firestore,
        "transactional",
        lambda function: lambda transaction: function(transaction),
    )
    with TestClient(main.app) as client:
        yield client, database, firebase_users


def create_learner(client: TestClient, headers: dict[str, str], first_name: str = "Sunny") -> dict[str, Any]:
    response = client.post(
        "/api/v1/users/me/children",
        headers=headers,
        json={
            "firstName": first_name,
            "ageRange": "8-10",
            "preferredName": "Sun",
            "musicalExperience": "Beginner",
            "learningInterests": ["Singing", "Ukulele"],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_parent_can_create_list_edit_and_deactivate_multiple_learners(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, firebase_users = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    assert client.put(
        "/api/v1/users/me/subscription",
        headers=headers,
        json={"planId": "standard"},
    ).status_code == 200
    first = create_learner(client, headers)
    second = create_learner(client, headers, "River")
    over_limit = client.post(
        "/api/v1/users/me/children",
        headers=headers,
        json={"firstName": "Meadow", "ageRange": "8-10"},
    )
    assert over_limit.status_code == 409
    assert first["parentId"] == second["parentId"] == "user-123"
    assert first["ageRange"] == "8-10"
    assert first["learningLevel"] == "Level 1"
    assert first["accountStatus"] == "profile_only"
    assert first["lessonProgress"] == {"completed": 0, "total": 32}

    listing = client.get("/api/v1/users/me/children", headers=headers)
    assert listing.status_code == 200
    assert {item["id"] for item in listing.json()} == {first["id"], second["id"]}

    update = client.patch(
        f"/api/v1/users/me/children/{first['id']}",
        headers=headers,
        json={"firstName": "Sunny", "ageRange": "11-13", "preferredName": "Sunny"},
    )
    assert update.status_code == 200
    assert update.json()["ageRange"] == "11-13"

    invitation = client.post(
        f"/api/v1/users/me/children/{first['id']}/student-invitations",
        headers=headers,
    )
    assert invitation.status_code == 201
    student_uid = database.collection("users").document("user-123").collection("children").document(first["id"]).get().to_dict()["pendingStudentUid"]
    firebase_users[student_uid] = {"uid": student_uid, "email": _student_email(invitation.json()["username"]), "disabled": False}

    deactivation = client.patch(
        f"/api/v1/users/me/children/{first['id']}",
        headers=headers,
        json={"status": "deactivated"},
    )
    assert deactivation.status_code == 200
    assert deactivation.json()["accountStatus"] == "deactivated"
    assert firebase_users[student_uid]["disabled"] is True


def test_cross_parent_learner_access_is_not_found(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    database.collection("users").document("other-parent").set({"role": "parent"})
    other_learner_ref = (
        database.collection("users")
        .document("other-parent")
        .collection("children")
        .document("private-child")
    )
    other_learner_ref.set({"firstName": "Private", "ageRange": "8-10"})

    response = client.patch(
        "/api/v1/users/me/children/private-child",
        headers=headers,
        json={"firstName": "Changed"},
    )
    assert response.status_code == 404
    assert other_learner_ref.get().to_dict()["firstName"] == "Private"


def test_invalid_child_information_is_rejected(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, _, _ = parent_client
    response = client.post(
        "/api/v1/users/me/children",
        headers={"Authorization": "Bearer valid-token"},
        json={"firstName": "  ", "ageRange": "7-9"},
    )
    assert response.status_code == 422


def test_free_plan_enforces_active_learner_limit(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, _, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    create_learner(client, headers)

    response = client.post(
        "/api/v1/users/me/children",
        headers=headers,
        json={"firstName": "River", "ageRange": "8-10"},
    )
    assert response.status_code == 409
    assert "Free Plan allows up to 1 active learner" in response.json()["detail"]


def test_standard_plan_allows_two_active_learners(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, _, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    assert client.put(
        "/api/v1/users/me/subscription",
        headers=headers,
        json={"planId": "standard"},
    ).status_code == 200
    create_learner(client, headers, "Sunny")
    create_learner(client, headers, "River")

    response = client.post(
        "/api/v1/users/me/children",
        headers=headers,
        json={"firstName": "Meadow", "ageRange": "8-10"},
    )
    assert response.status_code == 409
    assert "Standard Plan allows up to 2 active learner" in response.json()["detail"]


def test_parent_can_change_and_cancel_simulated_subscription(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    initial = client.get("/api/v1/users/me/subscription", headers=headers)
    assert initial.status_code == 200
    assert initial.json()["subscription"]["effectivePlanId"] == "free"
    assert initial.json()["subscription"]["isPersisted"] is False

    saved_free = client.put(
        "/api/v1/users/me/subscription",
        headers=headers,
        json={"planId": "free"},
    )
    assert saved_free.status_code == 200
    assert saved_free.json()["subscription"]["isPersisted"] is True

    changed = client.put(
        "/api/v1/users/me/subscription",
        headers=headers,
        json={"planId": "standard"},
    )
    assert changed.status_code == 200
    assert changed.json()["subscription"]["planId"] == "standard"
    assert changed.json()["subscription"]["priceCents"] == 999
    assert changed.json()["subscription"]["limits"]["maxLearners"] == 2
    assert changed.json()["subscription"]["startedAt"]

    stored = database.collection("subscriptions").document("user-123").get().to_dict()
    assert stored["parentId"] == "user-123"
    assert stored["currency"] == "GBP"
    assert stored["billingCycle"] == "monthly"
    assert stored["planLimits"]["practiceSubmissionsPerMonth"] == 10
    assert stored["createdAt"]

    cancelled = client.post("/api/v1/users/me/subscription/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["subscription"]["status"] == "cancelled"
    assert cancelled.json()["subscription"]["planId"] == "standard"
    assert cancelled.json()["subscription"]["effectivePlanId"] == "free"
    assert cancelled.json()["subscription"]["limits"]["maxLearners"] == 1
    assert stored["status"] == "active"
    assert database.collection("subscriptions").document("user-123").get().to_dict()["status"] == "cancelled"


def _link_student(database: MemoryFirestore, learner: dict[str, Any]) -> None:
    (
        database.collection("users")
        .document("user-123")
        .collection("children")
        .document(learner["id"])
        .update({"studentUid": "student-uid"})
    )
    database.collection("studentAccounts").document("student-uid").set(
        {
            "uid": "student-uid",
            "role": "student",
            "parentId": "user-123",
            "learnerId": learner["id"],
            "studentId": learner["studentId"],
        }
    )


def test_student_entitlements_and_practice_quota_are_enforced_by_api(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    parent_headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, parent_headers)
    _link_student(database, learner)
    student_headers = {"Authorization": "Bearer student-token"}

    access = client.get(
        "/api/v1/students/me/lessons/lesson-1/access",
        headers=student_headers,
    )
    assert access.status_code == 200
    assert access.json()["allowed"] is True

    entitlements = client.get("/api/v1/students/me/entitlements", headers=student_headers)
    assert entitlements.status_code == 200
    assert entitlements.json()["limits"]["practiceSubmissionsPerMonth"] == 3

    for submission_number in range(1, 4):
        response = client.post(
            "/api/v1/students/me/practice-submissions",
            headers=student_headers,
            json={"lessonId": "lesson-1"},
        )
        assert response.status_code == 201
        assert response.json()["status"] == "simulated"
        assert response.json()["practiceSubmissionsUsed"] == submission_number

    exhausted = client.post(
        "/api/v1/students/me/practice-submissions",
        headers=student_headers,
        json={"lessonId": "lesson-1"},
    )
    assert exhausted.status_code == 429
    assert "3 monthly practice submissions" in exhausted.json()["detail"]

    student_cannot_manage = client.put(
        "/api/v1/users/me/subscription",
        headers=student_headers,
        json={"planId": "premium"},
    )
    assert student_cannot_manage.status_code == 403


def test_student_invitation_is_one_time_and_links_own_profile(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, firebase_users = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, headers)

    invitation_response = client.post(
        f"/api/v1/users/me/children/{learner['id']}/student-invitations",
        headers=headers,
    )
    assert invitation_response.status_code == 201
    invitation = invitation_response.json()
    assert invitation["username"].startswith("learner-")
    assert len(invitation["code"]) >= 30

    stored_invites = database.collection("studentInvitations").stream()
    assert len(stored_invites) == 1
    assert invitation["code"] not in str(stored_invites[0].to_dict())

    activation = client.post(
        "/api/v1/student-invitations/activate",
        json={"code": invitation["code"], "password": "secure student pass"},
    )
    assert activation.status_code == 200
    assert activation.json()["username"] == invitation["username"]
    assert firebase_users[activation.json()["uid"]]["password"] == "secure student pass"
    assert firebase_users[activation.json()["uid"]]["email_verified"] is True

    student_profile = client.get(
        "/api/v1/students/me",
        headers={"Authorization": "Bearer student-token"},
    )
    assert student_profile.status_code == 200
    assert student_profile.json()["learnerId"] == learner["id"]
    assert student_profile.json()["firstName"] == "Sunny"
    assert student_profile.json()["uid"] == activation.json()["uid"]
    parent_action = client.get(
        "/api/v1/users/me/children",
        headers={"Authorization": "Bearer student-token"},
    )
    assert parent_action.status_code == 403

    replay = client.post(
        "/api/v1/student-invitations/activate",
        json={"code": invitation["code"], "password": "another secure pass"},
    )
    assert replay.status_code == 400


def test_student_cannot_access_another_learner_profile(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    parent_headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, parent_headers)
    database.collection("studentAccounts").document("student-uid").set(
        {
            "uid": "student-uid",
            "role": "student",
            "parentId": "other-parent",
            "learnerId": "different-child",
        }
    )
    other_child = (
        database.collection("users")
        .document("other-parent")
        .collection("children")
        .document("different-child")
    )
    other_child.set(
        {
            "studentUid": "different-student",
            "status": "active",
            "firstName": "Other",
        }
    )
    database.collection("users").document("other-parent").set({"role": "parent"})

    response = client.get(
        "/api/v1/students/me",
        headers={"Authorization": "Bearer student-token"},
    )
    assert response.status_code == 403
    assert learner["id"] != "different-child"


def test_booking_reserves_and_releases_capacity_for_parent_linked_learner(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, headers)
    parent_ref = database.collection("users").document("user-123")
    parent_ref.update({"role": "admin"})
    session_response = client.post(
        "/api/v1/admin/sessions",
        headers=headers,
        json={
            "title": "Family singing session",
            "venue": "Community Hall",
            "startAt": "2035-06-15T10:00:00+10:00",
            "endAt": "2035-06-15T10:45:00+10:00",
            "capacity": 1,
            "priceCents": 2500,
        },
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]
    parent_ref.update({"role": "parent"})

    available = client.get("/api/v1/sessions", headers=headers)
    assert available.status_code == 200
    assert any(session["id"] == session_id for session in available.json())

    booking = client.post(
        "/api/v1/users/me/bookings",
        headers=headers,
        json={"sessionId": session_id, "learnerId": learner["id"]},
    )
    assert booking.status_code == 201
    assert booking.json()["status"] == "confirmed"
    assert booking.json()["paymentStatus"] == "simulated"
    assert booking.json()["learnerNickname"] == learner["preferredName"]
    assert booking.json()["amountCents"] == 2500
    assert (
        database.collection("sessions").document(session_id).get().to_dict()["availableSeats"]
        == 0
    )
    history = client.get("/api/v1/users/me/bookings", headers=headers)
    assert history.status_code == 200
    assert [item["id"] for item in history.json()] == [booking.json()["id"]]

    overbooked = client.post(
        "/api/v1/users/me/bookings",
        headers=headers,
        json={"sessionId": session_id, "learnerId": learner["id"]},
    )
    assert overbooked.status_code == 409

    cancelled = client.delete(
        f"/api/v1/users/me/bookings/{booking.json()['id']}",
        headers=headers,
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["paymentStatus"] == "simulated"
    available = client.get("/api/v1/sessions", headers=headers)
    assert available.status_code == 200
    assert available.json()[0]["availableSeats"] == 1


def test_parent_cannot_book_for_another_parents_learner(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, headers)
    session = database.collection("sessions").document("published-session")
    session.set(
        {
            "title": "Community singing",
            "venue": "Music room",
            "startAt": datetime(2035, 6, 15, 10, tzinfo=timezone.utc),
            "endAt": datetime(2035, 6, 15, 11, tzinfo=timezone.utc),
            "capacity": 2,
            "availableSeats": 2,
            "priceCents": 0,
            "currency": "AUD",
            "status": "published",
        }
    )

    response = client.post(
        "/api/v1/users/me/bookings",
        headers=headers,
        json={"sessionId": "published-session", "learnerId": f"other-{learner['id']}"},
    )
    assert response.status_code == 404
    assert session.get().to_dict()["availableSeats"] == 2


def test_student_activation_rejects_missing_or_expired_codes(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, database, _ = parent_client
    headers = {"Authorization": "Bearer valid-token"}
    learner = create_learner(client, headers)
    invitation = client.post(
        f"/api/v1/users/me/children/{learner['id']}/student-invitations",
        headers=headers,
    ).json()
    invitation_ref = _invitation_ref(database, invitation["code"])
    invitation_ref.update({"expiresAt": datetime(2000, 1, 1, tzinfo=timezone.utc)})

    response = client.post(
        "/api/v1/student-invitations/activate",
        json={"code": invitation["code"], "password": "secure student pass"},
    )
    assert response.status_code == 400
    assert "invalid or expired" in response.json()["detail"].lower()


def test_parent_cannot_publish_sessions(
    parent_client: tuple[TestClient, MemoryFirestore, dict[str, dict[str, Any]]],
) -> None:
    client, _, _ = parent_client
    response = client.post(
        "/api/v1/admin/sessions",
        headers={"Authorization": "Bearer valid-token"},
        json={
            "title": "Unauthorized session",
            "venue": "Community Hall",
            "startAt": "2035-06-15T10:00:00+10:00",
            "endAt": "2035-06-15T10:45:00+10:00",
            "capacity": 5,
            "priceCents": 0,
        },
    )
    assert response.status_code == 403


def test_session_create_rejects_timezone_less_dates() -> None:
    with pytest.raises(ValueError):
        SessionCreate(
            title="Session",
            venue="Hall",
            startAt=datetime(2035, 6, 15, 10),
            endAt=datetime(2035, 6, 15, 11),
            capacity=2,
            priceCents=0,
        )
