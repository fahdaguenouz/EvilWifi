export type EventMetadata = Record<string, unknown>;

export interface StreamEvent {
  id?: number;
  session_id?: number;
  device_id?: number | null;
  event_type?: string;
  event_metadata?: EventMetadata;
  timestamp: string;
  is_alert?: boolean;
  alert_type?: string;
  severity?: string;
  message?: string;
}
