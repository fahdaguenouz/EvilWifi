import time
import threading
import asyncio
import pyshark

from app.services.protocol_classifier import enrich_event

class PacketAnalyzer:
    def __init__(self, interface: str, event_callback):
        self.interface = interface
        self.event_callback = event_callback
        self.capture = None
        self._is_running = False
        self._seen_cache = {}  # Rate limiting cache
        self._thread = None
        self._loop = None
        
    def start(self):
        if self._is_running: return
        self._is_running = True
        
        print(f"[PacketAnalyzer] Starting PyShark sniff on {self.interface}...")
        
        self._thread = threading.Thread(target=self._sniff_loop, daemon=True)
        self._thread.start()

    def _sniff_loop(self):
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

    def _emit_packet_event(self, event_type: str, metadata: dict):
        self.event_callback(event_type, enrich_event(event_type, metadata))
