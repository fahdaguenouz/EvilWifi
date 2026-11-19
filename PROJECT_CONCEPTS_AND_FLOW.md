# EvilWifi Lab — Concepts and Complete Workflow

This is the single reference for understanding what the project teaches, how its parts communicate, and how to run the learning workflow safely.

## 1. Purpose and boundary

EvilWifi Lab is an authorized Wi-Fi security education application. It helps a learner observe network behavior, recognize suspicious indicators, and choose defensive actions in an isolated lab.

The application is designed around four rules:

1. Use only networks, adapters, and test devices you own or are explicitly authorized to test.
2. Treat detections as indicators that require context, never automatic proof of an attack.
3. Use only the fixed `training-user` and `training-token` in the captive-portal lesson.
4. Do not collect real credentials or bypass HTTPS, certificate warnings, or device protections.

The project can passively analyze traffic visible to the selected interface, capture real 802.11 management frames in monitor mode, and stand up a **real isolated access point** (hostapd + dnsmasq) that an authorized test device joins. It still refuses the offensive half of these techniques: it does **not** exploit, deploy payloads to, open reverse shells on, or steal data from any connected device; it does not force devices to disconnect, inject deauthentication frames, or defeat wireless encryption. The real access point is **isolated by default** — no NAT, no internet uplink, no forwarding — and the captive portal only ever accepts the fixed synthetic training identity.

## 2. The central idea

An SSID is a displayed network name, not proof of identity.

```text
Test device
    │
    ▼
SSID shown in Wi-Fi menu
    │
    ├── BSSID identifies an access-point radio
    ├── Security mode describes wireless protection
    ├── DHCP supplies local configuration
    ├── Gateway receives off-network traffic
    └── DNS resolver translates names
```

When a device joins a network, it trusts more than a name. The network can influence local routing, DNS resolution, and captive-portal behavior. TLS/HTTPS still protects application content when certificate validation succeeds, although connection metadata can remain visible.

## 3. Architecture

```text
React/Vite interface (port 5173)
    │ REST requests                    ▲ WebSocket events
    ▼                                  │
FastAPI backend (port 8000) ───────────┘
    │
    ├── Lab manager: authorization and session lifecycle
    ├── Access-point manager: controlled simulation and event broadcasting
    ├── Packet analyzer: passive PyShark/TShark classification
    ├── Detection engine: stateful defensive rules and deduplication
    ├── Education service: four-part explanations and lesson modules
    ├── Session report: score, confidence, evidence, and recommendations
    └── SQLite: sessions, devices, events, and alerts
```

### Data records

- **Session**: SSID label, selected interface, start time, and end time.
- **Device**: an authorized test device associated with a session.
- **Event**: an observed or simulated action with non-sensitive metadata.
- **Alert**: a defensive finding with severity, type, message, and session.

### Lab modes

The Laboratory offers four modes:

| Mode | What it does | Needs |
|---|---|---|
| `NETWORK_LAB` | Passive L3 capture (DNS/DHCP/HTTP/TLS/ARP) of post-connection traffic | tshark capture on the interface |
| `EVIL_TWIN` | Simulated Evil Twin lifecycle plus the synthetic captive-portal lesson | nothing special (simulation) |
| `WIFI_MONITOR` | Real 802.11 management-frame capture (beacons, probes, auth/assoc, **deauth**) | a monitor-mode-capable interface |
| `REAL_AP` | A **real isolated access point** (hostapd + dnsmasq) an authorized test device joins, plus the synthetic captive portal | AP-capable adapter, hostapd + dnsmasq, backend running as root |

`WIFI_MONITOR` and `REAL_AP` degrade gracefully: if the hardware, driver, or privileges are missing, the lab still opens and reports a clear, non-fatal reason instead of crashing. The `REAL_AP` network is isolated by design — it gives a joined device a lab IP, lab gateway, and lab DNS, and nothing leaves the lab.

## 4. Core networking concepts

### Wireless identity

- **SSID**: the friendly network name. Multiple legitimate or suspicious access points may share it.
- **BSSID**: the address of an individual access-point radio. It is evidence, not proof by itself.
- **Association**: the link-layer step in which a device chooses and joins an access point.
- **Managed mode**: normal client operation. The detected MT7601U currently appears as `wlan0` in managed mode.
- **Monitor mode**: raw 802.11 observation. This project does not enable it automatically.

### Local network setup

- **DHCP**: supplies an IP address and may supply the gateway and DNS resolver.
- **ARP**: maps a local IPv4 address to a hardware address.
- **Default gateway**: receives traffic destined outside the local subnet.
- **DNS**: converts a domain name into an IP address. Traditional DNS queries may expose requested names.

### Web traffic

- **HTTP**: unencrypted application traffic; hosts, paths, headers, and content may be readable or modifiable on the path.
- **TLS/HTTPS**: encrypts application content and authenticates the service when certificates validate correctly.
- **Metadata**: IP addresses, timing, volume, and sometimes destination hints may remain visible even when content is encrypted.
- **Captive portal**: a page presented before network access. A convincing page does not prove who controls it.

## 5. Event pipeline

```text
Packet or safe simulation event
    ↓
Extract minimal metadata
    ↓
Classify protocol and visibility
    ↓
Attach educational explanation
    ↓
Store event in SQLite
    ↓
Run defensive detection rules
    ↓
Store any deduplicated alerts
    ↓
Broadcast event/alert over WebSocket
    ↓
Dashboard, Events, Packet Lab, Detections, and Review update
```

Historical events are enriched when read, so older records receive current protocol and educational explanations without rewriting the database.

## 6. Event concepts

| Event | Meaning | Main lesson |
|---|---|---|
| `device_discovered` | A test device became observable | Device presence and timing can be metadata |
| `wifi_association` | A device formed a wireless link | Association selects an access point to trust |
| `access_point_observed` | An AP identity was observed (real beacon or real AP) | SSID and BSSID require context |
| `probe_request` | A client searched for networks | Probe requests can leak remembered SSIDs |
| `probe_response` | An AP answered a probe | Any radio can answer for any SSID |
| `wifi_authentication` | The 802.11 auth exchange began | Open 802.11 auth proves no identity |
| `deauth_frame` | A deauthentication frame was seen | Classic Evil Twin / denial-of-service signal |
| `disassociation_frame` | A link teardown frame was seen | Often unprotected and forgeable |
| `arp_request` | A local IPv4 owner was requested | ARP reveals local relationships |
| `dhcp_request` | A device requested network settings | DHCP influences local trust |
| `network_configuration` | Gateway or DNS settings were supplied | Unexpected infrastructure deserves review |
| `dns_query` | A domain lookup occurred | Traditional DNS can reveal destinations |
| `http_request` | Plain web traffic occurred | HTTP content can be exposed or modified |
| `tls_connection` | An encrypted connection began | TLS protects content, not every metadata field |
| `captive_portal_opened` | The training portal appeared | Page appearance is not identity proof |
| `test_form_submitted` | Synthetic values were checked | The lesson works without retaining secrets |

Every event answers:

1. What happened?
2. Why does it matter?
3. What could an attacker learn?
4. How can a user protect themselves?

## 7. Detection concepts

The stateful detector compares current observations with the authorized session baseline. It suppresses repeated identical findings so one condition does not flood the learner.

Current rules cover:

- Duplicate SSID
- Unexpected BSSID
- Unexpected gateway
- Unexpected DNS server
- Unexpected captive portal
- Unencrypted HTTP
- Deauthentication activity (escalates to a likely flood on a burst)
- Open (unencrypted) network advertised in a beacon

Severity communicates review priority: `INFO`, `LOW`, `MEDIUM`, or `HIGH`. A high-severity alert is still an indicator, not a verdict.

## 8. Educational portal model

The portal demonstrates social-engineering risk without collecting credentials.

```text
Open safe training portal
    ↓
Permanent LAB ONLY warning
    ↓
Enter fixed synthetic identity
    ↓
Backend checks exact training values
    ↓
Store outcome and field names only
    ↓
Explain the warning signs
```

Realistic credentials are rejected and neither accepted nor rejected values are saved.

## 9. Session trust score

The Phase 8 score is a transparent teaching aid:

- Start at `100`.
- Subtract `15` for each distinct high-severity indicator.
- Subtract `8` for each distinct medium-severity indicator.
- Subtract `3` for each distinct low-severity indicator.
- Count a repeated alert type only once.
- Do not treat a capture-permission error as hostile network behavior.

**Evidence confidence** is separate from the score:

- **Limited**: capture failed or no classified packets were recorded.
- **Moderate**: some protocol categories were observed.
- **High**: at least four classified event types were observed without a capture failure.

A high score with limited confidence means “few indicators in incomplete evidence,” not “safe network.”

## 10. Complete user workflow

```text
1. Prepare an isolated lab and owned test device
    ↓
2. Attach the USB Wi-Fi adapter to the VM
    ↓
3. Confirm wlan0 + TShark + dumpcap permission
    ↓
4. Open Laboratory and choose the mode, SSID label, and interface
    ↓
5. Confirm authorization and start the session
    ↓
6. Generate only authorized test traffic
    ↓
7. Follow live Events and their four explanations
    ↓
8. Compare protocol visibility in Packet Lab
    ↓
9. Investigate defensive indicators in Detections
    ↓
10. Use the synthetic portal only in Evil Twin Simulation mode
    ↓
11. Complete the Learn modules and knowledge checks
    ↓
12. Stop the lab
    ↓
13. Open Session Review: score → confidence → findings → concepts → next steps
```

## 11. Interface map

- **Dashboard**: current status and guided journey.
- **Laboratory**: readiness, configuration, authorization, start, and stop.
- **Devices**: authorized devices observed during sessions.
- **Events**: live/historical timeline and four-part explanations.
- **Packet Lab**: protocol counts, encryption visibility, and packet lessons.
- **Detections**: rule catalog and observed indicators.
- **Network Viewer**: live traffic flows, destinations, protocol breakdown,
  and plaintext vs encrypted visibility.
- **Learn**: four modules, knowledge checks, and local progress.
- **Session Review**: end-to-end evidence summary and safe next steps.
- **Settings**: safety boundaries and supporting information.

## 12. API map

- `/api/health` — backend and safety-mode health.
- `/api/lab/*` — readiness, status, start, and stop.
- `/api/sessions/*` — session history.
- `/api/devices/*` — observed test devices.
- `/api/events/*` — enriched event history.
- `/api/analysis/*` — protocol catalog and aggregate analysis.
- `/api/alerts/*` — defensive findings and rule definitions.
- `/api/education/*` — event explanations and learning modules.
- `/api/portal/*` — safe training portal state and synthetic entry.
- `/api/traffic/summary` — aggregated traffic flows for the Network Viewer.
- `/api/reports/latest` — latest end-of-lab review.
- `/api/reports/{session_id}` — review for a selected session.
- `/ws/events` — live events and alerts.

## 13. USB capture readiness

For the current adapter, the expected path is:

```text
USB device 148f:7601
    ↓
Linux driver exposes wlan0
    ↓
User belongs to wireshark group
    ↓
Fresh login session receives that group
    ↓
dumpcap lists wlan0
    ↓
The app reports capture_permission=true
```

Adding a user to the `wireshark` group does not update already-running desktop sessions. Sign out and back in, or restart the VM, before retesting.

## 14. Phase history

1. Project foundation
2. Network laboratory and session lifecycle
3. Client and network observation
4. Safe educational captive portal
5. Packet classification and visibility analysis
6. Defensive detection engine
7. Educational explanations and learning modules
8. End-of-lab review and transparent trust score
9. Real 802.11 monitor capture (`WIFI_MONITOR`): beacon/probe/auth/assoc/deauth events, with deauth-activity and open-network detection rules and a `scripts/monitor_mode.sh` helper
10. Real isolated access point (`REAL_AP`): hostapd + dnsmasq AP for an authorized test device, synthetic captive portal, isolated-by-default (no NAT/uplink), with graceful fallback when hardware/privileges are missing

## 15. What we built most recently, and what is next

**Recently added (phases 9–10):**

- `WIFI_MONITOR` mode and 802.11 management-frame parsing in the packet analyzer, including new events (`probe_request`, `probe_response`, `wifi_authentication`, `deauth_frame`, `disassociation_frame`) with protocol profiles and four-part education.
- Detection rules `deauth_activity` (escalates to a likely flood) and `open_network`.
- `scripts/monitor_mode.sh` to enable/disable monitor mode on an interface.
- `REAL_AP` mode backed by `app/services/real_ap.py`: generates real hostapd/dnsmasq configs, brings up an isolated `10.10.10.0/24` lab network, serves the synthetic captive portal, and tears everything down cleanly. The backend reports real-AP readiness (`/api/lab/interfaces`).

**Hardware note:** live `WIFI_MONITOR` and `REAL_AP` need a capable USB adapter. A built-in Intel (iwlwifi) card and a Realtek RTL8188EUS on the stock `rtl8xxxu` driver were both unable to deliver management frames in testing; a dedicated monitor/injection adapter is the intended path.

**Planned next:**

- PCAP import + replay so lessons run with no live hardware.
- Live network topology visualization (device → AP → gateway → DNS).
- Channel hopping for monitor mode (see all APs, not one channel).
- Session comparison and report export.

**Deliberately out of scope (safety boundary):** exploiting connected devices, deploying payloads or reverse shells, harvesting real credentials or data, and deauthentication/injection attacks. This stays a defensive, educational lab.
