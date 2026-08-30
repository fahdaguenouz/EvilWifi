from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from app.core.database import get_db
from app.models.event import Event

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("/")
def get_events(limit: int = 100, db: DBSession = Depends(get_db)):
    return db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()

@router.get("/{event_id}")
def get_event(event_id: int, db: DBSession = Depends(get_db)):
    return db.query(Event).filter(Event.id == event_id).first()
