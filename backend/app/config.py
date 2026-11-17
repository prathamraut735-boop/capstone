import os
from pathlib import Path
from typing import Any

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

firebase_app_name = "toy-choir-api"
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "capstone-af3eb")
firebase_storage_bucket = os.getenv(
    "FIREBASE_STORAGE_BUCKET",
    f"{firebase_project_id}.firebasestorage.app",
)
student_auth_email_domain = os.getenv(
    "STUDENT_AUTH_EMAIL_DOMAIN",
    "student.toychoir.local",
)
firebase_web_api_key = os.getenv("FIREBASE_WEB_API_KEY", "").strip()
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

allowed_origins = get_allowed_origins()
