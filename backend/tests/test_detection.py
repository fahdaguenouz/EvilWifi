from app.services.detection_engine import DetectionEngine


def active_engine() -> DetectionEngine:
    engine = DetectionEngine()
    engine.start(
        expected_ssid="Training-WiFi",
        expected_bssid="AA:BB:CC:00:00:01",
        expected_gateway="10.10.10.1",
        expected_dns="10.10.10.1",
    )
    return engine


def test_inactive_engine_emits_no_findings():
    engine = DetectionEngine()

    assert engine.analyze_event("http_request", {"host": "example.test"}) == []


def test_duplicate_ssid_and_unexpected_bssid_are_detected_once():
    engine = active_engine()
    engine.analyze_event(
        "access_point_observed",
        {"ssid": "Training-WiFi", "bssid": "AA:BB:CC:00:00:01"},
    )

    findings = engine.analyze_event(
        "access_point_observed",
        {"ssid": "Training-WiFi", "bssid": "DD:EE:FF:00:00:02"},
    )
    repeated = engine.analyze_event(
        "access_point_observed",
        {"ssid": "Training-WiFi", "bssid": "DD:EE:FF:00:00:02"},
    )

    assert {finding["alert_type"] for finding in findings} == {"unexpected_bssid", "duplicate_ssid"}
    assert all(finding["severity"] == "HIGH" for finding in findings)
    assert repeated == []


def test_unexpected_gateway_and_dns_are_detected():
    engine = active_engine()

    findings = engine.analyze_event(
        "network_configuration",
        {"gateway": "10.10.10.254", "dns_server": "10.10.10.53"},
    )

    assert {finding["alert_type"] for finding in findings} == {
        "unexpected_gateway",
        "unexpected_dns_server",
    }


def test_portal_and_http_findings_are_educational_indicators():
    engine = active_engine()

    portal = engine.analyze_event("captive_portal_opened", {})
    http = engine.analyze_event("http_request", {"host": "lab.example"})

    assert portal[0]["alert_type"] == "suspicious_captive_portal"
    assert http[0]["alert_type"] == "unencrypted_http"
    assert "may" in http[0]["message"].lower()
