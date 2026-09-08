from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models.event import Event
from app.services.protocol_classifier import classify_event, protocol_catalog


router = APIRouter(prefix="/api/analysis", tags=["Packet Analysis"])


@router.get("/protocols")
def get_protocol_catalog():
    return protocol_catalog()


@router.get("/summary")
def get_analysis_summary(
    limit: int = Query(default=500, ge=1, le=2000),
    db: DBSession = Depends(get_db),
):
    events = db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
    protocol_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    encrypted = 0
    visible = 0
    classified = 0

    for event in events:
        metadata = event.event_metadata or {}
        analysis = metadata.get("analysis") or classify_event(event.event_type)
        if analysis["protocol"] == "Other":
            continue
        classified += 1
        protocol_counts[analysis["protocol"]] += 1
        category_counts[analysis["category"]] += 1
        if analysis["encrypted"] is True:
            encrypted += 1
        elif analysis["encrypted"] is False:
            visible += 1

    return {
        "events_reviewed": len(events),
        "classified_events": classified,
        "protocols_observed": len(protocol_counts),
        "encrypted_events": encrypted,
        "visible_events": visible,
        "protocol_counts": dict(protocol_counts),
        "category_counts": dict(category_counts),
        "most_recent_event_at": events[0].timestamp.isoformat() if events else None,
    }
