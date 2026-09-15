import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, Radar, ShieldAlert } from 'lucide-react';
import { getAlerts, getDetectionRules } from '../services/api';
import { wsService } from '../services/websocket';
import type { DetectionAlert, DetectionRule } from '../types/detection';

const severityStyle: Record<string, string> = {
  HIGH: 'bg-accent/10 text-accent border-accent/30',
  MEDIUM: 'bg-warning/10 text-warning border-warning/30',
  LOW: 'bg-primary/10 text-primary border-primary/30',
  INFO: 'bg-muted/10 text-muted border-muted/30',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Detections() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [alerts, setAlerts] = useState<DetectionAlert[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getDetectionRules(), getAlerts(200)]).then(([nextRules, nextAlerts]) => {
      if (!active) return;
      setRules(nextRules);
      setAlerts(nextAlerts);
    }).catch(() => {
      if (active) setError('Detection data is unavailable. Start the backend service and try again.');
    });

    wsService.connect();
    const unsubscribe = wsService.subscribe((event) => {
      if (event.is_alert && event.alert_type && event.message) {
        const alertType = event.alert_type;
        const message = event.message;
        setAlerts((current) => [{
          id: event.id || Date.now(),
          session_id: event.session_id || 0,
          severity: event.severity || 'INFO',
          alert_type: alertType,
          message,
          timestamp: event.timestamp,
        }, ...current]);
      }
    });

    return () => {
      active = false;
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  const highCount = useMemo(() => alerts.filter((alert) => alert.severity.toUpperCase() === 'HIGH').length, [alerts]);
  const mediumCount = useMemo(() => alerts.filter((alert) => alert.severity.toUpperCase() === 'MEDIUM').length, [alerts]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Phase 6 · Defensive detection</p>
        <h1 className="text-3xl font-bold text-text mt-1">Turn suspicious signals into safe decisions</h1>
        <p className="text-muted mt-2 max-w-3xl">A detection is an indicator to investigate—not proof that an attack occurred. Compare it with the known lab baseline before deciding what it means.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-accent">{error}</div>}

      <section className="grid md:grid-cols-3 gap-3" aria-label="Detection workflow">
        <div className="bg-surface border border-border rounded-xl p-5"><Radar className="text-primary" /><h2 className="font-bold text-text mt-3">1. Observe a signal</h2><p className="text-sm text-muted mt-1">The engine compares packets and network identity with the expected lab baseline.</p></div>
        <div className="bg-surface border border-border rounded-xl p-5"><Eye className="text-warning" /><h2 className="font-bold text-text mt-3">2. Add context</h2><p className="text-sm text-muted mt-1">Duplicate SSIDs can be legitimate. Look at BSSID, gateway, DNS, and portal behavior together.</p></div>
        <div className="bg-surface border border-border rounded-xl p-5"><CheckCircle2 className="text-success" /><h2 className="font-bold text-text mt-3">3. Choose a response</h2><p className="text-sm text-muted mt-1">Verify the network, disconnect if uncertain, and avoid entering sensitive information.</p></div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5"><p className="text-sm text-muted">Rules enabled</p><p className="text-3xl font-bold text-text mt-1">{rules.length}</p></div>
        <div className="bg-surface border border-border rounded-xl p-5"><p className="text-sm text-muted">High indicators</p><p className="text-3xl font-bold text-accent mt-1">{highCount}</p></div>
        <div className="bg-surface border border-border rounded-xl p-5"><p className="text-sm text-muted">Medium indicators</p><p className="text-3xl font-bold text-warning mt-1">{mediumCount}</p></div>
      </section>

      <div className="grid xl:grid-cols-[1fr_1.1fr] gap-6">
        <section className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border"><h2 className="text-xl font-bold text-text">Detection rules</h2><p className="text-sm text-muted mt-1">What each rule notices and what to do next.</p></div>
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <details key={rule.id} className="group p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><ShieldAlert size={19} className={rule.severity === 'HIGH' ? 'text-accent' : 'text-warning'} /><span className="font-semibold text-text">{rule.title}</span></div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${severityStyle[rule.severity]}`}>{rule.severity}</span>
                </summary>
                <div className="pl-8 mt-4 space-y-3 text-sm">
                  <p><strong className="text-text">Signal:</strong> <span className="text-muted">{rule.signal}</span></p>
                  <p><strong className="text-text">Meaning:</strong> <span className="text-muted">{rule.meaning}</span></p>
                  <p className="flex gap-2 text-success"><ArrowRight size={16} className="shrink-0 mt-0.5" /><span>{rule.response}</span></p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border"><h2 className="text-xl font-bold text-text">Observed indicators</h2><p className="text-sm text-muted mt-1">Newest findings from authorized lab sessions.</p></div>
          {alerts.length === 0 ? (
            <div className="p-10 text-center"><AlertTriangle className="mx-auto text-muted" size={34} /><h3 className="font-bold text-text mt-3">No indicators recorded</h3><p className="text-sm text-muted mt-2">Start a lab and generate test traffic. Findings will appear here automatically.</p></div>
          ) : (
            <div className="divide-y divide-border max-h-[650px] overflow-auto">
              {alerts.map((alert) => {
                const severity = alert.severity.toUpperCase();
                return (
                  <article key={alert.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold text-text">{humanize(alert.alert_type)}</p><p className="text-xs text-muted mt-1">{new Date(alert.timestamp).toLocaleString()}</p></div>
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${severityStyle[severity] || severityStyle.INFO}`}>{severity}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed mt-3">{alert.message}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
