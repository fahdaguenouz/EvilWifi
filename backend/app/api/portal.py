from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.lab_manager import lab_manager
from app.services.ap_manager import AccessPointManager

router = APIRouter(
    prefix="/api/portal",
    tags=["Captive Portal"],
)

class PortalLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def submit_portal_login(request: PortalLoginRequest):
    # Retrieve the lab manager's AP manager instance
    ap_manager = lab_manager.ap_manager
    
    if not ap_manager._is_running:
        raise HTTPException(status_code=400, detail="Laboratory is not currently running.")

    # Ensure safety: mask the password to avoid persisting real credentials
    pwd = request.password
    masked_password = f"{pwd[:2]}***" if len(pwd) >= 2 else "***"

    # Record the credential harvesting event
    ap_manager._emit_event(
        "captive_portal_login", 
        {"username": request.username, "password_used": masked_password, "note": "Demonstration of credential harvesting"}
    )

    return {"status": "success", "message": "Portal login intercepted successfully."}
