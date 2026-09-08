from datetime import UTC, datetime
from types import SimpleNamespace

from app.api.analysis import get_analysis_summary
from app.api.events import serialize_event
from app.services.packet_analyzer import PacketAnalyzer
from app.services.protocol_classifier import classify_event, enrich_event


class QueryStub:
    def __init__(self, events):
        self.events = events

    def order_by(self, *_args):
        return self

    def limit(self, _limit):
        return self

    def all(self):
        return self.events


class DatabaseStub:
    def __init__(self, events):
        self.events = events

    def query(self, _model):
        return QueryStub(self.events)


def test_dns_classification_explains_visibility():
    analysis = classify_event("dns_query")

    assert analysis["protocol"] == "DNS"
    assert analysis["encrypted"] is False
    assert "domain" in analysis["visibility"].lower()


def test_tls_classification_explains_encryption():
    analysis = classify_event("tls_connection")

    assert analysis["protocol"] == "TLS"
    assert analysis["encrypted"] is True
    assert "metadata" in analysis["learning_point"].lower()


def test_enrichment_does_not_modify_original_metadata():
    original = {"domain": "lab.example"}

    enriched = enrich_event("dns_query", original)

    assert "analysis" not in original
    assert enriched["analysis"]["category"] == "name_resolution"


def test_packet_analyzer_emits_classified_dns_event():
    captured = []
    analyzer = PacketAnalyzer("test-interface", lambda event_type, metadata: captured.append((event_type, metadata)))
    analyzer._is_running = True
    packet = SimpleNamespace(dns=SimpleNamespace(qry_name="training.example"))

    analyzer._process_packet(packet)

    assert captured[0][0] == "dns_query"
    assert captured[0][1]["domain"] == "training.example"
    assert captured[0][1]["analysis"]["protocol"] == "DNS"


def test_analysis_summary_counts_only_supported_packet_events():
    now = datetime.now(UTC)
    events = [
        SimpleNamespace(event_type="dns_query", event_metadata={}, timestamp=now),
        SimpleNamespace(event_type="http_request", event_metadata={}, timestamp=now),
        SimpleNamespace(event_type="tls_connection", event_metadata={}, timestamp=now),
        SimpleNamespace(event_type="captive_portal_opened", event_metadata={}, timestamp=now),
    ]

    summary = get_analysis_summary(limit=100, db=DatabaseStub(events))

    assert summary["events_reviewed"] == 4
    assert summary["classified_events"] == 3
    assert summary["protocols_observed"] == 3
    assert summary["encrypted_events"] == 1
    assert summary["visible_events"] == 2


def test_historical_packet_event_is_classified_when_read():
    event = SimpleNamespace(
        id=7,
        session_id=2,
        device_id=None,
        event_type="http_request",
        event_metadata={"host": "training.example"},
        timestamp=datetime.now(UTC),
    )

    serialized = serialize_event(event)

    assert serialized["event_metadata"]["analysis"]["protocol"] == "HTTP"
    assert "analysis" not in event.event_metadata
