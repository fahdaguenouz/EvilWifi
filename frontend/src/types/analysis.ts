export type ProtocolAnalysis = {
  protocol: string;
  osi_layer: string;
  category: string;
  encrypted: boolean | null;
  visibility: string;
  summary: string;
  learning_point: string;
};

export type AnalysisSummary = {
  events_reviewed: number;
  classified_events: number;
  protocols_observed: number;
  encrypted_events: number;
  visible_events: number;
  protocol_counts: Record<string, number>;
  category_counts: Record<string, number>;
  most_recent_event_at: string | null;
};
