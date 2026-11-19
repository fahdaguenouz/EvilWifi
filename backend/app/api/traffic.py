"""Traffic viewer API for the EvilWifi Lab network viewer feature.

This module exposes aggregated network traffic summaries so the frontend
Traffic Viewer page can show what destinations devices are contacting,
which web apps are being searched, and how much data is moving in plaintext
versus encrypted traffic.

It reuses events already captured by the packet analyzer (DNS, DHCP, HTTP,
TLS, ARP) so no new capture logic is required.
"""

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.models.event import Event
from app.services.protocol_classifier import classify_event

router = APIRouter(prefix="/api/traffic", tags=["Traffic Viewer"])

# Event types that represent actual application-layer traffic flows.
TRAFFIC_EVENT_TYPES = {
    "dns_query",
    "http_request",
    "tls_connection",
    "dhcp_request",
    "network_configuration",
    "arp_request",
}


def _destination(metadata: dict[str, Any]) -> str:
    """Pick the most useful destination label from event metadata."""
    for key in ("host", "domain", "sni", "ip", "dst"):
        value = metadata.get(key)
        if value and str(value) != "Unknown":
            return str(value)
    return "local"


@router.get("/summary")
def traffic_summary(
    limit: int = Query(default=500, ge=1, le=5000),
    db: DBSession = Depends(get_db),
) -> dict[str, Any]:
    """Return an aggregate summary of observed network traffic.

    Args:
        limit: Maximum number of recent events to scan.
        db: Database session dependency.

    Returns:
        A dict with total counts, protocol breakdown, byte totals, and a
        list of recent traffic flows with destination and encryption status.
    """
    events = (
        db.query(Event)
        .filter(Event.event_type.in_(TRAFFIC_EVENT_TYPES))
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )

    flows: list[dict[str, Any]] = []
    protocol_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    destination_counts: Counter[str] = Counter()
    encrypted = 0
    visible = 0
    total_bytes = 0

    for event in events:
        metadata = event.event_metadata or {}
        analysis = metadata.get("analysis") or classify_event(event.event_type)
        if analysis["protocol"] == "Other":
            continue

        destination = _destination(metadata)
        protocol = analysis["protocol"]
        category = analysis["category"]

        # Estimate bytes if pyshark captured a length; otherwise count 1 flow.
        flow_bytes = int(metadata.get("length", 0) or 0)
        if flow_bytes == 0:
            flow_bytes = 1

        protocol_counts[protocol] += 1
        category_counts[category] += 1
        destination_counts[destination] += 1
        total_bytes += flow_bytes

        if analysis["encrypted"] is True:
            encrypted += 1
        elif analysis["encrypted"] is False:
            visible += 1

        flows.append(
            {
                "time": event.timestamp.isoformat() if event.timestamp else None,
                "protocol": protocol,
                "category": category,
                "destination": destination,
                "encrypted": analysis["encrypted"],
                "visibility": analysis["visibility"],
                "bytes": flow_bytes,
                "event_type": event.event_type,
            }
        )

    return {
        "totals": {
            "flows": len(flows),
            "encrypted_flows": encrypted,
            "visible_flows": visible,
            "total_bytes": total_bytes,
        },
        "protocol_counts": dict(protocol_counts),
        "category_counts": dict(category_counts),
        "top_destinations": [
            {"destination": dest, "count": count}
            for dest, count in destination_counts.most_common(10)
        ],
        "flows": flows,
    }
