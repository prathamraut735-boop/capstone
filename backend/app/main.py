from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import allowed_origins, initialize_firebase
from app.routes import health, parent, profile, sessions, students


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.firebase_admin_app, app.state.firestore_client = initialize_firebase()
    yield


app = FastAPI(title="Toy Choir TV API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router)
app.include_router(profile.router)
app.include_router(parent.router)
app.include_router(students.router)
app.include_router(sessions.router)
