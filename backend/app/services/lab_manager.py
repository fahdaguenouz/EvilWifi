from enum import Enum
from app.services.ap_manager import AccessPointManager

class LabStatus(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"

class LabMode(str, Enum):
    NETWORK_LAB = "NETWORK_LAB"
    EVIL_TWIN = "EVIL_TWIN"

class LabManager:
    def __init__(self):
        self.status = LabStatus.STOPPED
        self.mode = LabMode.NETWORK_LAB
        self.ap_manager = AccessPointManager()

    def get_status(self) -> dict:
        return {
            "status": self.status,
            "mode": self.mode
        }

    def start(self, mode: LabMode, ssid: str = "FahdWiFi-Lab"):
        if self.status == LabStatus.RUNNING:
            return

        self.status = LabStatus.STARTING
        self.mode = mode

        # Start the access point
        self.ap_manager.start(ssid=ssid, mode=self.mode.value)

        self.status = LabStatus.RUNNING

    def stop(self):
        if self.status == LabStatus.STOPPED:
            return

        self.status = LabStatus.STOPPING

        self.ap_manager.stop()

        self.status = LabStatus.STOPPED

lab_manager = LabManager()