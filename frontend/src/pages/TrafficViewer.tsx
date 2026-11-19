import { useEffect, useState } from 'react';
import {
  Activity,
  Lock,
  Globe,
  Wifi,
  ShieldAlert,
  BarChart3,
  Network,
} from 'lucide-react';
import { getTrafficSummary } from '../services/api';
import { wsService } from '../services/websocket';
import type { StreamEvent } from '../types/event';

type Flow = {
  time: string | null;
  protocol: string;
  category: string;
  destination: string;
  encrypted: boolean | null;
  visibility: string;
  bytes: number;
  event_type: string;
};

type TrafficSummary = {
  totals: {
    flows: number;
    encrypted_flows: number;
    visible_flows: number;
    total_bytes: number;
  };
  protocol_counts: Record<string, number>;
  category_counts: Record<string, number>;
  top_destinations: Array<{ destination: string; count: number }>;
  flows: Flow[];
};

const statColor = (label: string) => {
  if (label.toLowerCase().includes('encrypted') || label === 'TLS') {
    return 'text-success';
  }
  if (label.toLowerCase().includes('visible') || label === 'HTTP') {
    return 'text-accent';
  }
  return 'text-primary';
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: typeof Icon;
  color: string;
}) => (
  <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
    <div className={`p-4 rounded-lg ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-muted text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-text">{value}</h3>
    </div>
  </div>
);

export default function TrafficViewer() {
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTrafficSummary(500);
      setSummary(data);
    } catch (requestError) {
      setError(
        'Unable to load traffic summary. Confirm the backend is running on port 8000.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    wsService.connect();
    const unsubscribe = wsService.subscribe((data: StreamEvent) => {
      if (!data.is_alert && data.event_type) {
        // Refresh the summary when a new traffic event arrives so the
        // viewer stays live without manual reload.
        load();
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-muted flex flex-col items-center gap-3">
        <Activity className="animate-spin" size={32} />
        <p>Building network viewer…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <ShieldAlert className="text-accent mx-auto" size={38} />
        <h1 className="text-xl font-bold text-text mt-4">Traffic viewer unavailable</h1>
        <p className="text-muted mt-2">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white font-semibold"
        >
          <Activity size={17} /> Try again
        </button>
      </div>
    );
  }

  const { totals, protocol_counts, category_counts, top_destinations, flows } =
    summary;

  const recentFlows = flows.slice(0, 20);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Network Viewer</h1>
          <p className="text-muted mt-2">
            See what traffic is moving across the lab network, which web apps
            and domains devices are contacting, and how much is plaintext vs
            encrypted.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-primary/50 bg-primary/10 text-primary">
          <Network size={20} />
          <span className="font-semibold">Live traffic view</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total flows"
          value={totals.flows}
          icon={Activity}
          color="text-primary"
        />
        <StatCard
          title="Encrypted (TLS/HTTPS)"
          value={totals.encrypted_flows}
          icon={Lock}
          color="text-success"
        />
        <StatCard
          title="Visible (HTTP/DNS)"
          value={totals.visible_flows}
          icon={Globe}
          color="text-accent"
        />
        <StatCard
          title="Total bytes"
          value={totals.total_bytes.toLocaleString()}
          icon={BarChart3}
          color="text-warning"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-xl font-bold text-text">Protocols observed</h2>
            <p className="text-sm text-muted mt-1">
              Breakdown by protocol across the current session.
            </p>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(protocol_counts).length === 0 ? (
              <p className="text-muted text-center py-8">No protocol data yet.</p>
            ) : (
              Object.entries(protocol_counts).map(([protocol, count]) => (
                <div key={protocol} className="flex justify-between items-center p-3 rounded-lg border border-border/50">
                  <div>
                    <p className="font-semibold text-text">{protocol}</p>
                    <p className="text-xs text-muted">{count} flow{count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${statColor(protocol)}`}>
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-xl font-bold text-text">Top destinations</h2>
            <p className="text-sm text-muted mt-1">
              Domains and hosts devices are contacting most often.
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-auto">
            {top_destinations.length === 0 ? (
              <p className="text-muted text-center py-8">No destinations yet.</p>
            ) : (
              top_destinations.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-border/50">
                  <div>
                    <p className="font-semibold text-text truncate max-w-[14rem]">
                      {item.destination}
                    </p>
                    <p className="text-xs text-muted">
                      {item.count} connection{item.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-2xl overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text">Live traffic flows</h2>
              <p className="text-sm text-muted mt-1">
                Most recent observed traffic from captured packets.
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded border ${
              totals.visible_flows > totals.encrypted_flows
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-success/30 bg-success/10 text-success'
            }`}>
              {totals.visible_flows > totals.encrypted_flows
                ? 'More plaintext than encrypted'
                : 'Mostly encrypted traffic'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  <th className="p-4 font-medium text-muted w-32">Time</th>
                  <th className="p-4 font-medium text-muted">Protocol</th>
                  <th className="p-4 font-medium text-muted w-48">Destination</th>
                  <th className="p-4 font-medium text-muted w-20">Type</th>
                  <th className="p-4 font-medium text-muted w-24">Bytes</th>
                </tr>
              </thead>
              <tbody>
                {recentFlows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      No traffic flows captured yet. Start the lab and generate
                      test traffic to see it here.
                    </td>
                  </tr>
                ) : (
                  recentFlows.map((flow, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-background/30 transition-colors"
                    >
                      <td className="p-4 text-muted text-sm align-top pt-5">
                        {flow.time ? new Date(flow.time).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-4 align-top pt-5">
                        <span className={`font-semibold ${statColor(flow.protocol)}`}>
                          {flow.protocol}
                        </span>
                      </td>
                      <td className="p-4 align-top pt-5">
                        <span className="font-medium text-text truncate max-w-[16rem] block">
                          {flow.destination}
                        </span>
                        <span className="text-xs text-muted block mt-0.5">
                          {flow.category}
                        </span>
                      </td>
                      <td className="p-4 align-top pt-5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
                          flow.encrypted
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-accent/30 bg-accent/10 text-accent'
                        }`}>
                          {flow.encrypted ? <Lock size={12} /> : <Globe size={12} />}
                          {flow.encrypted ? 'Encrypted' : 'Visible'}
                        </span>
                      </td>
                      <td className="p-4 text-muted align-top pt-5 font-mono">
                        {flow.bytes.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-text mb-3">What this view means</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <strong>Encrypted (TLS/HTTPS):</strong> application content is
            protected, but destination names (SNI) and connection metadata may
            still be visible.
          </li>
          <li>
            <strong>Visible (HTTP/DNS):</strong> hosts, paths, and query names
            can be read or modified by anyone on the network path.
          </li>
          <li>
            Use this view to understand what an untrusted Wi-Fi network can
            observe about your device, not to judge whether a specific site is
            safe.
          </li>
        </ul>
      </div>
    </div>
  );
}
