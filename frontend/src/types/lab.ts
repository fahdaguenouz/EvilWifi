export type LabStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface LabState {
  status: LabStatus;
}