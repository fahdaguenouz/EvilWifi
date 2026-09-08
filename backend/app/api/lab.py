import socket

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.lab_manager import lab_manager, LabMode

router = APIRouter(
    prefix="/api/lab",
    tags=["Laboratory"],
)

class StartLabRequest(BaseModel):
    mode: LabMode
    authorized: bool
    ssid: str = Field(default="FahdWiFi-Lab", min_length=1, max_length=32)
    interface: str = Field(default="eth0", min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_.:-]+$")


def available_interfaces() -> list[str]:
    return [name for _, name in socket.if_nameindex()]

@router.get("/status")
def get_lab_status():
    return lab_manager.get_status()


@router.get("/interfaces")
def get_interfaces():
    interfaces = available_interfaces()
    return {
        "interfaces": interfaces,
        "recommended": next((name for name in interfaces if name != "lo"), interfaces[0] if interfaces else None),
    }

@router.post("/start")
def start_lab(request: StartLabRequest):
    if not request.authorized:
        raise HTTPException(status_code=403, detail="Unauthorized testing is strictly prohibited.")
    
    interfaces = available_interfaces()
    if request.interface not in interfaces:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Interface '{request.interface}' is not available. Refresh the interface list and try again.",
        )

    lab_manager.start(mode=request.mode, ssid=request.ssid, interface=request.interface)

    return lab_manager.get_status()

@router.post("/stop")
def stop_lab():
    lab_manager.stop()

    return lab_manager.get_status()
