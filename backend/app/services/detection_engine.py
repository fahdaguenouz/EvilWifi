from dataclasses import asdict, dataclass
from threading import Lock
from typing import Any


DETECTION_RULES = [
    {
        "id": "duplicate_ssid",
        "title": "Duplicate SSID",
        "severity": "HIGH",
        "signal": "The same network name appears from multiple BSSIDs.",
        "meaning": "This can be normal in managed Wi-Fi, but it is also a common Evil Twin indicator.",
        "response": "Compare BSSIDs and verify the access point with the network owner.",
    },
    {
        "id": "unexpected_bssid",
        "title": "Unexpected BSSID",
        "severity": "HIGH",
        "signal": "A known SSID is advertised by an unrecognized radio address.",
        "meaning": "The network name alone does not prove access-point identity.",
        "response": "Do not connect until the BSSID is verified.",
    },
    {
        "id": "unexpected_gateway",
        "title": "Unexpected Gateway",
        "severity": "HIGH",
        "signal": "DHCP supplies a gateway different from the lab baseline.",
        "meaning": "The gateway controls where the device sends off-network traffic.",
        "response": "Disconnect and compare the assigned network configuration with the trusted baseline.",
    },
    {
        "id": "unexpected_dns_server",
        "title": "Unexpected DNS Server",
        "severity": "MEDIUM",
        "signal": "DHCP supplies an unrecognized DNS resolver.",
        "meaning": "A malicious resolver may return misleading destinations.",
        "response": "Verify the resolver and use encrypted DNS where appropriate.",
    },
    {
        "id": "suspicious_captive_portal",
        "title": "Unexpected Captive Portal",
        "severity": "MEDIUM",
        "signal": "A sign-in portal appears after joining the network.",
        "meaning": "A polished portal does not prove who controls it.",
        "response": "Never reuse a real password; verify the portal with the network owner.",
    },
    {
        "id": "unencrypted_http",
        "title": "Unencrypted HTTP",
        "severity": "MEDIUM",
        "signal": "A web request is sent without TLS protection.",
        "meaning": "Hosts, paths, and content may be visible or modified in transit.",
        "response": "Prefer HTTPS and do not send sensitive information over HTTP.",
    },
    {
        "id": "deauth_activity",
        "title": "Deauthentication Activity",
        "severity": "HIGH",
        "signal": "Deauthentication frames were observed on the channel.",
        "meaning": "Forged deauth frames are a classic Evil Twin and denial-of-service technique that pushes clients to reconnect.",
        "response": "Treat bursts as a strong attack indicator and prefer networks with 802.11w (Protected Management Frames).",
    },
    {
        "id": "open_network",
        "title": "Open (Unencrypted) Network",
        "severity": "LOW",
        "signal": "A beacon advertises a network with no wireless encryption.",
        "meaning": "Open networks give no link-layer protection, making interception and Evil Twin impersonation easier.",
        "response": "Avoid sending sensitive traffic; rely on HTTPS/VPN and prefer WPA2/WPA3 networks.",
    },
]

# Number of deauthentication frames that escalates the finding to a likely flood.
DEAUTH_FLOOD_THRESHOLD = 5


@dataclass(frozen=True)
class DetectionFinding:
    severity: str
    alert_type: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


class DetectionEngine:
    """Stateful defensive rules for one authorized laboratory session."""

    def __init__(self):
        self.is_active = False
        self.expected_ssid: str | None = None
        self.expected_bssid: str | None = None
        self.expected_gateway: str | None = None
        self.expected_dns: str | None = None
        self._observed_bssids: dict[str, set[str]] = {}
        self._emitted_keys: set[str] = set()
        self._deauth_count = 0
        self._lock = Lock()

    def start(
        self,
        *,
        expected_ssid: str,
        expected_bssid: str | None = None,
        expected_gateway: str | None = "10.10.10.1",
        expected_dns: str | None = "10.10.10.1",
    ):
        with self._lock:
            self.expected_ssid = expected_ssid
            self.expected_bssid = self._normalize_bssid(expected_bssid)
            self.expected_gateway = expected_gateway
            self.expected_dns = expected_dns
            self._observed_bssids.clear()
            self._emitted_keys.clear()
            self._deauth_count = 0
            self.is_active = True

    def stop(self):
        with self._lock:
            self.is_active = False
            self._observed_bssids.clear()
            self._emitted_keys.clear()
            self._deauth_count = 0

    def analyze_event(self, event_type: str, metadata: dict[str, Any]) -> list[dict[str, str]]:
        with self._lock:
            if not self.is_active:
                return []

            findings: list[DetectionFinding] = []
            if event_type == "access_point_observed":
                findings.extend(self._analyze_access_point(metadata))
            elif event_type in {"dhcp_offer", "network_configuration"}:
                findings.extend(self._analyze_network_configuration(metadata))
            elif event_type == "captive_portal_opened":
                finding = self._once(
                    "suspicious_captive_portal",
                    "MEDIUM",
                    "suspicious_captive_portal",
                    "An unexpected captive portal appeared. Verify the network operator before entering any information.",
                )
                if finding:
                    findings.append(finding)
            elif event_type == "http_request":
                host = str(metadata.get("host", "an unknown host"))
                finding = self._once(
                    f"unencrypted_http:{host}",
                    "MEDIUM",
                    "unencrypted_http",
                    f"Unencrypted HTTP traffic was observed for {host}; content and paths may be visible or modified in transit.",
                )
                if finding:
                    findings.append(finding)
            elif event_type == "deauth_frame":
                findings.extend(self._analyze_deauth(metadata))

            return [finding.to_dict() for finding in findings]

    def _analyze_access_point(self, metadata: dict[str, Any]) -> list[DetectionFinding]:
        ssid = str(metadata.get("ssid", ""))
        bssid = self._normalize_bssid(metadata.get("bssid"))
        if not ssid or not bssid or ssid != self.expected_ssid:
            return []

        bssids = self._observed_bssids.setdefault(ssid, set())
        bssids.add(bssid)
        findings: list[DetectionFinding] = []

        security = str(metadata.get("security", "")).lower()
        if security == "open":
            finding = self._once(
                f"open_network:{bssid}",
                "LOW",
                "open_network",
                f"SSID '{ssid}' (BSSID {bssid}) advertises an open, unencrypted network; "
                f"traffic has no link-layer protection and the name is trivial to impersonate.",
            )
            if finding:
                findings.append(finding)

        if self.expected_bssid and bssid != self.expected_bssid:
            finding = self._once(
                f"unexpected_bssid:{bssid}",
                "HIGH",
                "unexpected_bssid",
                f"SSID '{ssid}' was advertised by unexpected BSSID {bssid}. Treat this as an indicator, not proof, of an Evil Twin.",
            )
            if finding:
                findings.append(finding)

        if len(bssids) > 1:
            finding = self._once(
                f"duplicate_ssid:{ssid}",
                "HIGH",
                "duplicate_ssid",
                f"SSID '{ssid}' was observed from {len(bssids)} different BSSIDs. Compare the access points before connecting.",
            )
            if finding:
                findings.append(finding)

        return findings

    def _analyze_network_configuration(self, metadata: dict[str, Any]) -> list[DetectionFinding]:
        findings: list[DetectionFinding] = []
        gateway = metadata.get("gateway")
        dns_server = metadata.get("dns_server")

        if gateway and self.expected_gateway and gateway != self.expected_gateway:
            finding = self._once(
                f"unexpected_gateway:{gateway}",
                "HIGH",
                "unexpected_gateway",
                f"The device received gateway {gateway}, but the lab expected {self.expected_gateway}.",
            )
            if finding:
                findings.append(finding)

        if dns_server and self.expected_dns and dns_server != self.expected_dns:
            finding = self._once(
                f"unexpected_dns:{dns_server}",
                "MEDIUM",
                "unexpected_dns_server",
                f"The device received DNS server {dns_server}, but the lab expected {self.expected_dns}.",
            )
            if finding:
                findings.append(finding)

        return findings

    def _analyze_deauth(self, metadata: dict[str, Any]) -> list[DetectionFinding]:
        self._deauth_count += 1
        findings: list[DetectionFinding] = []
        target = metadata.get("to_mac") or "a client"
        bssid = metadata.get("bssid") or "an access point"

        first = self._once(
            "deauth_observed",
            "MEDIUM",
            "deauth_activity",
            f"A deauthentication frame was observed (from {bssid} toward {target}). "
            f"Deauth frames can forcibly disconnect clients and are often forged.",
        )
        if first:
            findings.append(first)

        if self._deauth_count >= DEAUTH_FLOOD_THRESHOLD:
            flood = self._once(
                "deauth_flood",
                "HIGH",
                "deauth_activity",
                f"{self._deauth_count} deauthentication frames were observed, consistent with a deauth flood "
                f"used to deny service or push clients onto an Evil Twin. Treat this as a strong attack indicator.",
            )
            if flood:
                findings.append(flood)

        return findings

    def _once(self, key: str, severity: str, alert_type: str, message: str) -> DetectionFinding | None:
        if key in self._emitted_keys:
            return None
        self._emitted_keys.add(key)
        return DetectionFinding(severity=severity, alert_type=alert_type, message=message)

    @staticmethod
    def _normalize_bssid(value: Any) -> str | None:
        return str(value).upper() if value else None


detection_engine = DetectionEngine()
