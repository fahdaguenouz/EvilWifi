export type DetectionRule = {
  id: string;
  title: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  signal: string;
  meaning: string;
  response: string;
};

export type DetectionAlert = {
  id: number;
  session_id: number;
  severity: string;
  alert_type: string;
  message: string;
  timestamp: string;
};
