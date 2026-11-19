import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { LabState } from "../types/lab";

export function useLab() {
  const [lab, setLab] = useState<LabState>({
    status: "stopped",
  });
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [recommendedInterface, setRecommendedInterface] = useState<string | null>(null);
  const [wirelessReady, setWirelessReady] = useState(false);
  const [usbWirelessInterfaces, setUsbWirelessInterfaces] = useState<string[]>([]);
  const [readinessIssues, setReadinessIssues] = useState<string[]>([]);

  async function refresh(): Promise<LabState> {
    const response = await api.get<LabState>("/lab/status");
    setLab(response.data);
    return response.data;
  }

  async function refreshInterfaces() {
    const response = await api.get("/lab/interfaces");
    setInterfaces(response.data.interfaces as string[]);
    setRecommendedInterface(response.data.recommended ?? null);
    setWirelessReady(Boolean(response.data.wireless_ready));
    setUsbWirelessInterfaces(response.data.usb_wireless_interfaces || []);
    setReadinessIssues(response.data.issues || []);
  }

  async function start(mode: "NETWORK_LAB" | "EVIL_TWIN" | "WIFI_MONITOR" | "REAL_AP", ssid: string, networkInterface: string) {
    const response = await api.post("/lab/start", {
      mode,
      authorized: true,
      ssid,
      interface: networkInterface,
    });
    setLab(response.data);
  }

  async function stop() {
    const response = await api.post("/lab/stop");
    setLab(response.data);
  }

  useEffect(() => {
    let active = true;
    refresh();
    refreshInterfaces();
    return () => { active = false; };
  }, []);

  return {
    lab,
    interfaces,
    recommendedInterface,
    wirelessReady,
    usbWirelessInterfaces,
    readinessIssues,
    start,
    stop,
    refresh,
    refreshInterfaces,
  };
}
