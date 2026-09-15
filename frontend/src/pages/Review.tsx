import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardCheck, Eye, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { getLatestSessionReview } from '../services/api';
import type { SessionReview } from '../types/report';

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const severityStyle: Record<string, string> = {
  HIGH: 'text-accent border-accent/30 bg-accent/10',
  MEDIUM: 'text-warning border-warning/30 bg-warning/10',
  LOW: 'text-primary border-primary/30 bg-primary/10',
  INFO: 'text-muted border-border bg-background',
};

export default function Review() {
  const [report, setReport] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getLatestSessionReview()
      .then(setReport)
      .catch((requestError) => {
        const message = requestError?.response?.status === 404
          ? 'No lab session is available yet. Start and stop an authorized lab, then return here.'
          : 'The session review is unavailable. Confirm that the backend is running.';
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getLatestSessionReview()
      .then((nextReport) => {
        if (active) setReport(nextReport);
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError?.response?.status === 404
          ? 'No lab session is available yet. Start and stop an authorized lab, then return here.'
          : 'The session review is unavailable. Confirm that the backend is running.';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="p-8 text-muted">Building the latest session review…</div>;
  if (error || !report) return (
    <div className="bg-surface border border-border rounded-2xl p-8 text-center">
      <ClipboardCheck className="text-muted mx-auto" size={38} />
      <h1 className="text-xl font-bold text-text mt-4">No review available</h1>
      <p className="text-muted mt-2">{error}</p>
      <button type="button" onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white font-semibold"><RefreshCw size={17} />Try again</button>
    </div>
  );

  const scoreColor = report.trust_score.value >= 80 ? 'text-success' : report.trust_score.value >= 60 ? 'text-warning' : 'text-accent';
  const sessionDate = new Date(report.session.started_at).toLocaleString();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Phase 8 · End of lab review</p>
          <h1 className="text-3xl font-bold text-text mt-1">Turn evidence into a safe next step</h1>
          <p className="text-muted mt-2 max-w-3xl">Review the latest session as a whole. The score summarizes recorded indicators; it never proves that a network is safe or malicious.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-text font-semibold hover:border-primary"><RefreshCw size={17} />Refresh review</button>
      </header>

      <section className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-muted">Network trust score</p>
          <div className={`w-44 h-44 rounded-full mt-5 flex items-center justify-center border-[14px] border-current ${scoreColor}`}>
            <div><span className="text-5xl font-bold">{report.trust_score.value}</span><span className="text-muted text-lg"> / 100</span></div>
          </div>
          <h2 className={`font-bold text-lg mt-5 ${scoreColor}`}>{report.trust_score.label}</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">{report.trust_score.explanation}</p>
          <span className="mt-4 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted">Evidence confidence: <strong className="text-text">{humanize(report.trust_score.confidence)}</strong></span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex flex-wrap justify-between gap-4 pb-5 border-b border-border">
            <div><p className="text-sm text-muted">Reviewed session</p><h2 className="text-xl font-bold text-text mt-1">{report.session.ssid}</h2><p className="text-sm text-muted mt-1">{sessionDate} · {report.session.interface}</p></div>
            <span className={`self-start rounded-full border px-3 py-1 text-sm font-semibold ${report.session.status === 'active' ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-background text-muted'}`}>{humanize(report.session.status)}</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            <div className="bg-background rounded-xl p-4"><Eye className="text-primary" size={20} /><p className="text-2xl font-bold text-text mt-3">{report.evidence.event_count}</p><p className="text-sm text-muted">Events reviewed</p></div>
            <div className="bg-background rounded-xl p-4"><Radio className="text-warning" size={20} /><p className="text-2xl font-bold text-text mt-3">{report.evidence.observed_protocols.length}</p><p className="text-sm text-muted">Protocols observed</p></div>
            <div className="bg-background rounded-xl p-4"><AlertTriangle className="text-accent" size={20} /><p className="text-2xl font-bold text-text mt-3">{report.findings.length}</p><p className="text-sm text-muted">Distinct findings</p></div>
          </div>
          <div className={`mt-5 rounded-xl border p-4 flex items-start gap-3 ${report.evidence.capture_complete ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`}>
            {report.evidence.capture_complete ? <CheckCircle2 className="text-success shrink-0" /> : <AlertTriangle className="text-warning shrink-0" />}
            <div><p className="font-semibold text-text">{report.evidence.capture_complete ? 'Capture completed without a recorded sniffer error' : 'Capture evidence is incomplete'}</p><p className="text-sm text-muted mt-1">{report.evidence.capture_complete ? 'Use the indicators below together with the known lab baseline.' : 'The score may miss network activity. Repeat the session after capture access is restored.'}</p></div>
          </div>
          <div className="mt-5"><p className="text-sm font-semibold text-text">Protocols in the evidence</p><div className="flex flex-wrap gap-2 mt-2">{report.evidence.observed_protocols.length ? report.evidence.observed_protocols.map((protocol) => <span key={protocol} className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-semibold">{protocol}</span>) : <span className="text-sm text-muted">No classified packet events were recorded.</span>}</div></div>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border"><h2 className="text-xl font-bold text-text">Why the score changed</h2><p className="text-sm text-muted mt-1">Each distinct indicator affects the score once so repeated events do not exaggerate the result.</p></div>
        {report.findings.length === 0 ? (
          <div className="p-8 text-center"><ShieldCheck className="mx-auto text-success" size={34} /><p className="font-semibold text-text mt-3">No scored indicators were recorded</p><p className="text-sm text-muted mt-1">This means only that the current evidence did not trigger a rule.</p></div>
        ) : (
          <div className="divide-y divide-border">{report.findings.map((finding) => <article key={finding.alert_type} className="p-5 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-text">{humanize(finding.alert_type)}</h3><span className={`text-xs font-bold rounded border px-2 py-0.5 ${severityStyle[finding.severity] || severityStyle.INFO}`}>{finding.severity}</span></div><p className="text-sm text-muted mt-2">{finding.message}</p></div><span className="font-bold text-accent">{finding.score_impact} points</span></article>)}</div>
        )}
      </section>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2"><BookOpen className="text-primary" /><h2 className="text-xl font-bold text-text">Concepts observed</h2></div>
          <p className="text-sm text-muted mt-1">Lessons connected to events from this session.</p>
          <div className="divide-y divide-border mt-4">{report.concepts_reviewed.length ? report.concepts_reviewed.map((concept) => <details key={concept.event_type} className="py-4"><summary className="cursor-pointer font-semibold text-text">{concept.concept} <span className="font-normal text-muted">· {humanize(concept.event_type)}</span></summary><p className="text-sm text-muted leading-relaxed mt-3">{concept.what_happened}</p><p className="text-sm text-success leading-relaxed mt-2"><strong>Protect yourself:</strong> {concept.how_to_protect}</p></details>) : <p className="text-sm text-muted py-6">No event concepts were recorded.</p>}</div>
        </section>

        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2"><ClipboardCheck className="text-success" /><h2 className="text-xl font-bold text-text">Recommended next steps</h2></div>
          <ol className="mt-5 space-y-4">{report.next_steps.map((step, index) => <li key={step} className="flex gap-3"><span className="w-7 h-7 rounded-full bg-success/10 text-success flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</span><p className="text-muted leading-relaxed">{step}</p></li>)}</ol>
        </section>
      </div>
    </div>
  );
}
