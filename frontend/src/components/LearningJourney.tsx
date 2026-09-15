import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

type LearningJourneyProps = {
  isRunning: boolean;
  mode?: 'NETWORK_LAB' | 'EVIL_TWIN';
  eventTypes: string[];
};

export function LearningJourney({ isRunning, mode, eventTypes }: LearningJourneyProps) {
  const hasTraffic = eventTypes.some((type) => ['arp_request', 'dhcp_request', 'dns_query', 'http_request', 'tls_connection'].includes(type));
  const portalComplete = eventTypes.includes('test_form_submitted');

  const steps = [
    { title: 'Start the lab', detail: 'Choose a mode and confirm authorization.', href: '/lab', complete: isRunning, ready: !isRunning },
    { title: 'Observe traffic', detail: 'Watch the device request network access.', href: '/events', complete: hasTraffic, ready: isRunning && !hasTraffic },
    {
      title: mode === 'EVIL_TWIN' ? 'Try the safe portal' : 'Compare the portal',
      detail: mode === 'EVIL_TWIN' ? 'Use only the displayed synthetic token.' : 'Available when Evil Twin mode is active.',
      href: mode === 'EVIL_TWIN' ? '/portal' : '/lab',
      complete: portalComplete,
      ready: mode === 'EVIL_TWIN' && isRunning && hasTraffic && !portalComplete,
    },
    { title: 'Analyze protocols', detail: 'Compare what is visible and encrypted.', href: '/analysis', complete: false, ready: hasTraffic },
    { title: 'Review detections', detail: 'Investigate indicators and choose a safe response.', href: '/detections', complete: false, ready: hasTraffic },
    { title: 'Complete the lessons', detail: 'Turn each observation into a practical safety habit.', href: '/learn', complete: false, ready: true },
    { title: 'Review the session', detail: 'Combine evidence, confidence, findings, and next steps.', href: '/review', complete: false, ready: eventTypes.length > 0 },
  ];

  return (
    <section className="bg-surface border border-border rounded-2xl p-5" aria-labelledby="journey-title">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold text-primary">Guided lab journey</p>
          <h2 id="journey-title" className="text-xl font-bold text-text mt-1">Know where you are and what to do next</h2>
        </div>
        <span className="text-sm text-muted hidden sm:block">Learn by following the traffic</span>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
        {steps.map((step, index) => (
          <Link key={step.title} to={step.href} className={`group rounded-xl border p-4 transition-colors ${step.ready ? 'border-primary/60 bg-primary/10' : 'border-border bg-background/60 hover:border-muted'}`}>
            <div className="flex items-center justify-between">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step.complete ? 'bg-success text-background' : step.ready ? 'bg-primary text-white' : 'bg-border text-muted'}`}>
                {step.complete ? <Check size={16} /> : index + 1}
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${step.complete ? 'text-success' : step.ready ? 'text-primary' : 'text-muted'}`}>
                {step.complete ? 'Done' : step.ready ? 'Next' : 'Later'}
              </span>
            </div>
            <h3 className="font-semibold text-text mt-4 flex items-center gap-1">{step.title}<ChevronRight size={15} className="opacity-0 group-hover:opacity-100" /></h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{step.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
