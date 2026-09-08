import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Radar } from 'lucide-react';
import { getAnalysisSummary, getEvents } from '../services/api';
import { wsService } from '../services/websocket';
import type { AnalysisSummary, ProtocolAnalysis } from '../types/analysis';
import type { StreamEvent } from '../types/event';

const emptySummary: AnalysisSummary = {
  events_reviewed: 0,
  classified_events: 0,
  protocols_observed: 0,
  encrypted_events: 0,
  visible_events: 0,
  protocol_counts: {},
  category_counts: {},
  most_recent_event_at: null,
};

const readAnalysis = (event: StreamEvent): ProtocolAnalysis | null => {
  const value = event.event_metadata?.analysis;
  if (!value || typeof value !== 'object' || !('protocol' in value)) return null;
  return value as ProtocolAnalysis;
};

const detailFor = (event: StreamEvent) => {
  const metadata = event.event_metadata || {};
  if (event.event_type === 'dns_query') return String(metadata.domain || 'Domain unavailable');
  if (event.event_type === 'http_request') return String(metadata.url || metadata.host || 'Request unavailable');
  if (event.event_type === 'tls_connection') return String(metadata.sni || 'Encrypted destination');
  if (event.event_type === 'dhcp_request') return String(metadata.hostname || metadata.requested_ip || 'Network configuration');
  if (event.event_type === 'arp_request') return String(metadata.ip || 'Local address discovery');
  return 'Laboratory event';
};

export default function Analysis() {
  const [summary, setSummary] = useState<AnalysisSummary>(emptySummary);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const [nextSummary, nextEvents] = await Promise.all([getAnalysisSummary(), getEvents(250)]);
        if (!active) return;
        setSummary(nextSummary);
        setEvents(nextEvents);
        setError('');
      } catch {
        if (active) setError('The analyzer could not reach the lab service. Check that the backend is running.');
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 5000);
    wsService.connect();
    const unsubscribe = wsService.subscribe((event) => {
      if (!event.is_alert) setEvents((current) => [event, ...current].slice(0, 250));
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  const classifiedEvents = useMemo(
    () => events.map((event) => ({ event, analysis: readAnalysis(event) })).filter((item): item is { event: StreamEvent; analysis: ProtocolAnalysis } => item.analysis !== null),
    [events],
  );
  const maxProtocolCount = Math.max(1, ...Object.values(summary.protocol_counts));

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Phase 5 · Packet analysis</p>
          <h1 className="text-3xl font-bold text-text mt-1">Follow a packet from capture to meaning</h1>
          <p className="text-muted mt-2 max-w-3xl">The analyzer classifies lab traffic, identifies what remains visible, and turns each observation into a networking lesson.</p>
        </div>
        <Link to="/lab" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:border-primary text-text">
          Laboratory control <ArrowRight size={16} />
        </Link>
      </header>

      {error && <div role="alert" className="rounded-xl border border-accent/40 bg-accent/10 text-accent p-4">{error}</div>}

      <section className="grid md:grid-cols-3 gap-3" aria-label="Analysis workflow">
        {[
          { icon: Radar, number: '01', title: 'Capture', copy: 'PyShark observes authorized traffic on the selected lab interface.' },
          { icon: Layers3, number: '02', title: 'Classify', copy: 'Packets become ARP, DHCP, DNS, HTTP, or TLS events with layer information.' },
          { icon: Eye, number: '03', title: 'Explain', copy: 'The dashboard shows what was exposed, protected, and worth noticing.' },
        ].map(({ icon: Icon, number, title, copy }) => (
          <div key={title} className="relative bg-surface border border-border rounded-2xl p-5 overflow-hidden">
            <span className="absolute top-3 right-4 text-4xl font-black text-border/70">{number}</span>
            <Icon className="text-primary" size={24} />
            <h2 className="font-bold text-lg text-text mt-4">{title}</h2>
            <p className="text-sm text-muted leading-relaxed mt-1 pr-5">{copy}</p>
          </div>
        ))}
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Capture summary">
        {[
          { label: 'Classified events', value: summary.classified_events, icon: Activity, color: 'text-primary' },
          { label: 'Protocols observed', value: summary.protocols_observed, icon: Layers3, color: 'text-warning' },
          { label: 'Visible events', value: summary.visible_events, icon: Eye, color: 'text-accent' },
          { label: 'Encrypted events', value: summary.encrypted_events, icon: LockKeyhole, color: 'text-success' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
            <Icon className={color} size={25} />
            <div><p className="text-sm text-muted">{label}</p><p className="text-2xl font-bold text-text">{value}</p></div>
          </div>
        ))}
      </section>

      {summary.classified_events === 0 ? (
        <section className="bg-surface border border-dashed border-border rounded-2xl p-10 text-center">
          <Radar className="mx-auto text-muted" size={38} />
          <h2 className="text-xl font-bold text-text mt-4">No packet lessons yet</h2>
          <p className="text-muted mt-2 max-w-xl mx-auto">Start an authorized lab, connect a test device, then generate a DNS lookup or web request. Classified events will appear here automatically.</p>
          <Link to="/lab" className="inline-flex mt-5 px-4 py-2 rounded-lg bg-primary text-white font-semibold">Start the guided lab</Link>
        </section>
      ) : (
        <div className="grid xl:grid-cols-[0.8fr_1.4fr] gap-6">
          <section className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-xl font-bold text-text">Protocol mix</h2>
            <p className="text-sm text-muted mt-1">How the latest {summary.events_reviewed} laboratory events were classified.</p>
            <div className="space-y-4 mt-6">
              {Object.entries(summary.protocol_counts).sort((a, b) => b[1] - a[1]).map(([protocol, count]) => (
                <div key={protocol}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-text">{protocol}</span><span className="text-muted">{count}</span></div>
                  <div className="h-2 rounded-full bg-background overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxProtocolCount) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-xl font-bold text-text">Recent packet lessons</h2>
              <p className="text-sm text-muted mt-1">Read each row left to right: protocol, observed detail, then exposure.</p>
            </div>
            <div className="divide-y divide-border max-h-[460px] overflow-auto">
              {classifiedEvents.slice(0, 20).map(({ event, analysis }, index) => (
                <article key={`${event.id || index}-${event.timestamp}`} className="p-5 hover:bg-background/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">{analysis.protocol}</span>
                      <div><p className="font-medium text-text break-all">{detailFor(event)}</p><p className="text-xs text-muted mt-1">{analysis.osi_layer}</p></div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${analysis.encrypted ? 'text-success' : 'text-warning'}`}>
                      {analysis.encrypted ? <EyeOff size={14} /> : <Eye size={14} />}{analysis.encrypted ? 'Content protected' : 'Visible locally'}
                    </span>
                  </div>
                  <p className="text-sm text-text/90 mt-3">{analysis.summary}</p>
                  <p className="text-sm text-muted mt-1"><strong className="text-text">Learn:</strong> {analysis.learning_point}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-warning">HTTP · readable in transit</p>
          <h2 className="text-lg font-bold text-text mt-2">The host, path, and content can be exposed</h2>
          <p className="text-sm text-muted mt-2">This is why sensitive information should never be sent over plain HTTP.</p>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
          <p className="text-sm font-semibold text-success">TLS / HTTPS · encrypted content</p>
          <h2 className="text-lg font-bold text-text mt-2">Content is protected, but some metadata remains</h2>
          <p className="text-sm text-muted mt-2">An observer may still infer a destination from IP addresses or connection metadata.</p>
        </div>
      </section>
    </div>
  );
}
