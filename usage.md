# EvilWifi Lab - Usage Guide

This document provides detailed instructions on how to set up, run, and interact with the EvilWifi laboratory simulator.

## 📋 Prerequisites

Before running the application, ensure you have the following installed on your machine:
- **Python 3.12+** (for the FastAPI backend)
- **Node.js 18+ and npm** (for the React/Vite frontend)
- **TShark** (the capture engine used by PyShark)
- Permission to capture traffic on the isolated lab interface you select
- A modern web browser (Chrome, Firefox, Safari)

---

## 🛠️ Installation & Setup

### 1. Backend Setup
The backend handles the simulation logic, database, and WebSocket broadcasting.

```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install the required dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup
The frontend provides the interactive dashboard and educational timeline.

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install the Node.js dependencies
npm install
```

---

## 🚀 Running the Application

You will need to run the backend and frontend simultaneously in separate terminals.

**Terminal 1: Start the Backend Server**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```
*The backend will start on http://localhost:8000.*

**Terminal 2: Start the Frontend Server**
```bash
cd frontend
npm run dev
```
*The frontend will start on http://localhost:5173 (or the port specified in your terminal output).*

---

## 💻 How to Use the Simulator

Open your web browser and navigate to `http://localhost:5173`. You will see the EvilWifi interface.

### Step 1: Navigating the Interface
The application features nine main sections:
- **Dashboard**: A high-level overview of the active lab, connected devices, and active alerts.
- **Laboratory**: The control center where you can configure and launch the network simulation.
- **Devices**: Authorized test devices observed during the current or recent lab session.
- **Events**: A real-time log of network traffic and simulated security events, featuring educational explanations.
- **Packet Lab**: Protocol classification, visibility analysis, and plain-language packet lessons.
- **Detections**: Defensive indicators, rule explanations, severity, and recommended responses.
- **Learn**: Short guided modules, workflow explanations, and private in-browser knowledge checks.
- **Session Review**: The latest session's trust score, evidence confidence, distinct findings, concepts, and next steps.
- **Settings**: Safety boundaries and links to the educational demonstrations.

### Step 2: Starting the Lab
1. Go to the **Laboratory** page.
2. Under "Configuration", select a Lab Mode:
   - **Network Lab Mode**: Simulates a legitimate AP. Use this to study standard Wi-Fi traffic (Association, DHCP, DNS).
   - **Evil Twin Simulation**: Simulates a rogue AP mimicking a legitimate network to study authentication attacks and detection mechanisms.
3. Enter the lab SSID label and choose the isolated **Capture Interface** carrying your test traffic. The interface list comes from the backend host; avoid `lo` unless you intentionally want to observe local-only service traffic.
4. Click the **Start Lab** button.
5. **Authorization Check**: You will be prompted with a strict authorization modal. You *must* click "I Understand and Am Authorized" to proceed. The lab will not start otherwise.

### Step 3: Observing Events
1. Once the lab is running, switch to the **Events** page.
2. Generate authorized traffic on the selected interface with a test device or local lab service.
3. You will see events populate in real-time, such as:
   - `device_discovered`
   - `wifi_association`
   - `dhcp_request`
   - `dns_query`
4. Read the four-part explanation below each event: what happened, why it matters, what an attacker could learn, and how to protect yourself.

### Step 4: Testing the Captive Portal
1. With the lab running in **Evil Twin Simulation Mode**, select **Open portal** from the Laboratory page.
2. Confirm the permanent **LAB ONLY** warning is visible.
3. Use only the displayed synthetic values: `training-user` and `training-token`.
4. Select **Enter test session**.
   - *Result*: The portal explains the warning signs of a convincing rogue portal and confirms that submitted values were not retained.
5. Open the **Events** page to review the `captive_portal_opened` and `test_form_submitted` events. Event metadata contains only the outcome and synthetic field names—not submitted values.

### Step 5: Analyzing Packets
1. Open **Packet Lab** from the sidebar.
2. Follow the three analysis stages: **Capture**, **Classify**, and **Explain**.
3. Review the protocol mix and recent packet lessons.
4. Compare the visible-event and encrypted-event counts.
5. Open a recent lesson to connect the observed detail with its security meaning.

The analysis currently classifies ARP, DHCP, DNS, HTTP, and TLS traffic. Plain HTTP and traditional DNS expose more information, while TLS protects content but can leave limited connection metadata visible.

### Step 6: Reviewing Detections
1. Open **Detections** from the sidebar.
2. Expand a rule to learn its signal, meaning, and recommended response.
3. Review observed indicators and their severity.
4. Treat each result as evidence to investigate—not automatic proof of an attack.

The current rules cover duplicate SSIDs, unexpected BSSIDs, gateways and DNS servers, unexpected captive portals, and unencrypted HTTP.

### Step 7: Completing the Learning Path
1. Open **Learn** from the sidebar.
2. Select a module and follow its numbered workflow.
3. Complete the knowledge check to mark the module finished.
4. Continue until the progress bar reaches 100%. Progress and answers remain in this browser.

### Step 8: Stopping the Lab
Return to the **Laboratory** page and click **Stop Lab** to halt the simulation and end the session.

### Step 9: Reviewing the Session
1. Open **Session Review** from the sidebar.
2. Read the trust score together with its evidence confidence.
3. Review each distinct finding and its point impact.
4. Expand the observed concepts and follow the recommended next steps.

A high score is not a guarantee of safety, especially when evidence confidence is limited.

---

## USB Wi-Fi Adapter Readiness

The Laboratory page checks whether a wireless interface, TShark, and packet-capture permission are available.

When running inside VirtualBox:

1. Attach the USB Wi-Fi adapter to the guest from **Devices → USB** in the VirtualBox window.
2. Wait for a new interface such as `wlan0` or `wlx...` to appear in the Laboratory interface list.
3. If the adapter remains on the host, disconnect it from the host network manager and attach it to the guest again.
4. Ensure your user has permission to run `dumpcap`; on Debian-based systems this is commonly managed through the `wireshark` group, followed by signing out and back in.

Do not select or capture from networks and devices outside your authorized isolated lab.

---

## Wi-Fi Monitor Mode (real 802.11 capture)

The **Wi-Fi Monitor** lab mode captures real 802.11 *management frames* — beacons,
probe requests/responses, authentication, association, and **deauthentication** —
instead of only post-connection L3 traffic. This is what turns the "wireless"
learning objectives (SSID/BSSID, probes, deauth, Evil Twin) from simulation into
observation.

### Prerequisites
1. `tshark` must be installed (the capture backend). On Debian/Ubuntu:
   ```bash
   sudo apt install -y tshark aircrack-ng iw wireless-tools
   # answer "Yes" to "allow non-superusers to capture"
   sudo usermod -aG wireshark $USER   # then log out and back in
   ```
2. A wireless interface placed in **monitor mode**.

### Enable monitor mode
Use the helper script (needs root):
```bash
sudo scripts/monitor_mode.sh start wlp0s20f3 6     # start on channel 6
sudo scripts/monitor_mode.sh status wlp0s20f3
sudo scripts/monitor_mode.sh stop  wlp0s20f3       # restore normal Wi-Fi
```

> **Single-adapter warning:** switching your only Wi-Fi card to monitor mode
> disconnects your internet for the session. A second (USB) adapter avoids this.
> Monitor mode also sees only **one channel at a time** — set it to your target
> access point's channel.

### Run a session
1. Open **Laboratory**, choose the **Wi-Fi Monitor** mode.
2. Select the monitor-mode interface and confirm authorization.
3. Start the session and watch real frames arrive in **Events**.
4. Detections fire from live data: duplicate SSID (same name, multiple BSSIDs),
   open/unencrypted networks, and deauthentication activity (a classic Evil Twin /
   denial-of-service indicator that escalates to HIGH on a burst).

Capture only in your own authorized, isolated lab.

---

## Real AP Mode (isolated hostapd + dnsmasq)

The **Real AP** lab mode stands up a *genuine* Wi-Fi access point your own test
device can join, so you can watch real DHCP, DNS, HTTP, and TLS behavior and the
synthetic captive portal end to end.

### Safety model
- The network is **isolated by default**: no NAT, no internet uplink, no packet
  forwarding. A joined device gets a lab IP (`10.10.10.0/24`), the lab gateway,
  and the lab DNS resolver — nothing leaves the lab.
- The captive portal only accepts the fixed synthetic `training-user` /
  `training-token`. It never collects or stores real credentials, and the lab
  performs **no exploitation** of connected devices.
- Connect only a device you own and are authorized to test.

### Prerequisites
```bash
sudo apt install -y hostapd dnsmasq
```
Plus an **AP-capable** wireless adapter (check `iw list` for `* AP` under
"Supported interface modes") and the backend running **as root** (real AP needs
privileged interface, hostapd, and dnsmasq control).

### Run a session
1. Open **Laboratory**, choose **Real AP**, select the AP-capable interface.
2. Confirm authorization and start the session.
3. On your test device, join the lab SSID and open any web page — the synthetic
   captive portal appears.
4. Watch real DHCP/DNS/HTTP events and detections stream into **Events** and
   **Detections**.

If hostapd/dnsmasq, an AP-capable adapter, or root privileges are missing, the
lab still opens and reports a clear, non-fatal reason instead of a live AP.
