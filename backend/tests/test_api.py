import json

import pytest
from fastapi import HTTPException

from app.api.portal import (
    PortalEntryRequest,
    enter_training_session,
    get_portal_status,
    open_portal,
    router,
)
from app.services.lab_manager import LabMode, LabStatus, lab_manager


@pytest.fixture
def active_portal(monkeypatch):
    emitted_events = []
    monkeypatch.setattr(lab_manager, "status", LabStatus.RUNNING)
    monkeypatch.setattr(lab_manager, "mode", LabMode.EVIL_TWIN)
    monkeypatch.setattr(lab_manager.ap_manager, "_is_running", True)
    monkeypatch.setattr(lab_manager.ap_manager, "ssid", "FahdWiFi-Lab")
    monkeypatch.setattr(
        lab_manager.ap_manager,
        "_emit_event",
        lambda event_type, metadata: emitted_events.append((event_type, metadata)),
    )
    return emitted_events


def test_portal_is_unavailable_when_lab_is_stopped(monkeypatch):
    monkeypatch.setattr(lab_manager, "status", LabStatus.STOPPED)
    monkeypatch.setattr(lab_manager.ap_manager, "_is_running", False)

    response = get_portal_status()

    assert response["available"] is False
    assert response["ssid"] is None


def test_portal_open_emits_safe_metadata(active_portal):
    response = open_portal()

    assert response["status"] == "ready"
    assert active_portal == [
        (
            "captive_portal_opened",
            {
                "portal": "coffee_shop_training",
                "purpose": "security_awareness_training",
            },
        )
    ]


def test_training_entry_never_persists_submitted_values(active_portal):
    response = enter_training_session(
        PortalEntryRequest(training_user="training-user", training_token="training-token")
    )

    assert response["status"] == "success"
    event_type, metadata = active_portal[0]
    assert event_type == "test_form_submitted"
    assert metadata["accepted"] is True
    assert metadata["sensitive_values_stored"] is False
    serialized_metadata = json.dumps(metadata)
    assert "training-user" not in serialized_metadata
    assert "training-token" not in serialized_metadata


def test_realistic_credentials_are_rejected_without_storage(active_portal):
    with pytest.raises(HTTPException) as exc_info:
        enter_training_session(
            PortalEntryRequest(
                training_user="person@example.com",
                training_token="MyRealPassword123!",
            )
        )

    assert exc_info.value.status_code == 422
    _, metadata = active_portal[0]
    assert metadata["accepted"] is False
    serialized_metadata = json.dumps(metadata)
    assert "person@example.com" not in serialized_metadata
    assert "MyRealPassword123!" not in serialized_metadata


def test_portal_requires_evil_twin_mode(active_portal, monkeypatch):
    monkeypatch.setattr(lab_manager, "mode", LabMode.NETWORK_LAB)

    with pytest.raises(HTTPException) as exc_info:
        open_portal()

    assert exc_info.value.status_code == 409
    assert active_portal == []


def test_legacy_password_endpoint_is_removed():
    assert all(route.path != "/api/portal/login" for route in router.routes)
