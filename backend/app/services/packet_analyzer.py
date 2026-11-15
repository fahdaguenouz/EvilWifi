import time
import threading
import asyncio
import pyshark

from app.services.protocol_classifier import enrich_event

# IEEE 802.11 management-frame subtypes (within the management frame type).
# Values match Wireshark's wlan.fc.type_subtype field for management frames.
DOT11_MGMT_SUBTYPES = {
    0: "association_request",
    1: "association_response",
    2: "reassociation_request",
    3: "reassociation_response",
    4: "probe_request",
    5: "probe_response",
    8: "beacon",
    10: "disassociation",
    11: "authentication",
    12: "deauthentication",
}


class PacketAnalyzer:
    def __init__(self, interface: str, event_callback, monitor: bool = False):
        self.interface = interface
        self.event_callback = event_callback
        # monitor=True captures raw 802.11 management frames (beacons, probes,
        # auth/assoc, deauth). The interface must already be in monitor mode
        # (see scripts/monitor_mode.sh). monitor=False keeps the original
        # associated-client L3 capture (DNS/DHCP/HTTP/TLS/ARP).
        self.monitor = monitor
        self.capture = None
        self._is_running = False
        self._seen_cache = {}  # Rate limiting cache
        self._thread = None
        self._loop = None

    def start(self):
        if self._is_running: return
        self._is_running = True

        kind = "802.11 monitor" if self.monitor else "L3"
        print(f"[PacketAnalyzer] Starting PyShark {kind} sniff on {self.interface}...")

        self._thread = threading.Thread(target=self._sniff_loop, daemon=True)
        self._thread.start()

    def _sniff_loop(self):
        if self.monitor:
            # Only 802.11 management frames; the link type is already 802.11
            # because the interface is in monitor mode.
            bpf_filter = "type mgt"
        else:
            # We filter for DNS, DHCP, HTTP (80), HTTPS (443), ARP
            bpf_filter = "udp port 53 or udp port 67 or udp port 68 or tcp port 80 or tcp port 443 or arp"

        # We need a new event loop for the thread because pyshark uses asyncio
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        try:
            self.capture = pyshark.LiveCapture(interface=self.interface, bpf_filter=bpf_filter)
            for packet in self.capture.sniff_continuously():
                if not self._is_running:
                    break
                self._process_packet(packet)
        except Exception as e:
            if self._is_running:
                print(f"[PacketAnalyzer] Error running PyShark sniffer: {e}")
                self.event_callback("error", {"message": f"Packet capture failed: {e}. PyShark requires tshark and root privileges."})
        finally:
            self._is_running = False

    def stop(self):
        if not self._is_running: return
        print(f"[PacketAnalyzer] Stopping sniffer on {self.interface}...")
        self._is_running = False
        if self.capture:
            try:
                if self._loop and self._loop.is_running():
                    asyncio.run_coroutine_threadsafe(self._close_capture(), self._loop)
                else:
                    # In case the loop is already closed or not running
                    self._loop.run_until_complete(self._close_capture())
            except Exception as e:
                print(f"Error closing capture: {e}")
        self._seen_cache.clear()
        
    async def _close_capture(self):
        try:
            self.capture.close()
        except Exception:
            pass

    def _rate_limit(self, key: str, window: int = 5) -> bool:
        """Returns True if the event should be processed, False if it is rate-limited."""
        now = time.time()
        if key in self._seen_cache and (now - self._seen_cache[key]) < window:
            return False
        self._seen_cache[key] = now
        return True

    def _process_packet(self, pkt):
        if not self._is_running: return

        if self.monitor:
            self._process_dot11(pkt)
            return

        try:
            # Parse ARP
            if hasattr(pkt, 'arp'):
                opcode = getattr(pkt.arp, 'opcode', None)
                if opcode == '1': # request
                    ip_dst = getattr(pkt.arp, 'dst_proto_ipv4', 'Unknown')
                    mac_src = getattr(pkt.arp, 'src_hw_mac', 'Unknown')
                    if self._rate_limit(f"arp_{ip_dst}"):
                        self._emit_packet_event("arp_request", {"ip": ip_dst, "from_mac": mac_src})
                return

            # Parse DNS
            if hasattr(pkt, 'dns') and hasattr(pkt.dns, 'qry_name'):
                query = pkt.dns.qry_name
                if self._rate_limit(f"dns_{query}"):
                    self._emit_packet_event("dns_query", {"domain": query})
                return
                
            # Parse DHCP
            if hasattr(pkt, 'dhcp'):
                gateway = self._first_field(pkt.dhcp, "option_router", "option_router_address")
                dns_server = self._first_field(
                    pkt.dhcp,
                    "option_domain_name_server",
                    "option_domain_name_server_address",
                )
                if gateway or dns_server:
                    configuration = {}
                    if gateway:
                        configuration["gateway"] = gateway
                    if dns_server:
                        configuration["dns_server"] = dns_server
                    key = f"network_config_{gateway}_{dns_server}"
                    if self._rate_limit(key):
                        self._emit_packet_event("network_configuration", configuration)
                    return

                req_ip = getattr(pkt.dhcp, 'option_requested_ip_address', 'Unknown')
                hostname = getattr(pkt.dhcp, 'option_hostname', 'Unknown')
                
                if req_ip != 'Unknown' or hostname != 'Unknown':
                    if self._rate_limit(f"dhcp_{hostname}_{req_ip}"):
                        self._emit_packet_event("dhcp_request", {"requested_ip": req_ip, "hostname": hostname})
                return
                
            # Parse HTTP
            if hasattr(pkt, 'http'):
                host = getattr(pkt.http, 'host', 'Unknown')
                uri = getattr(pkt.http, 'request_uri', '/')
                if host != 'Unknown':
                    url = f"http://{host}{uri}"
                    if self._rate_limit(f"http_{url}"):
                        self._emit_packet_event("http_request", {"url": url, "host": host})
                return
                
            # Parse TLS (for SNI)
            if hasattr(pkt, 'tls'):
                # PyShark exposes the SNI if the packet is a ClientHello
                sni = getattr(pkt.tls, 'handshake_extensions_server_name', None)
                if sni:
                    if self._rate_limit(f"tls_{sni}"):
                        self._emit_packet_event("tls_connection", {"sni": sni, "version": "TLS"})
                else:
                    # Fallback to IP if no SNI
                    dst_ip = getattr(pkt.ip, 'dst', 'Unknown') if hasattr(pkt, 'ip') else 'Unknown'
                    if dst_ip != 'Unknown' and self._rate_limit(f"https_{dst_ip}"):
                        self._emit_packet_event("tls_connection", {"sni": dst_ip, "version": "TLS (No SNI)"})

        except Exception as e:
            # Silently drop packet parsing errors to keep the sniffer running
            pass

    def _process_dot11(self, pkt):
        """Parse a raw 802.11 management frame captured in monitor mode."""
        try:
            if not hasattr(pkt, 'wlan'):
                return

            wlan = pkt.wlan
            subtype = self._dot11_subtype(getattr(wlan, 'fc_type_subtype', None))
            frame = DOT11_MGMT_SUBTYPES.get(subtype)
            if frame is None:
                return

            sa = self._mac(getattr(wlan, 'sa', None) or getattr(wlan, 'ta', None))
            da = self._mac(getattr(wlan, 'da', None) or getattr(wlan, 'ra', None))
            bssid = self._mac(getattr(wlan, 'bssid', None))
            ssid = self._ssid(getattr(wlan, 'ssid', None))
            signal = self._signal(pkt)
            channel = self._channel(pkt)

            if frame == "beacon":
                # Real beacon -> feed the existing access-point detection path.
                key = f"beacon_{bssid}_{ssid}"
                if bssid and self._rate_limit(key, window=10):
                    self._emit_packet_event("access_point_observed", {
                        "ssid": ssid or "(hidden)",
                        "bssid": bssid,
                        "channel": channel,
                        "signal_dbm": signal,
                        "security": self._security(pkt),
                        "source": "beacon",
                    })
            elif frame == "probe_request":
                key = f"probe_req_{sa}_{ssid}"
                if sa and self._rate_limit(key):
                    self._emit_packet_event("probe_request", {
                        "from_mac": sa,
                        "requested_ssid": ssid or "(broadcast / any)",
                    })
            elif frame == "probe_response":
                key = f"probe_resp_{bssid}_{da}"
                if bssid and self._rate_limit(key):
                    self._emit_packet_event("probe_response", {
                        "bssid": bssid, "to_mac": da,
                        "ssid": ssid or "(hidden)",
                        "security": self._security(pkt),
                    })
            elif frame == "authentication":
                if sa and self._rate_limit(f"auth_{sa}_{bssid}"):
                    self._emit_packet_event("wifi_authentication", {
                        "from_mac": sa, "bssid": bssid,
                    })
            elif frame in ("association_request", "reassociation_request",
                           "association_response", "reassociation_response"):
                if (sa or bssid) and self._rate_limit(f"assoc_{sa}_{bssid}"):
                    self._emit_packet_event("wifi_association", {
                        "from_mac": sa, "bssid": bssid,
                        "ssid": ssid or None, "frame": frame,
                    })
            elif frame == "disassociation":
                if self._rate_limit(f"disassoc_{sa}_{da}"):
                    self._emit_packet_event("disassociation_frame", {
                        "from_mac": sa, "to_mac": da, "bssid": bssid,
                        "reason_code": getattr(getattr(pkt, 'wlan_mgt', None), 'fixed_reason_code', None),
                    })
            elif frame == "deauthentication":
                # Classic Evil Twin / DoS indicator - never rate-limited away,
                # a burst is exactly what the detection engine needs to see.
                self._emit_packet_event("deauth_frame", {
                    "from_mac": sa, "to_mac": da, "bssid": bssid,
                    "reason_code": getattr(getattr(pkt, 'wlan_mgt', None), 'fixed_reason_code', None),
                })

        except Exception:
            # Silently drop malformed frames to keep the sniffer alive.
            pass

    @staticmethod
    def _dot11_subtype(raw) -> int | None:
        if raw is None:
            return None
        text = str(raw).strip()
        try:
            return int(text, 0) if text.lower().startswith("0x") else int(text)
        except ValueError:
            return None

    @staticmethod
    def _mac(value):
        if not value or str(value).lower() in ("none", "unknown"):
            return None
        return str(value).upper()

    @staticmethod
    def _ssid(value):
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _signal(pkt):
        for layer_name, field in (("wlan_radio", "signal_dbm"), ("radiotap", "dbm_antsignal")):
            layer = getattr(pkt, layer_name, None)
            if layer is not None:
                value = getattr(layer, field, None)
                if value:
                    return str(value).split(",")[0].strip()
        return None

    @staticmethod
    def _channel(pkt):
        for layer_name, field in (("wlan_radio", "channel"), ("radiotap", "channel_freq")):
            layer = getattr(pkt, layer_name, None)
            if layer is not None:
                value = getattr(layer, field, None)
                if value:
                    return str(value).split(",")[0].strip()
        return None

    @staticmethod
    def _security(pkt):
        """Best-effort security mode from a beacon/probe-response."""
        mgt = getattr(pkt, 'wlan_mgt', None)
        wlan = getattr(pkt, 'wlan', None)
        if mgt is not None and getattr(mgt, 'rsn_version', None):
            return "WPA2/WPA3"
        if mgt is not None and getattr(mgt, 'wfa_ie_type', None):
            return "WPA"
        privacy = None
        if mgt is not None:
            privacy = getattr(mgt, 'fixed_capabilities_privacy', None)
        if privacy is None and wlan is not None:
            privacy = getattr(wlan, 'fixed_capabilities_privacy', None)
        if str(privacy) == "1":
            return "WEP (legacy)"
        return "Open"

    def _emit_packet_event(self, event_type: str, metadata: dict):
        self.event_callback(event_type, enrich_event(event_type, metadata))

    @staticmethod
    def _first_field(layer, *field_names):
        for field_name in field_names:
            value = getattr(layer, field_name, None)
            if value and value != "Unknown":
                return str(value).split(",")[0].strip()
        return None
