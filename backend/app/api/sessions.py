from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from app.core.database import get_db
from app.models.session import Session

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("/")
def get_sessions(db: DBSession = Depends(get_db)):
    return db.query(Session).all()

@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    return db.query(Session).filter(Session.id == session_id).first()
