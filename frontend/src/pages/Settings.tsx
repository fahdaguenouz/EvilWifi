import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text">Settings & Demonstrations</h1>
        <p className="text-muted mt-2">Safety boundaries and educational tools for the simulator.</p>
      </header>

      <div className="bg-surface p-8 rounded-xl border border-border max-w-2xl space-y-6">
        <section>
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="text-success" />
            <h2 className="text-xl font-semibold">Educational Captive Portal</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            The portal accepts only the fixed values <span className="font-mono text-text">training-user</span> and{' '}
            <span className="font-mono text-text">training-token</span>. Submitted values are checked in memory and are
            never written to the event database, even when rejected.
          </p>
          <div className="mt-4 p-4 rounded-lg border border-warning/30 bg-warning/10 text-sm">
            Start an authorized lab in <strong>Evil Twin</strong> mode before opening the simulation. Never enter a real credential.
          </div>
          <Link to="/portal" className="mt-5 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Open training portal <ExternalLink size={16} />
          </Link>
        </section>

        <hr className="border-border" />

        <section>
          <h2 className="text-xl font-semibold mb-3">Isolation</h2>
          <p className="text-muted">The portal grants no internet access and never redirects to a third-party website.</p>
        </section>
      </div>
    </div>
  );
}
