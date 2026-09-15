from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models.alert import Alert
from app.services.detection_engine import DETECTION_RULES


router = APIRouter(prefix="/api/alerts", tags=["Detection Alerts"])


@router.get("/rules")
def get_detection_rules():
    return DETECTION_RULES


@router.get("/")
def get_alerts(
    limit: int = Query(default=100, ge=1, le=1000),
    db: DBSession = Depends(get_db),
):
    return db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
