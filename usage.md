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
The application features eight main sections:
- **Dashboard**: A high-level overview of the active lab, connected devices, and active alerts.
- **Laboratory**: The control center where you can configure and launch the network simulation.
- **Devices**: Authorized test devices observed during the current or recent lab session.
- **Events**: A real-time log of network traffic and simulated security events, featuring educational explanations.
- **Packet Lab**: Protocol classification, visibility analysis, and plain-language packet lessons.
- **Detections**: Defensive indicators, rule explanations, severity, and recommended responses.
- **Learn**: Short guided modules, workflow explanations, and private in-browser knowledge checks.
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

---

## USB Wi-Fi Adapter Readiness

The Laboratory page checks whether a wireless interface, TShark, and packet-capture permission are available.

When running inside VirtualBox:

1. Attach the USB Wi-Fi adapter to the guest from **Devices → USB** in the VirtualBox window.
2. Wait for a new interface such as `wlan0` or `wlx...` to appear in the Laboratory interface list.
3. If the adapter remains on the host, disconnect it from the host network manager and attach it to the guest again.
4. Ensure your user has permission to run `dumpcap`; on Debian-based systems this is commonly managed through the `wireshark` group, followed by signing out and back in.

Do not select or capture from networks and devices outside your authorized isolated lab.
