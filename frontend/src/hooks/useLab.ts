import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { LabState } from "../types/lab";

export function useLab() {
  const [lab, setLab] = useState<LabState>({
    status: "stopped",
  });

  async function refresh() {
    const response = await api.get("/lab/status");
    setLab(response.data);
  }

  async function start(mode: "NETWORK_LAB" | "EVIL_TWIN", ssid: string, networkInterface: string) {
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
    api.get<LabState>("/lab/status").then((response) => {
      if (active) setLab(response.data);
    });
    return () => { active = false; };
  }, []);

  return {
    lab,
    start,
    stop,
    refresh,
  };
}
