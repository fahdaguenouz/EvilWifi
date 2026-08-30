class DetectionEngine:
    def __init__(self):
        self.is_active = False

    def start(self):
        self.is_active = True
        print("[DetectionEngine] Monitoring network for suspicious indicators.")

    def stop(self):
        self.is_active = False
        print("[DetectionEngine] Detection disabled.")

    def analyze_event(self, event_type: str, metadata: dict):
        # Stub for future implementation where real events are analyzed
        pass

detection_engine = DetectionEngine()
