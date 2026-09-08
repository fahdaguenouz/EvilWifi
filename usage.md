# EvilWifi Lab - Usage Guide

This document provides detailed instructions on how to set up, run, and interact with the EvilWifi laboratory simulator.

## 📋 Prerequisites

Before running the application, ensure you have the following installed on your machine:
- **Python 3.12+** (for the FastAPI backend)
- **Node.js 18+ and npm** (for the React/Vite frontend)
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
The application features a sidebar with three main sections:
- **Dashboard**: A high-level overview of the active lab, connected devices, and active alerts.
- **Laboratory**: The control center where you can configure and launch the network simulation.
- **Events**: A real-time log of network traffic and simulated security events, featuring educational explanations.
- **Settings**: Configuration options and testing forms (like the Captive Portal Simulator).

### Step 2: Starting the Lab
1. Go to the **Laboratory** page.
2. Under "Configuration", select a Lab Mode:
   - **Network Lab Mode**: Simulates a legitimate AP. Use this to study standard Wi-Fi traffic (Association, DHCP, DNS).
   - **Evil Twin Simulation**: Simulates a rogue AP mimicking a legitimate network to study authentication attacks and detection mechanisms.
3. Click the **Start Lab** button.
4. **Authorization Check**: You will be prompted with a strict authorization modal. You *must* click "I Understand and Am Authorized" to proceed. The lab will not start otherwise.

### Step 3: Observing Events
1. Once the lab is running, switch to the **Events** page.
2. The simulation will automatically generate network traffic, simulating a test device connecting to the AP.
3. You will see events populate in real-time, such as:
   - `device_discovered`
   - `wifi_association`
   - `dhcp_request`
   - `dns_query`
4. Read the **Educational Context** below each event to understand what is happening at a networking level.

### Step 4: Testing the Captive Portal
1. With the lab running in **Evil Twin Simulation Mode**, select **Open portal** from the Laboratory page.
2. Confirm the permanent **LAB ONLY** warning is visible.
3. Use only the displayed synthetic values: `training-user` and `training-token`.
4. Select **Enter test session**.
   - *Result*: The portal explains the warning signs of a convincing rogue portal and confirms that submitted values were not retained.
5. Open the **Events** page to review the `captive_portal_opened` and `test_form_submitted` events. Event metadata contains only the outcome and synthetic field names—not submitted values.

### Step 5: Stopping the Lab
Return to the **Laboratory** page and click **Stop Lab** to halt the simulation and end the session.

