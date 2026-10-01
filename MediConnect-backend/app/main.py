import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import (
    auth,
    doctors,
    ai,
    consultations,
    admin,
    documents,
    appointment_requests,
    notifications,
)
from .models import *


app = FastAPI(
    title="MediConnect API",
    description="Healthcare consultation marketplace and remote consultation API",
    version="2.0.0",
)


frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

origins = [frontend_url]

if frontend_url in {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(doctors.router)
app.include_router(ai.router)
app.include_router(consultations.router)
app.include_router(documents.router)
app.include_router(appointment_requests.router)
app.include_router(notifications.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "MediConnect API is running",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/database-test")
def dbtest():
    with engine.connect() as c:
        if engine.dialect.name == "postgresql":
            database = c.execute(
                text("SELECT current_database()")
            ).scalar()
        else:
            database = c.execute(
                text("SELECT DATABASE()")
            ).scalar()

        return {
            "database": database,
            "status": "connected",
            "engine": engine.dialect.name,
        }