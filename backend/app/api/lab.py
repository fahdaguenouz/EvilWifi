import socket
import shutil
import subprocess
from pathlib import Path

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
    try:
        return [name for _, name in socket.if_nameindex()]
    except OSError:
        network_path = Path("/sys/class/net")
        if not network_path.exists():
            return []
        return sorted(entry.name for entry in network_path.iterdir())


def capture_readiness(interfaces: list[str]) -> dict:
    wireless_interfaces = [
        name for name in interfaces if (Path("/sys/class/net") / name / "wireless").exists()
    ]
    usb_wireless_interfaces = []
    for name in wireless_interfaces:
        device_path = (Path("/sys/class/net") / name / "device").resolve()
        if "usb" in str(device_path).lower():
            usb_wireless_interfaces.append(name)

    tshark_path = shutil.which("tshark")
    dumpcap_path = shutil.which("dumpcap")
    capture_permission = False
    if dumpcap_path:
        try:
            result = subprocess.run(
                [dumpcap_path, "-D"],
                capture_output=True,
                text=True,
                timeout=3,
                check=False,
            )
            capture_permission = result.returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            capture_permission = False

    issues = []
    if not wireless_interfaces:
        issues.append("No wireless interface detected. Attach the USB Wi-Fi adapter to this machine or virtual machine.")
    if not tshark_path:
        issues.append("TShark is not installed.")
    if not capture_permission:
        issues.append("Packet capture permission is unavailable for dumpcap.")

    return {
        "wireless_interfaces": wireless_interfaces,
        "usb_wireless_interfaces": usb_wireless_interfaces,
        "tshark_installed": tshark_path is not None,
        "capture_permission": capture_permission,
        "wireless_ready": bool(wireless_interfaces and tshark_path and capture_permission),
        "issues": issues,
    }

@router.get("/status")
def get_lab_status():
    return lab_manager.get_status()


@router.get("/interfaces")
def get_interfaces():
    interfaces = available_interfaces()
    readiness = capture_readiness(interfaces)
    recommended = next(
        iter(readiness["usb_wireless_interfaces"] or readiness["wireless_interfaces"]),
        None,
    )
    if not recommended:
        recommended = next(
            (name for name in interfaces if name != "lo" and not name.startswith(("docker", "br-"))),
            interfaces[0] if interfaces else None,
        )
    return {
        "interfaces": interfaces,
        "recommended": recommended,
        **readiness,
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
