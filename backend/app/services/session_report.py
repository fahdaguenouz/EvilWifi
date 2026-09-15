from collections import Counter
from typing import Any, Iterable

from app.services.education import educational_context
from app.services.protocol_classifier import classify_event


SEVERITY_DEDUCTIONS = {"HIGH": 15, "MEDIUM": 8, "LOW": 3, "INFO": 0}
CAPTURE_ALERTS = {"sniffer_error"}


def _score_label(score: int) -> str:
    if score >= 80:
        return "No major indicators observed"
    if score >= 60:
        return "Review recommended"
    return "Strong caution indicators"


def build_session_report(session: Any, events: Iterable[Any], alerts: Iterable[Any]) -> dict[str, Any]:
    event_list = list(events)
    alert_list = list(alerts)
    event_counts = Counter(event.event_type for event in event_list)

    unique_findings: dict[str, Any] = {}
    for alert in alert_list:
        if alert.alert_type in CAPTURE_ALERTS:
            continue
        current = unique_findings.get(alert.alert_type)
        severity = str(alert.severity or "INFO").upper()
        if current is None or SEVERITY_DEDUCTIONS.get(severity, 0) > SEVERITY_DEDUCTIONS.get(str(current.severity).upper(), 0):
            unique_findings[alert.alert_type] = alert

    findings = []
    total_deduction = 0
    for alert_type, alert in unique_findings.items():
        severity = str(alert.severity or "INFO").upper()
        deduction = SEVERITY_DEDUCTIONS.get(severity, 0)
        total_deduction += deduction
        findings.append({
            "alert_type": alert_type,
            "severity": severity,
            "message": alert.message,
            "score_impact": -deduction,
        })

    score = max(0, 100 - total_deduction)
    packet_types = {
        event_type
        for event_type in event_counts
        if classify_event(event_type)["protocol"] != "Other"
    }
    capture_complete = not any(alert.alert_type in CAPTURE_ALERTS for alert in alert_list)
    if not capture_complete or not packet_types:
        confidence = "limited"
    elif len(packet_types) >= 4:
        confidence = "high"
    else:
        confidence = "moderate"

    concepts = []
    for event_type in event_counts:
        lesson = educational_context(event_type)
        concepts.append({
            "event_type": event_type,
            "concept": lesson["concept"],
            "what_happened": lesson["what_happened"],
            "how_to_protect": lesson["how_to_protect"],
        })

    next_steps = []
    if not capture_complete:
        next_steps.append("Restore packet-capture permission, then repeat the authorized session for complete evidence.")
    if findings:
        next_steps.append("Review each indicator against the expected SSID, BSSID, gateway, DNS, and portal behavior.")
    if event_counts.get("http_request"):
        next_steps.append("Prefer HTTPS and avoid submitting sensitive information over plain HTTP.")
    if not next_steps:
        next_steps.append("Keep automatic joining disabled and verify the network identity before future connections.")
    next_steps.append("Complete the Learn modules and use the result as guidance, not proof that a network is safe.")

    return {
        "session": {
            "id": session.id,
            "ssid": session.ssid,
            "interface": session.interface,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "status": "completed" if session.ended_at else "active",
        },
        "trust_score": {
            "value": score,
            "label": _score_label(score),
            "confidence": confidence,
            "explanation": "Starts at 100 and subtracts points once per distinct defensive indicator. It is a learning aid, not a security guarantee.",
        },
        "evidence": {
            "event_count": len(event_list),
            "device_count": len({event.device_id for event in event_list if event.device_id is not None}),
            "alert_count": len(alert_list),
            "capture_complete": capture_complete,
            "observed_protocols": sorted({classify_event(item)["protocol"] for item in packet_types}),
            "event_counts": dict(sorted(event_counts.items())),
        },
        "findings": sorted(findings, key=lambda item: SEVERITY_DEDUCTIONS.get(item["severity"], 0), reverse=True),
        "concepts_reviewed": concepts,
        "next_steps": next_steps,
    }
