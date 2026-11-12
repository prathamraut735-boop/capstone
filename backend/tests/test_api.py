from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from firebase_admin import auth as firebase_auth
from google.api_core.exceptions import ServiceUnavailable

from app import main


class FakeSnapshot:
    def __init__(self, data: dict[str, Any] | None):
        self.exists = data is not None
        self._data = data or {}

    def to_dict(self) -> dict[str, Any]:
        return self._data


class FakeDocument:
    def __init__(self, snapshot: FakeSnapshot):
        self.snapshot = snapshot

    def get(self) -> FakeSnapshot:
        return self.snapshot


class FakeCollection:
    def __init__(self, document: Any):
        self._document = document

    def document(self, uid: str) -> FakeDocument:
        assert uid == "user-123"
        return self._document


class FakeFirestore:
    def __init__(self, document: Any):
        self._collection = FakeCollection(document)

    def collection(self, name: str) -> FakeCollection:
        assert name == "users"
        return self._collection


@pytest.fixture
def api_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    database = FakeFirestore(
        FakeDocument(
            FakeSnapshot(
                {
                    "email": "parent@example.com",
                    "displayName": "Parent",
                    "role": "parent",
                }
            )
        )
    )
    monkeypatch.setattr(main, "initialize_firebase", lambda: (object(), database))
    with TestClient(main.app) as client:
        yield client


def mock_valid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        main.firebase_auth,
        "verify_id_token",
        lambda token, app, check_revoked: {
            "uid": "user-123",
            "email": "parent@example.com",
        },
    )


def test_health_endpoint(api_client: TestClient) -> None:
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_profile_requires_bearer_token(api_client: TestClient) -> None:
    response = api_client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_profile_returns_authenticated_users_document(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_valid_token(monkeypatch)
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "uid": "user-123",
        "email": "parent@example.com",
        "displayName": "Parent",
        "role": "parent",
    }


def test_invalid_token_returns_401(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def reject_token(token: str, app: object, check_revoked: bool) -> dict[str, Any]:
        raise firebase_auth.InvalidIdTokenError("invalid")

    monkeypatch.setattr(main.firebase_auth, "verify_id_token", reject_token)
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "The Firebase ID token is invalid or expired."


def test_missing_profile_returns_404(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_valid_token(monkeypatch)
    main.app.state.firestore_client = FakeFirestore(FakeDocument(FakeSnapshot(None)))
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 404


def test_firestore_failure_returns_503(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_valid_token(monkeypatch)

    class UnavailableDocument:
        def get(self) -> None:
            raise ServiceUnavailable("Firestore unavailable")

    main.app.state.firestore_client = FakeFirestore(UnavailableDocument())
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 503


def test_unexpected_firestore_error_returns_safe_500(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_valid_token(monkeypatch)

    class BrokenDocument:
        def get(self) -> None:
            raise RuntimeError("internal detail must not reach the client")

    api_client.app.state.firestore_client = FakeFirestore(BrokenDocument())
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Unable to retrieve the user profile."


def test_cors_allows_local_vite_origin(api_client: TestClient) -> None:
    response = api_client.options(
        "/api/v1/users/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_does_not_allow_arbitrary_origin(api_client: TestClient) -> None:
    response = api_client.options(
        "/api/v1/users/me",
        headers={
            "Origin": "https://not-the-app.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_cors_rejects_wildcard_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FRONTEND_ORIGINS", "*")
    with pytest.raises(RuntimeError, match="explicit frontend origins"):
        main.get_allowed_origins()


def test_authentication_service_failure_returns_503(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_verification(token: str, app: object, check_revoked: bool) -> dict[str, Any]:
        raise firebase_auth.CertificateFetchError(
            "certificate service unavailable",
            RuntimeError("certificate endpoint unreachable"),
        )

    monkeypatch.setattr(main.firebase_auth, "verify_id_token", fail_verification)
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Authentication service is temporarily unavailable."


def test_unexpected_authentication_error_returns_safe_500(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_verification(token: str, app: object, check_revoked: bool) -> dict[str, Any]:
        raise RuntimeError("internal detail must not reach the client")

    monkeypatch.setattr(main.firebase_auth, "verify_id_token", fail_verification)
    response = api_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Unable to verify the authentication token."
