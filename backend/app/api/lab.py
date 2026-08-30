from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.lab_manager import lab_manager, LabMode

router = APIRouter(
    prefix="/api/lab",
    tags=["Laboratory"],
)

class StartLabRequest(BaseModel):
    mode: LabMode
    authorized: bool
    ssid: str = "FahdWiFi-Lab"

@router.get("/status")
def get_lab_status():
    return lab_manager.get_status()

@router.post("/start")
def start_lab(request: StartLabRequest):
    if not request.authorized:
        raise HTTPException(status_code=403, detail="Unauthorized testing is strictly prohibited.")
    
    lab_manager.start(mode=request.mode, ssid=request.ssid)

    return lab_manager.get_status()

@router.post("/stop")
def stop_lab():
    lab_manager.stop()

    return lab_manager.get_status()