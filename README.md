# 📡 EvilWifi Lab

### A Controlled Wi-Fi Evil-Twin & Man-in-the-Middle Security Simulator

> **Educational cybersecurity project for authorized laboratory environments only.**

EvilWifi Lab is a cybersecurity education platform designed to demonstrate how rogue Wi-Fi networks, Evil Twin attacks, captive portals, and local network interception work.

The project creates a **controlled, isolated Wi-Fi laboratory** where students can connect a test device to a simulated rogue access point and observe what happens at the networking layers.

The objective is **not to steal credentials**.

Instead, the simulator uses deliberately fake credentials, synthetic traffic, and test devices to demonstrate why connecting to an untrusted Wi-Fi network can be dangerous.

---

# 📖 Table of Contents

* [Project Motivation](#-project-motivation)
* [Learning Objectives](#-learning-objectives)
* [What Is an Evil Twin](#-what-is-an-evil-twin)
* [What The Simulator Demonstrates](#-what-the-simulator-demonstrates)
* [Safety Model](#-safety-model)
* [Project Architecture](#-project-architecture)
* [Technology Stack](#-technology-stack)
* [Repository Structure](#-repository-structure)
* [Network Architecture](#-network-architecture)
* [Core Components](#-core-components)
* [Application Workflow](#-application-workflow)
* [Dashboard](#-dashboard)
* [Traffic Laboratory](#-traffic-laboratory)
* [Captive Portal](#-captive-portal)
* [Packet Analysis](#-packet-analysis)
* [Detection Module](#-detection-module)
* [Implementation Roadmap](#-implementation-roadmap)
* [Phase 1](#phase-1---project-foundation)
* [Phase 2](#phase-2---laboratory-network)
* [Phase 3](#phase-3---client-observation)
* [Phase 4](#phase-4---captive-portal)
* [Phase 5](#phase-5---traffic-analysis)
* [Phase 6](#phase-6---detection)
* [Phase 7](#phase-7---educational-mode)
* [Testing](#-testing)
* [Security Requirements](#-security-requirements)
* [Learning Topics](#-learning-topics)
* [Future Improvements](#-future-improvements)
* [Conclusion](#-conclusion)

---

# 🎯 Project Motivation

Most people think:

> "If the Wi-Fi has the same name as the network I normally use, it must be the same network."

That assumption is dangerous.

A Wi-Fi network name, known as an **SSID**, is not itself proof of identity.

For example:

```text
REAL NETWORK

SSID: CoffeeShop_WiFi
Gateway: 192.168.10.1
BSSID: AA:BB:CC:11:22:33
```

An attacker can create another network broadcasting:

```text
ROGUE NETWORK

SSID: CoffeeShop_WiFi
Gateway: 10.10.10.1
BSSID: DD:EE:FF:44:55:66
```

Both networks can appear as:

```text
CoffeeShop_WiFi
```

on the victim's phone.

The goal of this project is to make that concept observable rather than theoretical.

---

# 🧠 Learning Objectives

After completing this project, the student should understand:

### Wireless

* SSID
* BSSID
* Access Points
* Wireless clients
* 802.11 management frames
* Beacon frames
* Probe requests
* Probe responses
* Authentication
* Association
* Deauthentication concept
* WPA2/WPA3 concepts
* Open networks
* Rogue access points
* Evil Twin attacks

### Networking

* Ethernet
* ARP
* IPv4
* DHCP
* DNS
* TCP
* UDP
* HTTP
* HTTPS
* NAT
* Default gateways
* Routing

### Security

* Man-in-the-Middle attacks
* Rogue Access Points
* Captive portals
* Credential phishing
* Traffic interception
* TLS
* Certificate validation
* Network monitoring
* Rogue AP detection

### Defensive Security

* Detecting suspicious SSIDs
* Comparing BSSID information
* Monitoring signal changes
* Detecting unexpected gateways
* Detecting DNS anomalies
* Detecting captive portals
* Understanding HTTPS protection
* Understanding VPN protection
* Understanding WPA2/WPA3 authentication

---

# 👿 What Is an Evil Twin?

An Evil Twin is a rogue wireless network designed to impersonate a legitimate network.

Conceptually:

```text
             LEGITIMATE NETWORK

             ┌─────────────────┐
             │ Real Access     │
             │ Point           │
             │                 │
             │ CoffeeShop_WiFi │
             └────────┬────────┘
                      │
                      │
                  Internet
                      │


              ROGUE NETWORK

             ┌─────────────────┐
             │ Rogue Access    │
             │ Point           │
             │                 │
             │ CoffeeShop_WiFi │
             └────────┬────────┘
                      │
                    Victim
```

The important concept is:

```text
SSID ≠ Identity
```

The same SSID can be advertised by completely different access points.

---

# 🧪 What This Project Demonstrates

The laboratory will simulate the following scenario:

```text
                 ┌─────────────────────┐
                 │     EvilWifi        │
                 │     Controller      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Controlled AP       │
                 │                     │
                 │ SSID: LabWiFi       │
                 └──────────┬──────────┘
                            │
                            │ Wi-Fi
                            ▼
                     ┌─────────────┐
                     │ Test Device │
                     └──────┬──────┘
                            │
                            ▼
                       Lab Gateway
                            │
                            ▼
                       Lab Services
```

The student can observe:

1. Client discovers SSID.
2. Client associates with AP.
3. Client receives an IP address.
4. Client receives a gateway.
5. Client performs DNS queries.
6. Client accesses a test web application.
7. Dashboard observes network events.
8. Simulator explains what could happen on an untrusted network.
9. Detection engine analyzes the environment.

---

# 🚨 Safety Model

This project intentionally does **not** implement real credential harvesting.

The laboratory must enforce:

```text
REAL PASSWORDS
      ❌

REAL LOGIN CREDENTIALS
      ❌

REAL THIRD-PARTY NETWORKS
      ❌

REAL VICTIMS
      ❌

TEST DEVICES
      ✅

LAB SSIDs
      ✅

FAKE CREDENTIALS
      ✅

SYNTHETIC TRAFFIC
      ✅

ISOLATED NETWORK
      ✅
```

The captive portal should therefore never ask users to enter their real Wi-Fi password.

Instead:

```text
Username:
student

Password:
training-password
```

The application should explicitly display:

> "LAB ONLY — Never enter a real password."

The backend should reject known patterns that look like real credentials and should avoid persistent storage of submitted passwords entirely.

---

# 🏗 Project Architecture

The application will use a modular architecture.

```text
                    ┌──────────────────────┐
                    │      Web Dashboard   │
                    │      React / TS      │
                    └──────────┬───────────┘
                               │
                         REST / WebSocket
                               │
                    ┌──────────▼───────────┐
                    │     FastAPI API      │
                    │       Python         │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
   ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
   │ AP Manager  │     │ Traffic      │     │ Detection    │
   │             │     │ Analyzer     │     │ Engine       │
   └─────────────┘     └──────────────┘     └──────────────┘
          │                    │                     │
          └────────────────────┼─────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ Controlled Lab     │
                    │ Network            │
                    └────────────────────┘
```

---

# 🛠 Technology Stack

## Backend

Use:

### Python

Python is the recommended language because it provides excellent networking and cybersecurity libraries.

Recommended stack:

```text
Python 3.12+
FastAPI
Uvicorn
Pydantic
SQLite
SQLAlchemy
WebSockets
Scapy
PyShark
```

### Why Python?

Python makes it easy to work with:

* network interfaces
* packets
* sockets
* HTTP
* DNS
* DHCP concepts
* packet analysis
* APIs
* automation
* security tooling

---

# 🌐 Frontend

Recommended:

```text
React
TypeScript
Vite
Tailwind CSS
WebSocket
```

The frontend provides the visualization layer.

Example:

```text
┌──────────────────────────────────────────────┐
│ EvilWifi Lab                                 │
├──────────────────────────────────────────────┤
│                                              │
│ LAB STATUS                                   │
│                                              │
│ ● AP ACTIVE                                  │
│                                              │
│ SSID             LabWiFi                     │
│ Clients          2                           │
│ Gateway          10.10.10.1                  │
│ DNS              Lab DNS                     │
│                                              │
├──────────────────────────────────────────────┤
│ CLIENTS                                      │
│                                              │
│ Device       IP             Events            │
│ Android      10.10.10.20   14                │
│ Laptop       10.10.10.21   8                 │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 💾 Database

Use SQLite for the first version.

Store:

```text
Lab Sessions
Devices
Network Events
DNS Events
HTTP Test Events
Detection Alerts
Educational Events
```

Do NOT store:

```text
Passwords
Authentication tokens
Real credentials
Private messages
Sensitive user content
```

Example database:

```text
sessions
──────────────
id
started_at
ended_at
ssid
interface

devices
──────────────
id
session_id
mac_hash
ip
first_seen
last_seen

events
──────────────
id
session_id
device_id
event_type
timestamp
metadata

alerts
──────────────
id
session_id
severity
type
message
timestamp
```

For privacy, MAC addresses should preferably be hashed before persistence.

---

# 📁 Repository Structure

Recommended monorepo:

```text
wifitwin-lab/
│
├── README.md
├── LICENSE
├── .gitignore
├── docker-compose.yml
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── sessions.py
│   │   │   ├── devices.py
│   │   │   ├── events.py
│   │   │   └── alerts.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   │
│   │   ├── models/
│   │   │   ├── session.py
│   │   │   ├── device.py
│   │   │   └── event.py
│   │   │
│   │   ├── services/
│   │   │   ├── ap_manager.py
│   │   │   ├── network_monitor.py
│   │   │   ├── packet_analyzer.py
│   │   │   ├── dns_monitor.py
│   │   │   └── detection_engine.py
│   │   │
│   │   └── websocket/
│   │       └── events.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   └── package.json
│
├── lab/
│   ├── configs/
│   ├── scripts/
│   └── documentation/
│
├── docs/
│   ├── architecture.md
│   ├── networking.md
│   ├── evil-twin.md
│   ├── packet-analysis.md
│   └── defense.md
│
└── screenshots/
```

---

# 🌐 Network Architecture

The most important part of this project is understanding the network.

Do not begin by trying to build an Internet-connected rogue AP.

Start with an **isolated laboratory network**.

Conceptually:

```text
             ┌────────────────────────┐
             │      Test Laptop       │
             │                        │
             │   EvilWifi Controller   │
             └───────────┬────────────┘
                         │
                     Lab Wi-Fi
                         │
             ┌───────────▼────────────┐
             │     Test Smartphone    │
             └────────────────────────┘
```

The laboratory should initially have:

```text
Internet
   │
   X
   │
LAB NETWORK
```

The `X` is intentional.

This prevents accidental interaction with external networks.

---

# 🔬 Core Components

## 1. AP Manager

Responsible for managing the laboratory access point.

Responsibilities:

```text
Start laboratory AP
Stop laboratory AP
Configure laboratory SSID
Monitor AP state
Report connected clients
```

The AP manager should expose an abstraction such as:

```python
class AccessPointManager:

    def start(self):
        ...

    def stop(self):
        ...

    def status(self):
        ...

    def clients(self):
        ...
```

The implementation should be isolated from the rest of the application.

This allows you to replace the underlying AP technology later.

---

# 2. Network Monitor

Responsible for observing:

```text
DHCP
ARP
DNS
TCP
HTTP
connection events
```

Example event:

```json
{
  "type": "device_connected",
  "timestamp": "2026-08-30T15:00:00Z",
  "ip": "10.10.10.20"
}
```

---

# 3. Packet Analyzer

Use packet analysis to understand what is happening rather than attempting to collect sensitive information.

The analyzer can classify:

```text
ARP
DNS
DHCP
TCP
UDP
HTTP
TLS
```

Example:

```text
DEVICE
  │
  ├── DHCP Discover
  │
  ├── DHCP Request
  │
  ├── DNS Query
  │
  ├── TCP Connection
  │
  └── HTTPS Connection
```

The dashboard could display this as a timeline.

---

# 4. Captive Portal

The captive portal is an educational simulation.

Example:

```text
┌────────────────────────────────────┐
│          Coffee Wi-Fi              │
│                                    │
│     Welcome to Free Wi-Fi          │
│                                    │
│     ⚠ SECURITY TRAINING LAB        │
│                                    │
│  This is a simulated network.      │
│  Never enter real credentials.     │
│                                    │
│  [ Enter Test Session ]            │
│                                    │
└────────────────────────────────────┘
```

The portal should use a test-only session mechanism.

For example:

```text
TEST-USER-001
```

rather than collecting:

```text
real@gmail.com
real-password
```

The purpose is to demonstrate how easily a user can be presented with a convincing login interface.

---

# 5. Event Engine

Every interesting network event should become an event.

Example:

```text
CLIENT_CONNECTED
DHCP_ASSIGNED
DNS_QUERY
HTTP_REQUEST
HTTPS_CONNECTION
CAPTIVE_PORTAL_OPENED
TEST_FORM_SUBMITTED
SECURITY_WARNING
```

Example event:

```json
{
    "type": "dns_query",
    "device": "LAB-DEVICE-01",
    "domain": "example.test",
    "timestamp": "2026-08-30T15:12:31Z"
}
```

---

# 📊 Dashboard

The dashboard should be the main educational interface.

## Overview

Display:

```text
AP Status
SSID
BSSID
Channel
Connected Clients
Gateway
DNS
Lab Duration
```

---

# 👥 Client View

Example:

```text
CLIENTS

┌──────────────┬──────────────┬───────────────┐
│ Device       │ IP           │ Status        │
├──────────────┼──────────────┼───────────────┤
│ Android      │ 10.10.10.20  │ Connected     │
│ Laptop       │ 10.10.10.21  │ Connected     │
└──────────────┴──────────────┴───────────────┘
```

Clicking a device should show:

```text
Connection timeline

15:10:01  Associated
15:10:02  DHCP
15:10:03  DNS query
15:10:05  HTTP test request
15:10:07  HTTPS connection
```

---

# 📦 Packet Timeline

Instead of dumping raw packets onto the screen, provide a simplified visualization.

```text
15:10:01
     │
     ├── Wi-Fi Association
     │
15:10:02
     │
     ├── DHCP
     │
15:10:03
     │
     ├── DNS
     │
15:10:04
     │
     ├── TCP
     │
15:10:05
     │
     └── HTTPS
```

This makes the networking concepts much easier to teach.

---

# 🕵️ Detection Engine

The defensive component is one of the most important parts of the project.

The system should attempt to identify suspicious networks.

Possible indicators:

### Same SSID / Different BSSID

```text
SSID:
CoffeeShop_WiFi

BSSID #1:
AA:AA:AA:AA:AA:01

BSSID #2:
BB:BB:BB:BB:BB:02
```

The dashboard can report:

```text
⚠ POSSIBLE ROGUE ACCESS POINT

Multiple access points advertise the same SSID.
```

---

# 📡 Signal-Based Detection

A client may observe:

```text
CoffeeShop_WiFi
RSSI: -35 dBm
```

while another AP advertises:

```text
CoffeeShop_WiFi
RSSI: -60 dBm
```

The stronger signal does not prove malicious activity.

Therefore the application should say:

```text
Potential indicator
```

rather than:

```text
Attack confirmed
```

This teaches students the difference between:

```text
Indicator
```

and:

```text
Proof
```

---

# 🔐 HTTPS Demonstration

The simulator should explicitly demonstrate the difference between HTTP and HTTPS.

Example:

```text
HTTP

Client
  │
  │ "username=student"
  ▼
Network
```

The data may be visible to a network observer.

With HTTPS:

```text
Client
  │
  │ encrypted TLS data
  ▼
Network
```

The network observer can still see metadata such as:

```text
IP addresses
connection timing
packet sizes
destination information
```

but not simply read the encrypted application contents.

This is a critical concept for the presentation.

---

# 🔒 WPA2/WPA3 Demonstration

The project should also teach an important misconception:

> "HTTPS protects me, so Wi-Fi security doesn't matter."

That's incomplete.

Wi-Fi security protects the wireless link and helps establish network authenticity/security, while TLS protects application-layer communications.

Students should learn the layered model:

```text
Application
     │
    TLS
     │
    TCP
     │
    IP
     │
    Wi-Fi
```

Different security mechanisms protect different layers.

---

# 🧪 Laboratory Scenario

Create a scenario called:

```text
Scenario 01 — Coffee Shop
```

The laboratory contains:

```text
LEGITIMATE AP
SSID: CoffeeShop-Lab
```

and a simulated rogue AP:

```text
LAB ROGUE AP
SSID: CoffeeShop-Lab
```

The test phone sees:

```text
CoffeeShop-Lab
CoffeeShop-Lab
```

The student must investigate:

```text
Which AP is legitimate?

What is the BSSID?

What gateway was assigned?

Which DNS server is being used?

Is a captive portal appearing?

Is the traffic encrypted?

```

---

# 🎓 Educational Mode

Add an optional teaching mode.

When enabled, the dashboard explains events automatically.

Example:

```text
EVENT DETECTED

DHCP REQUEST

What happened?

Your device requested network configuration.

The DHCP server normally provides:

• IP address
• Gateway
• DNS server
• Network configuration

Why is this important?

The gateway becomes the path through which
your device sends traffic to other networks.
```

This transforms the project from a hacking tool into a networking learning platform.

---

# 🧩 Attack Simulation Mode

The simulator can present the conceptual attack chain:

```text
1. Rogue AP appears
        ↓
2. Client connects
        ↓
3. DHCP configuration
        ↓
4. Client uses lab gateway
        ↓
5. DNS requests observed
        ↓
6. Test website accessed
        ↓
7. Educational warning displayed
        ↓
8. Detection engine analyzes network
```

Each step should be visible in the dashboard.

---

# 🔎 What The Student Should Learn

The most important lesson is:

```text
Connecting to Wi-Fi
        ≠
Trusting the network
```

A network can provide connectivity while still being untrusted.

Therefore:

```text
Wi-Fi connection
       ↓
Network trust decision
       ↓
Application security
       ↓
HTTPS/TLS
       ↓
Authentication
```

---

# 🧑‍💻 Backend API

The FastAPI backend can expose endpoints such as:

```text
GET  /api/lab/status
POST /api/lab/start
POST /api/lab/stop

GET  /api/devices
GET  /api/devices/{id}

GET  /api/events
GET  /api/events/{id}

GET  /api/alerts

GET  /api/network
GET  /api/network/dns

GET  /api/education/{topic}
```

WebSocket:

```text
/ws/events
```

The WebSocket broadcasts real-time laboratory events.

---

# 🔄 Real-Time Architecture

```text
                  Network Event
                       │
                       ▼
                Event Collector
                       │
                       ▼
                Event Processor
                       │
              ┌────────┴─────────┐
              │                  │
              ▼                  ▼
          Database           WebSocket
                                 │
                                 ▼
                            React Dashboard
```

This means the dashboard doesn't need to continuously poll the backend.

---

# 🧪 Testing Strategy

Create three testing layers.

## Unit Tests

Test:

```text
Event parser
Detection rules
Database models
API endpoints
Session management
```

Example:

```text
test_same_ssid_multiple_bssid()
test_dns_event_parser()
test_client_event_creation()
```

---

# Integration Tests

Test:

```text
Network monitor
      ↓
Event processor
      ↓
Database
      ↓
API
      ↓
Dashboard
```

---

# Laboratory Tests

Use:

```text
Test laptop
Test Android phone
Isolated wireless adapter
```

Never use:

```text
Office Wi-Fi
School Wi-Fi
Public Wi-Fi
Neighbor Wi-Fi
Unknown devices
```

---

# 🛡 Security Requirements

The project itself should be designed securely.

## Requirement 1 — Lab-only mode

Every session should explicitly identify itself as:

```text
LAB MODE
```

---

## Requirement 2 — No credential storage

The application must never persist submitted passwords.

Instead:

```python
password = request.form(...)
```

should be immediately discarded after demonstrating the event.

Better still, don't accept a password field at all.

Use:

```text
TEST TOKEN
```

---

## Requirement 3 — Network isolation

The default configuration should prevent forwarding traffic to external networks.

---

## Requirement 4 — Explicit confirmation

Before starting a laboratory session:

```text
┌─────────────────────────────────────┐
│ START SECURITY LAB                  │
│                                     │
│ This laboratory is isolated.        │
│ Only authorized test devices may   │
│ connect.                            │
│                                     │
│ [ I UNDERSTAND ]                    │
└─────────────────────────────────────┘
```

---

# 📚 Recommended Learning Order

Don't start by writing the Wi-Fi portion.

Learn the network stack first.

## Step 1

Learn:

```text
OSI Model
TCP/IP Model
```

---

## Step 2

Learn:

```text
Ethernet
MAC addresses
ARP
IPv4
```

---

## Step 3

Learn:

```text
DHCP
DNS
```

---

## Step 4

Learn:

```text
TCP
UDP
HTTP
HTTPS
TLS
```

---

## Step 5

Learn wireless:

```text
802.11
SSID
BSSID
Channels
Beacon
Probe
Association
Authentication
WPA2
WPA3
```

---

## Step 6

Learn packet analysis:

```text
Wireshark
tcpdump
Scapy
```

---

## Step 7

Build the simulator.

---

# 🚀 Implementation Roadmap

## Phase 1 — Project Foundation

Create:

```text
backend/
frontend/
docs/
lab/
tests/
```

Implement:

```text
FastAPI
React
SQLite
WebSocket
```

Goal:

```text
Dashboard opens
        ↓
Backend responds
        ↓
WebSocket works
```

---

# Phase 2 — Network Laboratory

Create a controlled lab network.

Implement:

```text
AP Manager
Network configuration
Client detection
Session lifecycle
```

Goal:

```text
Start Lab
    ↓
AP appears
    ↓
Test device connects
    ↓
Dashboard detects client
```

---

# Phase 3 — Network Observation

Implement:

```text
DHCP monitoring
ARP monitoring
DNS monitoring
TCP connection monitoring
```

Dashboard:

```text
CLIENT
   ↓
DHCP
   ↓
DNS
   ↓
TCP
```

---

# Phase 4 — Educational Captive Portal

Build a fake training portal.

Important:

```text
NO REAL PASSWORDS
```

Use:

```text
training-user
training-token
```

The goal is to demonstrate:

```text
How convincing a rogue portal can look
```

not:

```text
How to steal credentials
```

---

# Phase 5 — Packet Analysis

Add:

```text
Scapy
PyShark
```

Build protocol classification.

Example:

```text
DHCP
DNS
ARP
TCP
TLS
HTTP
```

---

# Phase 6 — Detection Engine

Implement rules:

```text
Duplicate SSID
Unexpected BSSID
Unexpected gateway
Unexpected DNS server
Suspicious captive portal
Unencrypted HTTP traffic
```

Generate:

```text
INFO
LOW
MEDIUM
HIGH
```

alerts.

---

# Phase 7 — Educational Mode

Add explanations.

For every event:

```text
WHAT HAPPENED?

WHY DOES IT MATTER?

WHAT COULD AN ATTACKER LEARN?

HOW CAN A USER PROTECT THEMSELVES?
```

This becomes the main educational feature.

---

# 📊 Example Final Dashboard

```text
╔══════════════════════════════════════════════════════╗
║                    EvilWifi Lab                     ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ LAB STATUS       ● ACTIVE                            ║
║                                                      ║
║ SSID             CoffeeShop-Lab                     ║
║ CLIENTS          2                                   ║
║ DURATION         00:14:23                            ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ CLIENTS                                              ║
║                                                      ║
║ Android-Lab      10.10.10.20        CONNECTED       ║
║ Laptop-Lab       10.10.10.21        CONNECTED       ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ NETWORK EVENTS                                       ║
║                                                      ║
║ 15:10:01  Wi-Fi association                         ║
║ 15:10:02  DHCP                                      ║
║ 15:10:03  DNS query                                 ║
║ 15:10:04  TCP connection                            ║
║ 15:10:06  HTTPS connection                          ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ SECURITY ANALYSIS                                    ║
║                                                      ║
║ ⚠ Same SSID detected on multiple APs                ║
║                                                      ║
║ ℹ SSID alone cannot authenticate an AP              ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

# 🧠 Important Networking Concept

One of the main lessons of this project should be:

```text
             USER
               │
               ▼
          Wi-Fi Network
               │
               ▼
          Gateway
               │
               ▼
            Internet
```

When a user joins an untrusted network:

```text
             USER
               │
               ▼
        UNKNOWN NETWORK
               │
               ▼
          UNKNOWN GATEWAY
               │
               ▼
            INTERNET
```

The user has effectively given the local network a position between their device and the rest of the network.

That is why public Wi-Fi security matters.

---

# 🔐 What HTTPS Changes

A common misconception should be demonstrated:

```text
EVIL TWIN
    │
    ▼
USER
    │
    ▼
HTTPS WEBSITE
```

The rogue network may be able to observe network metadata, but TLS prevents the attacker from simply reading the protected application data.

Therefore:

```text
Evil Twin
   ≠
Automatic password theft
```

Modern HTTPS is an extremely important defense.

However, attackers can still attempt:

```text
Phishing
Fake captive portals
Malicious DNS
Malicious websites
Social engineering
Downgrade attempts
```

The exact protections depend on the application and protocol.

---

# 🛡 Defensive Presentation

At the end of each laboratory scenario, show:

```text
HOW TO PROTECT YOURSELF
```

### 1. Disable unnecessary auto-join

Don't allow your device to automatically connect to unknown networks.

### 2. Verify the network

Don't assume:

```text
Same SSID = Same Network
```

### 3. Use HTTPS

Look for:

```text
https://
```

and valid certificate warnings.

### 4. Be suspicious of unexpected login pages

A Wi-Fi connection should not automatically make you trust a website.

### 5. Use a trusted VPN when appropriate

A VPN can protect traffic from local-network observers, although it does not make phishing or malicious websites safe.

### 6. Forget public networks

Remove networks you no longer use from your device.

---

# 🧪 Suggested Demonstration

For your presentation, create this sequence.

### Demonstration 1

Show:

```text
Real network
SSID: DemoWiFi
```

Ask:

> "How do you know this is the real network?"

Then explain:

```text
SSID is only a name.
```

---

### Demonstration 2

Show:

```text
DemoWiFi
DemoWiFi
```

Explain:

```text
Same SSID
Different BSSID
Different infrastructure
```

---

### Demonstration 3

Connect the test phone to the laboratory network.

Show:

```text
Association
↓
DHCP
↓
DNS
↓
TCP
↓
HTTPS
```

---

### Demonstration 4

Display the educational portal.

Explain:

> "A malicious network could present a convincing page here. Never enter real credentials into an unexpected Wi-Fi login page."

---

### Demonstration 5

Show the detection engine.

```text
⚠ Duplicate SSID
⚠ Unknown BSSID
⚠ Unexpected gateway
```

Then explain that these are **indicators**, not absolute proof.

---

# 🏆 Final Project Goal

The finished application should answer four questions:

### Question 1

**What happens when my device connects to Wi-Fi?**

```text
802.11
 ↓
Association
 ↓
DHCP
 ↓
ARP
 ↓
DNS
 ↓
TCP
 ↓
Application
```

### Question 2

**Can I trust a Wi-Fi network just because I recognize its name?**

```text
No.
```

### Question 3

**What can an untrusted network observe?**

Potentially:

```text
Network metadata
DNS activity
Connection destinations
Unencrypted application traffic
Device information
```

depending on the protocols and configuration.

### Question 4

**How do I defend myself?**

```text
Trusted networks
+
HTTPS/TLS
+
Secure Wi-Fi authentication
+
Careful auto-join settings
+
VPN when appropriate
+
User awareness
```

---

# 🔮 Future Improvements

After the basic version works, consider adding:

```text
Wi-Fi environment scanner
SSID/BSSID visualization
Network topology map
Real-time packet graph
DNS visualization
Protocol statistics
Rogue AP detection
Gateway-change detection
Certificate monitoring
Security scoring
Educational quizzes
Attack-vs-defense scenarios
Report generation
Session recording
PCAP export for lab traffic
```

A particularly useful feature would be:

```text
              NETWORK TRUST SCORE

                    72 / 100

SSID consistency          ✓
BSSID consistency         ⚠
Gateway                   ⚠
DNS                       ✓
HTTPS                     ✓
Encryption                ✓

Recommendation:

Verify this network before using it.
```

---

# 🧰 Recommended Development Environment

For your cybersecurity learning environment:

```text
Linux
Python 3.12+
Node.js
Git
Wireshark
tcpdump
VS Code / Antigravity
```

Use a dedicated wireless adapter and **a separate test phone/laptop** for the wireless laboratory.

The laboratory should preferably run inside a VM or on dedicated hardware where practical.

---

# 📜 Ethical Rules

This project is intended for:

```text
✓ Personal laboratory
✓ Cybersecurity education
✓ Authorized penetration testing
✓ Security demonstrations
✓ Network research
```

Never deploy the simulator against:

```text
✗ Public Wi-Fi
✗ Company networks
✗ School networks
✗ Hotel networks
✗ Airports
✗ Neighbor networks
✗ Networks you do not own or have explicit authorization to test
✗ Devices belonging to other people
```

Never collect real passwords or credentials.

---

# 🎓 Final Learning Outcome

The ultimate goal isn't to build a tool that steals a Wi-Fi password.

The goal is to understand **why the attack is possible**, what happens at every layer of the network, and how modern security mechanisms stop or limit it.

The final mental model should be:

```text
                 Wi-Fi
                   │
                   ▼
             ┌───────────┐
             │   Client  │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │ Access    │
             │ Point     │
             └─────┬─────┘
                   │
                   ▼
               Gateway
                   │
             ┌─────┴─────┐
             │           │
            DNS         NAT
             │           │
             └─────┬─────┘
                   │
                   ▼
                Internet
                   │
                   ▼
                  TLS
                   │
                   ▼
              Application
```

Understanding this path gives you the foundation to study:

```text
Wi-Fi security
Network security
MITM attacks
TLS
DNS security
Rogue AP detection
Network monitoring
Incident response
Wireless penetration testing
```
