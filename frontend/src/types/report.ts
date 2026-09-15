export interface SessionReview {
  session: {
    id: number;
    ssid: string;
    interface: string;
    started_at: string;
    ended_at: string | null;
    status: 'active' | 'completed';
  };
  trust_score: {
    value: number;
    label: string;
    confidence: 'limited' | 'moderate' | 'high';
    explanation: string;
  };
  evidence: {
    event_count: number;
    device_count: number;
    alert_count: number;
    capture_complete: boolean;
    observed_protocols: string[];
    event_counts: Record<string, number>;
  };
  findings: Array<{
    alert_type: string;
    severity: string;
    message: string;
    score_impact: number;
  }>;
  concepts_reviewed: Array<{
    event_type: string;
    concept: string;
    what_happened: string;
    how_to_protect: string;
  }>;
  next_steps: string[];
}
