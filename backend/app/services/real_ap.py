"""
Real isolated access point for the EvilWifi educational lab.

This replaces the simulated Evil Twin with a *genuine* Wi-Fi access point built
from hostapd + dnsmasq, so a learner can connect their OWN authorized test
device and watch real DHCP/DNS/HTTP behavior and a captive portal.

SAFETY MODEL (do not weaken):
  * The AP is ISOLATED by default: no NAT, no internet uplink, no packet
    forwarding. A connected device gets a lab IP, a lab gateway, and the lab
    DNS resolver, and nothing leaves the lab. Giving it real internet is a
    deliberate, manual, out-of-band step and is intentionally NOT automated.
  * The captive portal only ever accepts the fixed SYNTHETIC training identity
    (see app/api/portal.py). It never collects, stores, or forwards real
    credentials, and it performs no exploitation of connected devices.
  * Everything requires explicit authorization and tears down cleanly on stop.

This module only *builds and supervises* the AP. It contains no code that
attacks, exploits, or exfiltrates data from connected devices, by design.
"""

import os
import shutil
import signal
import subprocess
import tempfile
import time
from pathlib import Path


# Private, isolated lab network. Matches the detection-engine baseline.
LAB_SUBNET = "10.10.10"
LAB_GATEWAY = f"{LAB_SUBNET}.1"
LAB_NETMASK = "255.255.255.0"
LAB_CIDR = f"{LAB_GATEWAY}/24"
LAB_DHCP_START = f"{LAB_SUBNET}.10"
LAB_DHCP_END = f"{LAB_SUBNET}.100"
LAB_DHCP_LEASE = "12h"


class RealAccessPointError(RuntimeError):
    """Raised when the real AP cannot be built or started."""


class RealAccessPoint:
    """Build and supervise a real, isolated hostapd + dnsmasq access point."""

    def __init__(
        self,
        interface: str,
        ssid: str,
        channel: int = 6,
        captive_portal: bool = True,
        portal_ip: str = LAB_GATEWAY,
        portal_redirect_port: int = 8000,
    ):
        self.interface = interface
        self.ssid = ssid
        self.channel = int(channel)
        self.captive_portal = captive_portal
        self.portal_ip = portal_ip
        self.portal_redirect_port = portal_redirect_port

        self._procs: dict[str, subprocess.Popen] = {}
        self._workdir: Path | None = None
        self._added_iptables: list[list[str]] = []
        self._running = False

    # --- capability checks ----------------------------------------------------

    @staticmethod
    def dependencies() -> dict:
        return {
            "hostapd": shutil.which("hostapd"),
            "dnsmasq": shutil.which("dnsmasq"),
            "ip": shutil.which("ip"),
            "is_root": hasattr(os, "geteuid") and os.geteuid() == 0,
        }

    @classmethod
    def is_supported(cls) -> bool:
        deps = cls.dependencies()
        return bool(deps["hostapd"] and deps["dnsmasq"] and deps["ip"] and deps["is_root"])

    @classmethod
    def unmet_requirements(cls) -> list[str]:
        deps = cls.dependencies()
        missing = []
        if not deps["hostapd"]:
            missing.append("hostapd is not installed (sudo apt install hostapd)")
        if not deps["dnsmasq"]:
            missing.append("dnsmasq is not installed (sudo apt install dnsmasq)")
        if not deps["ip"]:
            missing.append("the 'ip' command is unavailable")
        if not deps["is_root"]:
            missing.append("the backend must run as root to create a real AP")
        return missing

    # --- config generation (pure, unit-tested) --------------------------------

    def hostapd_conf(self) -> str:
        """Open lab network. Kept open on purpose so the lesson can show that an
        unauthenticated SSID is trivial to stand up and offers no protection."""
        return "\n".join(
            [
                f"interface={self.interface}",
                "driver=nl80211",
                f"ssid={self.ssid}",
                "hw_mode=g",
                f"channel={self.channel}",
                "auth_algs=1",
                "ignore_broadcast_ssid=0",
                # No wpa= line: this is an open network by design (lab lesson).
                "",
            ]
        )

    def dnsmasq_conf(self) -> str:
        lines = [
            f"interface={self.interface}",
            "bind-interfaces",
            # Do NOT read the host's /etc/resolv.conf; the lab resolver is local.
            "no-resolv",
            f"dhcp-range={LAB_DHCP_START},{LAB_DHCP_END},{LAB_NETMASK},{LAB_DHCP_LEASE}",
            f"dhcp-option=3,{LAB_GATEWAY}",   # router (gateway)
            f"dhcp-option=6,{LAB_GATEWAY}",   # DNS server
        ]
        if self.captive_portal:
            # Resolve every name to the portal so the device shows the lab page.
            lines.append(f"address=/#/{self.portal_ip}")
        lines.append("")
        return "\n".join(lines)

    # --- lifecycle -------------------------------------------------------------

    def start(self):
        if self._running:
            return

        missing = self.unmet_requirements()
        if missing:
            raise RealAccessPointError("Cannot start real AP: " + "; ".join(missing))

        self._workdir = Path(tempfile.mkdtemp(prefix="evilwifi-ap-"))
        hostapd_path = self._workdir / "hostapd.conf"
        dnsmasq_path = self._workdir / "dnsmasq.conf"
        hostapd_path.write_text(self.hostapd_conf())
        dnsmasq_path.write_text(self.dnsmasq_conf())

        try:
            # 1. Assign the gateway IP to the AP interface (isolated subnet).
            self._run(["ip", "addr", "flush", "dev", self.interface])
            self._run(["ip", "addr", "add", LAB_CIDR, "dev", self.interface])
            self._run(["ip", "link", "set", self.interface, "up"])

            # 2. Start hostapd (the radio/AP). Must come up before dnsmasq.
            self._procs["hostapd"] = subprocess.Popen(
                ["hostapd", str(hostapd_path)],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
            )
            time.sleep(2)
            if self._procs["hostapd"].poll() is not None:
                out = self._procs["hostapd"].stdout.read() if self._procs["hostapd"].stdout else ""
                raise RealAccessPointError(
                    f"hostapd exited immediately. The interface may not support AP mode. Output:\n{out}"
                )

            # 3. Start dnsmasq (DHCP + DNS + captive-portal resolution).
            self._procs["dnsmasq"] = subprocess.Popen(
                ["dnsmasq", "--keep-in-foreground", "--conf-file=" + str(dnsmasq_path)],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
            )
            time.sleep(1)

            # 4. Optional: redirect lab HTTP to the portal app. Reversible.
            if self.captive_portal:
                self._enable_portal_redirect()

            self._running = True
        except Exception:
            # Never leave a half-configured interface or orphan processes behind.
            self.stop()
            raise

    def stop(self):
        # Best-effort teardown; each step is guarded so one failure cannot block
        # the rest (we must always try to restore the interface).
        self._disable_portal_redirect()

        for name, proc in list(self._procs.items()):
            try:
                proc.send_signal(signal.SIGTERM)
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        self._procs.clear()

        try:
            self._run(["ip", "addr", "flush", "dev", self.interface], check=False)
        except Exception:
            pass

        if self._workdir and self._workdir.exists():
            shutil.rmtree(self._workdir, ignore_errors=True)
        self._workdir = None
        self._running = False

    # --- captive-portal HTTP redirect (reversible) -----------------------------

    def _enable_portal_redirect(self):
        """Redirect the connected device's plain HTTP (port 80) to the local
        portal app. Only affects traffic arriving on the lab interface, and the
        exact rules added are recorded so stop() removes precisely them."""
        if not shutil.which("iptables"):
            return
        rule = [
            "iptables", "-t", "nat", "-A", "PREROUTING",
            "-i", self.interface, "-p", "tcp", "--dport", "80",
            "-j", "REDIRECT", "--to-ports", str(self.portal_redirect_port),
        ]
        try:
            self._run(rule)
            self._added_iptables.append(rule)
        except Exception:
            # Portal redirect is a convenience, not required for the AP to work.
            pass

    def _disable_portal_redirect(self):
        for rule in self._added_iptables:
            delete = rule.copy()
            # Turn the "-A" (append) rule into a matching "-D" (delete).
            idx = delete.index("-A")
            delete[idx] = "-D"
            try:
                self._run(delete, check=False)
            except Exception:
                pass
        self._added_iptables.clear()

    # --- helpers ---------------------------------------------------------------

    def _run(self, cmd: list[str], check: bool = True):
        result = subprocess.run(cmd, capture_output=True, text=True)
        if check and result.returncode != 0:
            raise RealAccessPointError(
                f"command failed ({' '.join(cmd)}): {result.stderr.strip() or result.stdout.strip()}"
            )
        return result

    @property
    def is_running(self) -> bool:
        return self._running
