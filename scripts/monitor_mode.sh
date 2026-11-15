#!/usr/bin/env bash
#
# monitor_mode.sh - enable or disable 802.11 monitor mode for EvilWifi Lab.
#
# The WIFI_MONITOR lab mode captures raw 802.11 management frames (beacons,
# probe requests/responses, auth/assoc, deauth). That requires the wireless
# interface to be in MONITOR mode, which needs root.
#
# USAGE:
#   sudo scripts/monitor_mode.sh start  <iface> [channel]
#   sudo scripts/monitor_mode.sh stop   <iface>
#   sudo scripts/monitor_mode.sh status <iface>
#
# EXAMPLE (built-in Intel card detected on this machine):
#   sudo scripts/monitor_mode.sh start wlp0s20f3 6
#   sudo scripts/monitor_mode.sh stop  wlp0s20f3
#
# WARNING: On a machine with a single Wi-Fi adapter, switching that adapter to
# monitor mode DISCONNECTS your Wi-Fi internet for the duration. Use a second
# (USB) adapter if you need to stay online.
#
# Monitor mode only sees ONE channel at a time. Set the channel to the one your
# target access point uses, or omit it to keep the driver default.

set -euo pipefail

ACTION="${1:-}"
IFACE="${2:-}"
CHANNEL="${3:-}"

if [[ -z "$ACTION" || -z "$IFACE" ]]; then
  grep '^#' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

if [[ "$ACTION" != "status" && "$(id -u)" -ne 0 ]]; then
  echo "ERROR: '$ACTION' needs root. Re-run with: sudo $0 $*" >&2
  exit 1
fi

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: '$1' is not installed. Install it first:" >&2
    echo "         sudo apt install -y iw wireless-tools" >&2
    exit 1
  }
}

case "$ACTION" in
  start)
    require iw
    # Realtek/USB adapters report "Device or resource busy" if NetworkManager or
    # wpa_supplicant still holds the radio. Release it FIRST, before touching the
    # interface, and target only THIS interface so other adapters keep working.
    echo "[*] Releasing $IFACE from NetworkManager / wpa_supplicant..."
    if command -v nmcli >/dev/null 2>&1; then
      nmcli device set "$IFACE" managed no 2>/dev/null || true
      nmcli device disconnect "$IFACE" 2>/dev/null || true
    fi
    # Kill only the wpa_supplicant bound to THIS interface (leaves your main card alone).
    pkill -f "wpa_supplicant.*$IFACE" 2>/dev/null || true
    command -v rfkill >/dev/null 2>&1 && rfkill unblock wlan 2>/dev/null || true
    sleep 1

    echo "[*] Taking $IFACE down..."
    ip link set "$IFACE" down

    echo "[*] Switching $IFACE to monitor mode..."
    # Retry: the driver can need a moment after the device is released.
    for attempt in 1 2 3; do
      if iw dev "$IFACE" set type monitor 2>/dev/null; then
        break
      fi
      echo "    (attempt $attempt: device busy, retrying...)"
      sleep 1
    done

    ip link set "$IFACE" up

    # Verify the switch actually took before continuing.
    if ! iw "$IFACE" info 2>/dev/null | grep -q "type monitor"; then
      echo "[!] $IFACE is still NOT in monitor mode (driver refused)." >&2
      echo "    Try: sudo airmon-ng check    (lists interfering processes)" >&2
      echo "    This Realtek chip may need the out-of-tree 8188eu driver for monitor mode." >&2
      exit 1
    fi

    if [[ -n "$CHANNEL" ]]; then
      echo "[*] Setting channel $CHANNEL..."
      iw "$IFACE" set channel "$CHANNEL" || echo "    (could not set channel; using driver default)"
    fi
    echo "[+] Done. Verify below:"
    iw "$IFACE" info || iwconfig "$IFACE" || true
    echo "[i] Now start a WIFI_MONITOR session in the lab and select interface '$IFACE'."
    ;;

  stop)
    require iw
    echo "[*] Restoring $IFACE to managed mode..."
    ip link set "$IFACE" down
    iw "$IFACE" set type managed
    ip link set "$IFACE" up
    if command -v nmcli >/dev/null 2>&1; then
      nmcli device set "$IFACE" managed yes 2>/dev/null || true
    fi
    echo "[+] $IFACE back in managed mode. Wi-Fi should reconnect shortly."
    ;;

  status)
    iw "$IFACE" info 2>/dev/null || iwconfig "$IFACE" 2>/dev/null || {
      echo "Could not read $IFACE. Is the name correct? (see: iw dev)" >&2
      exit 1
    }
    ;;

  *)
    echo "ERROR: unknown action '$ACTION' (use start|stop|status)" >&2
    exit 1
    ;;
esac
