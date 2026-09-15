from copy import deepcopy
from typing import Any


EVENT_EDUCATION: dict[str, dict[str, str]] = {
    "device_discovered": {
        "concept": "Device observation",
        "what_happened": "The lab observed a device participating in the authorized network workflow.",
        "why_it_matters": "A device can produce observable radio or network activity before and after it fully connects.",
        "attacker_could_learn": "A nearby observer may infer that a device is present and correlate timing or broadcast identifiers.",
        "how_to_protect": "Disable Wi-Fi when it is not needed, keep private-address features enabled, and avoid unfamiliar networks.",
    },
    "wifi_association": {
        "concept": "Joining an access point",
        "what_happened": "A test device established the wireless link-layer association used before normal IP traffic begins.",
        "why_it_matters": "Association chooses the access point a device will trust for its local wireless connection.",
        "attacker_could_learn": "A nearby observer may see that a device and access point are communicating even when later content is encrypted.",
        "how_to_protect": "Confirm the expected network and security mode, disable automatic joining, and remove networks you no longer use.",
    },
    "access_point_observed": {
        "concept": "Wi-Fi identity",
        "what_happened": "The lab observed an access point advertising a network name and BSSID.",
        "why_it_matters": "An SSID is only a label; the BSSID identifies the individual radio advertising it.",
        "attacker_could_learn": "A nearby observer can see broadcast network names, radio addresses, channels, and signal information.",
        "how_to_protect": "Verify unexpected duplicate networks and compare the BSSID with a trusted baseline before connecting.",
    },
    "arp_request": {
        "concept": "Local address discovery",
        "what_happened": "A device asked which local hardware address owns an IP address.",
        "why_it_matters": "Devices need ARP before they can deliver local IPv4 traffic to a gateway or peer.",
        "attacker_could_learn": "A local observer may infer active IP addresses, device relationships, and the likely gateway.",
        "how_to_protect": "Use trusted networks, client isolation where appropriate, and monitoring for unexpected ARP changes.",
    },
    "dhcp_request": {
        "concept": "Joining an IP network",
        "what_happened": "A device requested an IP address and other network settings through DHCP.",
        "why_it_matters": "DHCP tells the device how to communicate and which infrastructure to trust.",
        "attacker_could_learn": "A local observer may see hostnames, requested addresses, and device arrival timing.",
        "how_to_protect": "Join only expected networks and compare assigned settings with the trusted lab baseline.",
    },
    "network_configuration": {
        "concept": "Gateway and DNS trust",
        "what_happened": "A DHCP response supplied a gateway or DNS server to the device.",
        "why_it_matters": "Those services influence where web traffic and name lookups are sent.",
        "attacker_could_learn": "A malicious DHCP service could try to make itself the gateway or DNS resolver.",
        "how_to_protect": "Disconnect when gateway or DNS values unexpectedly differ from a trusted baseline.",
    },
    "dns_query": {
        "concept": "Name resolution",
        "what_happened": "A device asked a DNS resolver to translate a domain name into an IP address.",
        "why_it_matters": "Most applications need name resolution before connecting to a service.",
        "attacker_could_learn": "Traditional DNS can reveal which domain a device is trying to reach, though not the encrypted page content.",
        "how_to_protect": "Prefer trusted resolvers and encrypted DNS when appropriate, while remembering that other connection metadata can remain.",
    },
    "http_request": {
        "concept": "Unencrypted web traffic",
        "what_happened": "A device sent a plain HTTP request without TLS encryption.",
        "why_it_matters": "Anyone positioned on the traffic path may be able to read or modify the request and response.",
        "attacker_could_learn": "The host, path, headers, and unencrypted content may be visible.",
        "how_to_protect": "Use HTTPS and never submit sensitive information to a page that lacks valid TLS protection.",
    },
    "tls_connection": {
        "concept": "Encrypted web traffic",
        "what_happened": "A device started a TLS-encrypted connection, commonly used by HTTPS.",
        "why_it_matters": "TLS protects application content from passive observers and detects many forms of modification.",
        "attacker_could_learn": "An observer may still see IP addresses, timing, traffic volume, and sometimes a destination name.",
        "how_to_protect": "Check certificate warnings, keep software updated, and do not bypass browser security errors.",
    },
    "captive_portal_opened": {
        "concept": "Captive portal trust",
        "what_happened": "The network presented a web portal before offering access.",
        "why_it_matters": "A convincing page does not prove who operates the network or portal.",
        "attacker_could_learn": "Anything voluntarily entered into an untrusted portal could be exposed to its operator.",
        "how_to_protect": "Never reuse a real password in an unexpected portal; verify the network with its owner.",
    },
    "test_form_submitted": {
        "concept": "Safe portal simulation",
        "what_happened": "The fixed synthetic training identity was checked by the educational portal.",
        "why_it_matters": "The exercise demonstrates persuasion risk without collecting real credentials.",
        "attacker_could_learn": "In a real malicious portal, submitted information could reveal identity or reused secrets.",
        "how_to_protect": "Stop when a portal asks for familiar credentials and confirm the request through a trusted channel.",
    },
    "captive_portal_login": {
        "concept": "Retired portal record",
        "what_happened": "This historical event came from the earlier portal workflow that has now been removed.",
        "why_it_matters": "Learning records should never preserve real secrets, even in a controlled demonstration.",
        "attacker_could_learn": "A real malicious portal could retain any information a person submits.",
        "how_to_protect": "Use only the current synthetic training identity and never enter a real account password into this lab.",
    },
}


LEARNING_MODULES: list[dict[str, Any]] = [
    {
        "id": "wifi_identity",
        "title": "SSID is not identity",
        "duration_minutes": 6,
        "summary": "Learn why two access points can advertise the same network name.",
        "objectives": ["Distinguish SSID from BSSID", "Recognize duplicate-network indicators", "Avoid treating one signal as proof"],
        "steps": [
            {"title": "Read the SSID", "body": "The SSID is the friendly name shown in the Wi-Fi menu."},
            {"title": "Compare BSSIDs", "body": "Each access-point radio has a BSSID. Different BSSIDs can be legitimate or suspicious depending on context."},
            {"title": "Verify before connecting", "body": "Use the expected venue, security type, gateway, and staff confirmation together."},
        ],
        "check": {
            "question": "Which statement is safest?",
            "options": ["A familiar SSID proves the network is genuine", "A BSSID alone proves an attack", "SSID and BSSID are indicators that need context"],
            "correct_index": 2,
            "explanation": "Network names and radio addresses are useful evidence, but neither should be interpreted without context.",
        },
    },
    {
        "id": "network_setup",
        "title": "How a device joins the network",
        "duration_minutes": 7,
        "summary": "Follow ARP and DHCP as a device learns its local network configuration.",
        "objectives": ["Explain DHCP", "Explain ARP", "Identify trusted gateway and DNS values"],
        "steps": [
            {"title": "Request configuration", "body": "DHCP supplies an IP address and may supply the gateway and DNS resolver."},
            {"title": "Find local devices", "body": "ARP maps local IPv4 addresses to hardware addresses."},
            {"title": "Compare the baseline", "body": "Unexpected gateway or DNS values deserve investigation before continuing."},
        ],
        "check": {
            "question": "Why is an unexpected gateway important?",
            "options": ["It controls where off-network traffic is sent", "It changes the Wi-Fi name", "It encrypts every packet"],
            "correct_index": 0,
            "explanation": "The default gateway receives traffic for destinations outside the local subnet.",
        },
    },
    {
        "id": "web_visibility",
        "title": "What HTTP, DNS, and TLS reveal",
        "duration_minutes": 8,
        "summary": "Compare readable traffic with encrypted content and remaining metadata.",
        "objectives": ["Recognize plain HTTP", "Describe TLS protection", "Understand metadata limits"],
        "steps": [
            {"title": "Resolve a name", "body": "Traditional DNS may reveal the requested domain."},
            {"title": "Compare HTTP and HTTPS", "body": "HTTP content is readable; TLS protects the application content used by HTTPS."},
            {"title": "Remember metadata", "body": "Encryption does not hide every IP address, timing pattern, or traffic volume."},
        ],
        "check": {
            "question": "What does TLS normally protect?",
            "options": ["All connection metadata", "Application content in transit", "The existence of a network connection"],
            "correct_index": 1,
            "explanation": "TLS protects application content, but an observer can still see that a connection exists and may infer limited metadata.",
        },
    },
    {
        "id": "safe_response",
        "title": "Respond to suspicious Wi-Fi safely",
        "duration_minutes": 6,
        "summary": "Turn detection indicators into careful, proportionate actions.",
        "objectives": ["Treat alerts as indicators", "Verify captive portals", "Choose a safe response"],
        "steps": [
            {"title": "Pause", "body": "Do not enter information when a network or portal is unexpected."},
            {"title": "Gather context", "body": "Compare BSSID, security type, gateway, DNS, portal behavior, and trusted instructions."},
            {"title": "Respond", "body": "Disconnect when uncertain and verify the network through a trusted channel."},
        ],
        "check": {
            "question": "A duplicate SSID alert appears. What should you do first?",
            "options": ["Assume it is definitely malicious", "Verify the network using additional context", "Enter a password to test it"],
            "correct_index": 1,
            "explanation": "A duplicate SSID is an indicator. Verify it with other evidence before deciding what occurred.",
        },
    },
]


def educational_context(event_type: str) -> dict[str, str]:
    context = EVENT_EDUCATION.get(event_type)
    if context:
        return deepcopy(context)
    return {
        "concept": "Laboratory observation",
        "what_happened": "The laboratory recorded an event in the current workflow.",
        "why_it_matters": "Its meaning depends on the surrounding network events and trusted baseline.",
        "attacker_could_learn": "The available information depends on the protocol and whether its content is encrypted.",
        "how_to_protect": "Review the event in context and use only authorized, isolated laboratory systems.",
    }


def learning_modules() -> list[dict[str, Any]]:
    return deepcopy(LEARNING_MODULES)
