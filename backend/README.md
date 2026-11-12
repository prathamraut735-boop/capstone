# Toy Choir TV API

FastAPI verifies Firebase Authentication ID tokens and reads a signed-in user's
profile from the Firestore `users/{uid}` document.

## Local setup

Use Python 3.11 or newer. From the repository root:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Check `backend/.env` contains the correct Firebase project ID and points
`GOOGLE_APPLICATION_CREDENTIALS` to the existing service account JSON file.
The key is ignored by Git; do not commit it or put it in frontend configuration.

Start the API from the repository root:

```sh
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload
```

The local Vite origin defaults to `http://localhost:5173`. For deployment, set
`ENVIRONMENT=production` and set `FRONTEND_ORIGINS` to the exact comma-separated
frontend origins. Wildcard CORS origins are rejected.

## Endpoint

`GET /api/v1/users/me` requires `Authorization: Bearer <Firebase ID token>`.
It returns the authenticated user's Firestore profile, returns 404 if the
profile document is missing, 401 for invalid tokens, and a safe 503 response
when Firebase or Firestore is temporarily unavailable.

The frontend can point to this API by setting `VITE_API_BASE_URL`; it defaults
to `http://localhost:8000`.

## Tests

```sh
cd backend
.venv/bin/python -m pytest
```
