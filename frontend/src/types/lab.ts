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
}
