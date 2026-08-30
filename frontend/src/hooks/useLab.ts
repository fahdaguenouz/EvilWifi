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

  async function start() {
    const response = await api.post("/lab/start");
    setLab(response.data);
  }

  async function stop() {
    const response = await api.post("/lab/stop");
    setLab(response.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  return {
    lab,
    start,
    stop,
    refresh,
  };
}