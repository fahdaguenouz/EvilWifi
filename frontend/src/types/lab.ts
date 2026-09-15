export type LabStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface LabState {
  status: LabStatus;
  mode?: "NETWORK_LAB" | "EVIL_TWIN";
  ssid?: string | null;
  interface?: string | null;
  clients?: number;
  capture_status?: "stopped" | "starting" | "running" | "error";
  capture_error?: string | null;
}
