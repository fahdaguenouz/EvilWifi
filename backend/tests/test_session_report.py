from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.session_report import build_session_report


def record(**values):
    return SimpleNamespace(**values)


def test_report_scores_distinct_indicators_once_and_explains_result():
    now = datetime.now(UTC)
    session = record(id=4, ssid="Training-WiFi", interface="wlan0", started_at=now, ended_at=now)
    events = [
        record(event_type="dns_query", device_id=1),
        record(event_type="tls_connection", device_id=1),
        record(event_type="http_request", device_id=2),
    ]
    alerts = [
        record(alert_type="duplicate_ssid", severity="HIGH", message="Duplicate observed"),
        record(alert_type="duplicate_ssid", severity="HIGH", message="Repeated duplicate"),
        record(alert_type="unencrypted_http", severity="MEDIUM", message="Plain HTTP observed"),
    ]

    report = build_session_report(session, events, alerts)

    assert report["trust_score"]["value"] == 77
    assert len(report["findings"]) == 2
    assert report["evidence"]["device_count"] == 2
    assert report["trust_score"]["explanation"]
    assert report["concepts_reviewed"]


def test_capture_error_limits_confidence_without_lowering_trust_score():
    now = datetime.now(UTC)
    session = record(id=5, ssid="Training-WiFi", interface="wlan0", started_at=now, ended_at=None)
    alerts = [record(alert_type="sniffer_error", severity="HIGH", message="Capture unavailable")]

    report = build_session_report(session, [], alerts)

    assert report["trust_score"]["value"] == 100
    assert report["trust_score"]["confidence"] == "limited"
    assert report["evidence"]["capture_complete"] is False
    assert "permission" in report["next_steps"][0]
