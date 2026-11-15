import pytest

from app.services.real_ap import (
    RealAccessPoint,
    RealAccessPointError,
    LAB_GATEWAY,
    LAB_DHCP_START,
    LAB_DHCP_END,
)


def make_ap(**kwargs) -> RealAccessPoint:
    defaults = dict(interface="wlan-test0", ssid="FahdWiFi-Lab", channel=6)
    defaults.update(kwargs)
    return RealAccessPoint(**defaults)


def test_hostapd_conf_contains_core_fields():
    conf = make_ap().hostapd_conf()
    assert "interface=wlan-test0" in conf
    assert "ssid=FahdWiFi-Lab" in conf
    assert "channel=6" in conf
    assert "driver=nl80211" in conf


def test_hostapd_conf_is_open_network_no_wpa():
    # The lab AP is intentionally open; there must be no WPA passphrase config.
    conf = make_ap().hostapd_conf().lower()
    assert "wpa_passphrase" not in conf
    assert "wpa=" not in conf


def test_dnsmasq_conf_serves_isolated_lab_subnet():
    conf = make_ap().dnsmasq_conf()
    assert "interface=wlan-test0" in conf
    assert f"dhcp-range={LAB_DHCP_START},{LAB_DHCP_END}" in conf
    assert f"dhcp-option=3,{LAB_GATEWAY}" in conf   # gateway
    assert f"dhcp-option=6,{LAB_GATEWAY}" in conf   # dns
    assert "no-resolv" in conf                       # do not use host resolver


def test_captive_portal_redirects_all_names_to_portal():
    conf = make_ap(captive_portal=True).dnsmasq_conf()
    assert f"address=/#/{LAB_GATEWAY}" in conf


def test_captive_portal_can_be_disabled():
    conf = make_ap(captive_portal=False).dnsmasq_conf()
    assert "address=/#/" not in conf


def test_dependencies_report_shape():
    deps = RealAccessPoint.dependencies()
    assert set(deps) == {"hostapd", "dnsmasq", "ip", "is_root"}


def test_unmet_requirements_lists_missing_pieces():
    # In the test environment we are not root and tools may be absent, so there
    # should be at least one unmet requirement and it should be human-readable.
    missing = RealAccessPoint.unmet_requirements()
    assert isinstance(missing, list)
    for item in missing:
        assert isinstance(item, str) and item


def test_start_refuses_when_unsupported(monkeypatch):
    ap = make_ap()
    monkeypatch.setattr(RealAccessPoint, "is_supported", classmethod(lambda cls: False))
    monkeypatch.setattr(
        RealAccessPoint, "unmet_requirements",
        classmethod(lambda cls: ["the backend must run as root to create a real AP"]),
    )
    with pytest.raises(RealAccessPointError):
        ap.start()
    assert ap.is_running is False
