from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from app.core.database import get_db
from app.models.event import Event
from app.services.protocol_classifier import classify_event
from app.services.education import educational_context

router = APIRouter(prefix="/api/events", tags=["Events"])


def serialize_event(event: Event):
    metadata = dict(event.event_metadata or {})
    if "analysis" not in metadata:
        analysis = classify_event(event.event_type)
        if analysis["protocol"] != "Other":
            metadata["analysis"] = analysis
    if "education" not in metadata:
        metadata["education"] = educational_context(event.event_type)

    return {
        "id": event.id,
        "session_id": event.session_id,
        "device_id": event.device_id,
        "event_type": event.event_type,
        "timestamp": event.timestamp,
        "event_metadata": metadata,
    }

@router.get("/")
def get_events(limit: int = 100, db: DBSession = Depends(get_db)):
    events = db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
    return [serialize_event(event) for event in events]

@router.get("/{event_id}")
def get_event(event_id: int, db: DBSession = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    return serialize_event(event) if event else None
