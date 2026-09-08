import hmac

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.services.lab_manager import LabMode, LabStatus, lab_manager


router = APIRouter(prefix="/api/portal", tags=["Captive Portal"])

TRAINING_USER = "training-user"
TRAINING_TOKEN = "training-token"


class PortalEntryRequest(BaseModel):
    """A deliberately synthetic training identity, never a real credential."""

    model_config = ConfigDict(extra="forbid")

    training_user: str = Field(min_length=1, max_length=64)
    training_token: str = Field(min_length=1, max_length=64)


def _require_active_evil_twin_lab():
    if lab_manager.status != LabStatus.RUNNING or not lab_manager.ap_manager._is_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Start the laboratory before opening the training portal.",
        )

    if lab_manager.mode != LabMode.EVIL_TWIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The training portal is available only in Evil Twin simulation mode.",
        )

    return lab_manager.ap_manager


@router.get("/status")
def get_portal_status():
    available = (
        lab_manager.status == LabStatus.RUNNING
        and lab_manager.ap_manager._is_running
        and lab_manager.mode == LabMode.EVIL_TWIN
    )
    return {
        "available": available,
        "lab_status": lab_manager.status,
        "lab_mode": lab_manager.mode,
        "ssid": lab_manager.ap_manager.ssid if available else None,
        "training_user": TRAINING_USER,
        "training_token": TRAINING_TOKEN,
        "warning": "LAB ONLY — Never enter a real username, password, or token.",
    }


@router.post("/open")
def open_portal():
    ap_manager = _require_active_evil_twin_lab()
    ap_manager._emit_event(
        "captive_portal_opened",
        {
            "portal": "coffee_shop_training",
            "purpose": "security_awareness_training",
        },
    )
    return {"status": "ready", "message": "Training portal opened."}


@router.post("/enter")
def enter_training_session(request: PortalEntryRequest):
    ap_manager = _require_active_evil_twin_lab()

    is_valid = hmac.compare_digest(request.training_user, TRAINING_USER) and hmac.compare_digest(
        request.training_token, TRAINING_TOKEN
    )

    # Never include submitted values, partial values, or hashes in persisted metadata.
    ap_manager._emit_event(
        "test_form_submitted",
        {
            "portal": "coffee_shop_training",
            "accepted": is_valid,
            "synthetic_fields_received": ["training_user", "training_token"],
            "sensitive_values_stored": False,
        },
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Use only the displayed synthetic training identity and token.",
        )

    return {
        "status": "success",
        "message": "Training session accepted. No submitted values were stored.",
    }
