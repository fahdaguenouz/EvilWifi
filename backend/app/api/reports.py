from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models.alert import Alert
from app.models.event import Event
from app.models.session import Session
from app.services.session_report import build_session_report


router = APIRouter(prefix="/api/reports", tags=["Session Review"])


def _report_for(session: Session, db: DBSession):
    events = db.query(Event).filter(Event.session_id == session.id).order_by(Event.timestamp.asc()).all()
    alerts = db.query(Alert).filter(Alert.session_id == session.id).order_by(Alert.timestamp.asc()).all()
    return build_session_report(session, events, alerts)


@router.get("/latest")
def latest_report(db: DBSession = Depends(get_db)):
    session = db.query(Session).order_by(Session.started_at.desc()).first()
    if session is None:
        raise HTTPException(status_code=404, detail="No lab session is available to review.")
    return _report_for(session, db)


@router.get("/{session_id}")
def session_report(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Lab session not found.")
    return _report_for(session, db)
