from copy import deepcopy
from typing import Any

from app.services.education import educational_context


PROTOCOL_PROFILES: dict[str, dict[str, Any]] = {
    "arp_request": {
        "protocol": "ARP",
        "osi_layer": "Link / Network boundary",
        "category": "local_discovery",
        "encrypted": False,
        "visibility": "Visible on the local network",
        "summary": "A device asked which hardware address owns a local IP address.",
        "learning_point": "ARP helps devices find one another locally and does not leave the local network.",
    },
    "dhcp_request": {
        "protocol": "DHCP",
        "osi_layer": "Application over UDP",
        "category": "network_configuration",
        "encrypted": False,
        "visibility": "Visible on the local network",
        "summary": "A device requested network settings such as an IP address and gateway.",
        "learning_point": "The DHCP server can influence which gateway and DNS server a device trusts.",
    },
    "network_configuration": {
        "protocol": "DHCP",
        "osi_layer": "Application over UDP",
        "category": "network_configuration",
        "encrypted": False,
        "visibility": "Assigned gateway and DNS server visible locally",
        "summary": "A DHCP response supplied network configuration to a device.",
        "learning_point": "Unexpected gateway or DNS values can redirect where a device sends traffic.",
    },
    "dns_query": {
        "protocol": "DNS",
        "osi_layer": "Application over UDP",
        "category": "name_resolution",
        "encrypted": False,
        "visibility": "Domain name visible in this captured query",
        "summary": "A device asked for the IP address associated with a domain name.",
        "learning_point": "Traditional DNS exposes the requested domain; encrypted DNS behaves differently.",
    },
    "http_request": {
        "protocol": "HTTP",
        "osi_layer": "Application over TCP",
        "category": "web",
        "encrypted": False,
        "visibility": "Host and requested path visible",
        "summary": "A device sent an unencrypted web request.",
        "learning_point": "Plain HTTP can expose and allow modification of content in transit.",
    },
    "tls_connection": {
        "protocol": "TLS",
        "osi_layer": "Session / Application security",
        "category": "encrypted_web",
        "encrypted": True,
        "visibility": "Content encrypted; destination clues may remain visible",
        "summary": "A device started an encrypted connection, usually for HTTPS.",
        "learning_point": "TLS protects content and paths, although metadata such as an IP or SNI may be observable.",
    },
    "access_point_observed": {
        "protocol": "802.11 Beacon",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_identity",
        "encrypted": False,
        "visibility": "SSID, BSSID, channel, and signal broadcast in the clear",
        "summary": "An access point advertised its network name and radio address in a beacon frame.",
        "learning_point": "Beacons are unauthenticated, so any radio can broadcast any SSID; the BSSID identifies the actual radio.",
    },
    "probe_request": {
        "protocol": "802.11 Probe Request",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_discovery",
        "encrypted": False,
        "visibility": "Client address and sometimes a remembered network name are visible",
        "summary": "A client searched for networks, sometimes naming a specific saved SSID.",
        "learning_point": "Probe requests can leak the networks a device remembers and enable Evil Twin targeting.",
    },
    "probe_response": {
        "protocol": "802.11 Probe Response",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_discovery",
        "encrypted": False,
        "visibility": "SSID, BSSID, and security mode visible",
        "summary": "An access point answered a client's probe for a network.",
        "learning_point": "A rogue AP can answer probes for any SSID, impersonating a trusted network.",
    },
    "wifi_authentication": {
        "protocol": "802.11 Authentication",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_join",
        "encrypted": False,
        "visibility": "Client and access-point addresses visible",
        "summary": "A client began the 802.11 authentication exchange with an access point.",
        "learning_point": "Open-system 802.11 authentication proves nothing about identity; real protection comes from WPA2/WPA3.",
    },
    "wifi_association": {
        "protocol": "802.11 Association",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_join",
        "encrypted": False,
        "visibility": "Client and access-point addresses visible",
        "summary": "A client associated with an access point, selecting it for its wireless link.",
        "learning_point": "Association commits a device to trusting one access point for local connectivity.",
    },
    "disassociation_frame": {
        "protocol": "802.11 Disassociation",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_disruption",
        "encrypted": False,
        "visibility": "Source, destination, and reason code visible",
        "summary": "A disassociation frame ended a client's link with an access point.",
        "learning_point": "Management frames like this are often unprotected and can be forged unless 802.11w is in use.",
    },
    "deauth_frame": {
        "protocol": "802.11 Deauthentication",
        "osi_layer": "Data Link (802.11 management)",
        "category": "wireless_disruption",
        "encrypted": False,
        "visibility": "Source, destination, and reason code visible",
        "summary": "A deauthentication frame forced a client off an access point.",
        "learning_point": "Forged deauth frames are a classic Evil Twin and denial-of-service technique; 802.11w (PMF) defends against them.",
    },
}


def classify_event(event_type: str) -> dict[str, Any]:
    """Return a stable, presentation-ready explanation for a captured event."""
    profile = PROTOCOL_PROFILES.get(event_type)
    if profile is None:
        return {
            "protocol": "Other",
            "osi_layer": "Not classified",
            "category": "other",
            "encrypted": None,
            "visibility": "Depends on the event",
            "summary": "The laboratory recorded a non-packet or unsupported event.",
            "learning_point": "Use the event details and timeline context to understand what occurred.",
        }
    return deepcopy(profile)


def enrich_event(event_type: str, metadata: dict[str, Any]) -> dict[str, Any]:
    """Attach analysis without mutating caller-owned packet metadata."""
    enriched = deepcopy(metadata)
    enriched["analysis"] = classify_event(event_type)
    enriched["education"] = educational_context(event_type)
    return enriched


def protocol_catalog() -> list[dict[str, Any]]:
    return [
        {"event_type": event_type, **deepcopy(profile)}
        for event_type, profile in PROTOCOL_PROFILES.items()
    ]
