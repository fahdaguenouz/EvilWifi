from app.services.detection_engine import DetectionEngine, DEAUTH_FLOOD_THRESHOLD
from app.services.packet_analyzer import PacketAnalyzer, DOT11_MGMT_SUBTYPES
from app.services.protocol_classifier import classify_event
from app.services.education import educational_context


def active_engine() -> DetectionEngine:
    engine = DetectionEngine()
    engine.start(expected_ssid="Training-WiFi", expected_bssid="AA:BB:CC:00:00:01")
    return engine


# --- 802.11 frame parsing helpers (no live capture needed) -------------------

def test_dot11_subtype_parses_decimal_and_hex():
    assert PacketAnalyzer._dot11_subtype("8") == 8
    assert PacketAnalyzer._dot11_subtype("0x0c") == 12
    assert PacketAnalyzer._dot11_subtype("0x08") == 8
    assert PacketAnalyzer._dot11_subtype(None) is None
    assert PacketAnalyzer._dot11_subtype("junk") is None


def test_known_management_subtypes_are_mapped():
    assert DOT11_MGMT_SUBTYPES[8] == "beacon"
    assert DOT11_MGMT_SUBTYPES[4] == "probe_request"
    assert DOT11_MGMT_SUBTYPES[12] == "deauthentication"


def test_mac_and_ssid_normalization():
    assert PacketAnalyzer._mac("aa:bb:cc:00:00:01") == "AA:BB:CC:00:00:01"
    assert PacketAnalyzer._mac("Unknown") is None
    assert PacketAnalyzer._mac(None) is None
    assert PacketAnalyzer._ssid("  ") is None
    assert PacketAnalyzer._ssid("Cafe") == "Cafe"


# --- Detection -----------------------------------------------------------------

def test_first_deauth_is_medium_indicator():
    engine = active_engine()

    findings = engine.analyze_event("deauth_frame", {"bssid": "AA:BB:CC:00:00:01", "to_mac": "11:22:33:44:55:66"})

    assert len(findings) == 1
    assert findings[0]["alert_type"] == "deauth_activity"
    assert findings[0]["severity"] == "MEDIUM"


def test_deauth_burst_escalates_to_high_flood_once():
    engine = active_engine()
    severities = []
    for _ in range(DEAUTH_FLOOD_THRESHOLD + 3):
        severities.extend(f["severity"] for f in engine.analyze_event("deauth_frame", {"bssid": "AA:BB:CC:00:00:01"}))

    assert severities.count("MEDIUM") == 1  # first observation only
    assert severities.count("HIGH") == 1    # flood fires exactly once


def test_open_network_beacon_is_flagged_low():
    engine = active_engine()

    findings = engine.analyze_event(
        "access_point_observed",
        {"ssid": "Training-WiFi", "bssid": "AA:BB:CC:00:00:01", "security": "Open"},
    )

    assert any(f["alert_type"] == "open_network" and f["severity"] == "LOW" for f in findings)


def test_encrypted_network_is_not_flagged_open():
    engine = active_engine()

    findings = engine.analyze_event(
        "access_point_observed",
        {"ssid": "Training-WiFi", "bssid": "AA:BB:CC:00:00:01", "security": "WPA2/WPA3"},
    )

    assert all(f["alert_type"] != "open_network" for f in findings)


# --- Classification & education ------------------------------------------------

def test_wireless_events_have_classification_and_education():
    for event_type in ("probe_request", "probe_response", "deauth_frame",
                        "wifi_authentication", "disassociation_frame", "access_point_observed"):
        profile = classify_event(event_type)
        assert profile["protocol"] != "Other", event_type
        assert profile["encrypted"] is False

        edu = educational_context(event_type)
        assert edu["concept"] != "Laboratory observation", event_type
        assert edu["how_to_protect"]
