import time
import threading
import asyncio
from datetime import datetime
from app.core.database import SessionLocal
from app.models.event import Event
from app.models.device import Device
from app.models.session import Session
from app.websocket.events import manager
from app.services.packet_analyzer import PacketAnalyzer

class AccessPointManager:
    def __init__(self):
        self._is_running = False
        self.ssid = None
        self.interface = None
        self.mode = None
        self.session_id = None
        self.packet_analyzer = None

    def start(self, ssid: str, mode: str, interface: str = "eth0"):
        if self._is_running:
            return

        self.ssid = ssid
        self.mode = mode
        self.interface = interface
        self._is_running = True

        # Create a new session in DB
        db = SessionLocal()
        new_session = Session(ssid=ssid, interface=interface)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        self.session_id = new_session.id
        db.close()

        print(f"[APManager] Starting rogue AP on {interface} with SSID '{ssid}' (Mode: {mode})")

        # Start live packet analysis
        self.packet_analyzer = PacketAnalyzer(interface=self.interface, event_callback=self._handle_live_event)
        self.packet_analyzer.start()

        # Start Evil Twin simulation thread (for mock detection and captive portal logic)
        self._thread = threading.Thread(target=self._simulate_evil_twin_lifecycle, daemon=True)
        self._thread.start()

    def stop(self):
        if not self._is_running:
            return

        self._is_running = False
        print(f"[APManager] Stopping rogue AP on {self.interface}...")
        
        if self.packet_analyzer:
            self.packet_analyzer.stop()
        
        # End session
        if self.session_id:
            db = SessionLocal()
            session = db.query(Session).filter(Session.id == self.session_id).first()
            if session:
                session.ended_at = datetime.utcnow()
                db.commit()
            db.close()

        self.ssid = None
        self.interface = None
        self.mode = None
        self.session_id = None

    def status(self) -> str:
        return "running" if self._is_running else "stopped"

    def clients(self) -> int:
        return 0 if not self._is_running else 1 # Placeholder

    def _handle_live_event(self, event_type: str, metadata: dict):
        if not self._is_running:
            return
        # If there's an error starting the sniffer, broadcast it as an alert
        if event_type == "error":
            self._emit_alert("High", "sniffer_error", metadata.get("message", "Packet capture failed."))
            return
            
        self._emit_event(event_type, metadata)

    def _emit_event(self, event_type: str, metadata: dict, device_id: int = None):
        db = SessionLocal()
        new_event = Event(
            session_id=self.session_id,
            device_id=device_id,
            event_type=event_type,
            event_metadata=metadata,
            timestamp=datetime.utcnow()
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        event_dict = {
            "id": new_event.id,
            "session_id": new_event.session_id,
            "device_id": new_event.device_id,
            "event_type": new_event.event_type,
            "event_metadata": new_event.event_metadata,
            "timestamp": new_event.timestamp.isoformat()
        }
        db.close()

        # Broadcast via websocket
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(event_dict), loop)
        else:
            loop.run_until_complete(manager.broadcast(event_dict))
            
    def _emit_alert(self, severity: str, alert_type: str, message: str):
        from app.models.alert import Alert
        db = SessionLocal()
        new_alert = Alert(
            session_id=self.session_id,
            severity=severity,
            alert_type=alert_type,
            message=message,
            timestamp=datetime.utcnow()
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        alert_dict = {
            "id": new_alert.id,
            "severity": new_alert.severity,
            "alert_type": new_alert.alert_type,
            "message": new_alert.message,
            "timestamp": new_alert.timestamp.isoformat(),
            "is_alert": True
        }
        db.close()

        # Broadcast via websocket
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(alert_dict), loop)
        else:
            loop.run_until_complete(manager.broadcast(alert_dict))

    def _simulate_evil_twin_lifecycle(self):
        """Simulates specific Evil Twin events like detection and captive portal popping up, since they aren't generated by sniffing."""
        time.sleep(2)
        if not self._is_running: return
        
        if self.mode == "EVIL_TWIN":
            time.sleep(1)
            self._emit_alert("High", "multiple_bssid", f"Multiple access points advertising SSID '{self.ssid}'")
            time.sleep(2)
            if not self._is_running: return
            self._emit_event("captive_portal_opened", {"type": "Fake Coffee Shop Login"})
