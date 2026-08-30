from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import lab, sessions, devices, portal, events as api_events
from app.websocket import events as ws_events

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown logic can go here

app = FastAPI(
    title=settings.app_name,
    description="Authorized Wi-Fi security education and laboratory platform",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "application": settings.app_name,
        "environment": settings.environment,
        "lab_mode": settings.lab_mode,
        "authorization_required": settings.authorization_required,
    }

# Include REST Routers
app.include_router(lab.router)
app.include_router(sessions.router)
app.include_router(devices.router)
app.include_router(portal.router)
app.include_router(api_events.router)

# Include WebSocket Router
app.include_router(ws_events.router)