import time
from scapy.all import AsyncSniffer
from scapy.layers.inet import TCP, UDP, IP
from scapy.layers.dns import DNS, DNSQR
from scapy.layers.dhcp import DHCP
import threading

class PacketAnalyzer:
    def __init__(self, interface: str, event_callback):
        self.interface = interface
        self.event_callback = event_callback
        self.sniffer = None
        self._is_running = False
        self._seen_cache = {}  # Rate limiting cache
        
    def start(self):
        if self._is_running: return
        self._is_running = True
        
        print(f"[PacketAnalyzer] Starting sniff on {self.interface}...")
        try:
            # We filter for DNS, DHCP, HTTP (80) and HTTPS (443)
            bpf_filter = "udp port 53 or udp port 67 or udp port 68 or tcp port 80 or tcp port 443"
            self.sniffer = AsyncSniffer(
                iface=self.interface, 
                filter=bpf_filter,
                prn=self._process_packet,
                store=False
            )
            self.sniffer.start()
        except (PermissionError, OSError) as e:
            print(f"[PacketAnalyzer] Permission denied: Scapy requires root (sudo) privileges to sniff packets! Error: {e}")
            self._is_running = False
            self.event_callback("error", {"message": f"Permission denied: {e}. Please run uvicorn with sudo."})
        except Exception as e:
            print(f"[PacketAnalyzer] Error starting sniffer: {e}")
            self._is_running = False

    def stop(self):
        if not self._is_running: return
        print(f"[PacketAnalyzer] Stopping sniffer on {self.interface}...")
        if self.sniffer:
            self.sniffer.stop()
            self.sniffer.join()
        self._is_running = False
        self._seen_cache.clear()
        
    def _rate_limit(self, key: str, window: int = 5) -> bool:
        """Returns True if the event should be processed, False if it is rate-limited."""
        now = time.time()
        if key in self._seen_cache and (now - self._seen_cache[key]) < window:
            return False
        self._seen_cache[key] = now
        return True

    def _process_packet(self, pkt):
        if not self._is_running: return
        
        # Parse DNS
        if pkt.haslayer(DNS) and pkt.haslayer(DNSQR):
            query = pkt[DNSQR].qname.decode("utf-8", errors="ignore").rstrip('.')
            if self._rate_limit(f"dns_{query}"):
                self.event_callback("dns_query", {"domain": query})
            return
            
        # Parse DHCP
        if pkt.haslayer(DHCP):
            options = pkt[DHCP].options
            req_ip = "Unknown"
            hostname = "Unknown"
            for opt in options:
                if isinstance(opt, tuple):
                    if opt[0] == 'requested_addr':
                        req_ip = opt[1]
                    elif opt[0] == 'hostname':
                        hostname = opt[1].decode("utf-8", errors="ignore")
            
            if self._rate_limit(f"dhcp_{hostname}_{req_ip}"):
                self.event_callback("dhcp_request", {"requested_ip": req_ip, "hostname": hostname})
            return
            
        # Parse TCP (HTTP / HTTPS)
        if pkt.haslayer(TCP) and pkt.haslayer(IP):
            dport = pkt[TCP].dport
            dst_ip = pkt[IP].dst
            
            if dport == 80:
                if self._rate_limit(f"http_{dst_ip}"):
                    self.event_callback("http_request", {"url": f"http://{dst_ip}"})
            elif dport == 443:
                if self._rate_limit(f"https_{dst_ip}"):
                    self.event_callback("tls_connection", {"sni": dst_ip, "version": "TLS"})
