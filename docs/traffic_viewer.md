# Network Viewer (Traffic Viewer) — Feature Documentation

This document describes the **Network Viewer** feature added to EvilWifi Lab.
It shows what traffic is moving across the lab network, which web apps and
domains devices are contacting, and how much data is plaintext versus
encrypted.

## Purpose

The Network Viewer turns captured packet events into an readable dashboard
so learners can observe:

- **Which destinations** devices are contacting (domains, hosts, IPs).
- **Which web apps** are being searched or visited (via DNS queries, HTTP
  hosts, and TLS SNI).
- **How much data** is moving, and whether it is encrypted (TLS/HTTPS) or
  visible in plaintext (HTTP/DNS).
- **Protocol breakdown** (DNS, DHCP, HTTP, TLS, ARP).
- **Live traffic flows** in real time as packets are captured.

This strengthens the project's core lesson: **connecting to Wi-Fi does not
mean trusting the network.** An untrusted network can see where your device
is going and, for unencrypted traffic, what it is sending.

## How it works

### Backend (`backend/app/api/traffic.py`)

A new FastAPI router exposes `GET /api/traffic/summary`. It:

1. Queries the `events` table for traffic-related event types:
   `dns_query`, `http_request`, `tls_connection`, `dhcp_request`,
   `network_configuration`, `arp_request`.
2. Classifies each event using the existing `protocol_classifier` (reuse —
   no new capture logic).
3. Extracts the destination (`host`, `domain`, `sni`, or `ip` metadata).
4. Counts bytes when pyshark captured a packet length, otherwise counts 1
   per flow.
5. Returns:
   - `totals` — flow counts, encrypted vs visible split, total bytes.
   - `protocol_counts` — breakdown by protocol.
   - `category_counts` — breakdown by category (local discovery, name
     resolution, web, encrypted web, etc.).
   - `top_destinations` — the 10 most-contacted destinations.
   - `flows` — the most recent traffic flows with time, protocol,
     destination, encryption status, and byte count.

### Frontend (`frontend/src/pages/TrafficViewer.tsx`)

A new React page (`/traffic`) that:

- Calls `GET /api/traffic/summary` on load.
- Subscribes to the existing WebSocket (`/ws/events`) so the view updates
  live when new traffic events arrive.
- Renders stat cards (total flows, encrypted, visible, bytes).
- Shows protocol breakdown cards.
- Lists top destinations.
- Displays a table of recent traffic flows with time, protocol,
  destination, encrypted/visible badge, and bytes.
- Includes a plain-language "what this view means" explanation.

### Routing (`frontend/src/App.tsx`)

Added `<Route path="traffic" element={<TrafficViewer />} />` so the page is
reachable at `http://localhost:5173/traffic`.

### API service (`frontend/src/services/api.ts`)

Added `getTrafficSummary(limit = 500)` helper wrapping
`GET /api/traffic/summary`.

## How to run

1. Start the backend:
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:5173/traffic` in your browser.

4. Start a lab session from the Laboratory page, then generate test traffic
   (DNS lookups, HTTP/HTTPS requests) from an authorized test device. The
   Network Viewer will populate in real time.

## Safety and scope

- The viewer only shows **metadata** (destinations, protocols, byte counts).
  It does not display plaintext HTTP bodies, passwords, or captured payloads.
- Real credentials are never captured or stored anywhere in EvilWifi Lab —
  the captive portal only accepts synthetic `training-user` /
  `training-token`.
- Use only networks, adapters, and test devices you own or are explicitly
  authorized to test.
- Detections and traffic observations are **indicators, not verdicts**. A
  visible HTTP flow to a domain does not mean that domain is malicious.

## Future improvements

- PCAP import + replay so lessons run without live hardware.
- Per-device traffic breakdown (group flows by `device_id`).
- DNS visualization (query → response chain).
- Export traffic summary as CSV/JSON for lab reports.
- Real-time byte-rate graph instead of cumulative totals.
