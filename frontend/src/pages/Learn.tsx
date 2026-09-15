import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronRight, Clock, Lightbulb, ShieldCheck } from 'lucide-react';
import { getLearningModules } from '../services/api';
import type { LearningModule } from '../types/education';

const PROGRESS_KEY = 'evilwifi-learning-progress';

function readProgress(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export default function Learn() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [completed, setCompleted] = useState<string[]>(readProgress);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getLearningModules()
      .then((items: LearningModule[]) => {
        setModules(items);
        setSelectedId((current) => current || items[0]?.id || '');
      })
      .catch(() => setError('The learning modules are unavailable. Confirm that the backend is running.'));
  }, []);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
  }, [completed]);

  const selected = useMemo(
    () => modules.find((module) => module.id === selectedId) || modules[0],
    [modules, selectedId],
  );
  const correct = selected && answer === selected.check.correct_index;
  const progress = modules.length ? Math.round((completed.length / modules.length) * 100) : 0;

  const chooseModule = (id: string) => {
    setSelectedId(id);
    setAnswer(null);
    setChecked(false);
  };

  const checkAnswer = () => {
    if (answer === null || !selected) return;
    setChecked(true);
    if (answer === selected.check.correct_index) {
      setCompleted((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    }
  };

  const openNext = () => {
    if (!selected) return;
    const currentIndex = modules.findIndex((module) => module.id === selected.id);
    const next = modules[currentIndex + 1];
    if (next) chooseModule(next.id);
  };

  if (error) return <div className="bg-accent/10 border border-accent/30 text-accent rounded-xl p-5">{error}</div>;
  if (!selected) return <div className="text-muted p-8">Loading the learning path…</div>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Phase 7 · Educational mode</p>
        <h1 className="text-3xl font-bold text-text mt-1">Understand what the lab observed</h1>
        <p className="text-muted mt-2 max-w-3xl">Short lessons connect packet evidence to practical Wi-Fi safety. Progress stays in this browser and no personal answers are sent to the backend.</p>
      </header>

      <section className="bg-surface border border-border rounded-2xl p-5" aria-label="Learning progress">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-semibold text-text">Course progress</p><p className="text-sm text-muted">{completed.length} of {modules.length} modules completed</p></div>
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-background rounded-full mt-4 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      </section>

      <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 items-start">
        <nav className="bg-surface border border-border rounded-2xl p-3 space-y-2" aria-label="Learning modules">
          {modules.map((module, index) => {
            const done = completed.includes(module.id);
            const active = module.id === selected.id;
            return (
              <button key={module.id} type="button" onClick={() => chooseModule(module.id)} className={`w-full text-left rounded-xl p-4 border transition-colors ${active ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border hover:bg-background/60'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${done ? 'bg-success text-background' : 'bg-background text-muted'}`}>{done ? <Check size={17} /> : index + 1}</span>
                  <div><p className="font-semibold text-text">{module.title}</p><p className="text-xs text-muted mt-1">{module.duration_minutes} min</p></div>
                </div>
              </button>
            );
          })}
        </nav>

        <main className="space-y-5">
          <section className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><BookOpen className="text-primary" /><h2 className="text-2xl font-bold text-text">{selected.title}</h2></div>
              <span className="flex items-center gap-1.5 text-sm text-muted"><Clock size={16} />{selected.duration_minutes} minutes</span>
            </div>
            <p className="text-muted mt-3 text-base leading-relaxed">{selected.summary}</p>
            <div className="bg-background/70 border border-border rounded-xl p-4 mt-5">
              <p className="text-sm font-bold text-primary uppercase tracking-wide">You will learn to</p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {selected.objectives.map((objective) => <li key={objective} className="flex gap-2 text-sm text-text"><Check size={16} className="text-success mt-0.5 shrink-0" />{objective}</li>)}
              </ul>
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6" aria-labelledby="lesson-steps">
            <h2 id="lesson-steps" className="text-xl font-bold text-text">Follow the workflow</h2>
            <div className="mt-5 space-y-4">
              {selected.steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">{index + 1}</span>
                  <div><h3 className="font-semibold text-text">{step.title}</h3><p className="text-muted mt-1 leading-relaxed">{step.body}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6" aria-labelledby="knowledge-check">
            <div className="flex items-center gap-2"><Lightbulb className="text-warning" /><h2 id="knowledge-check" className="text-xl font-bold text-text">Knowledge check</h2></div>
            <p className="text-text font-semibold mt-4">{selected.check.question}</p>
            <div className="space-y-2 mt-4">
              {selected.check.options.map((option, index) => (
                <label key={option} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer ${answer === index ? 'border-primary bg-primary/10' : 'border-border bg-background/50'}`}>
                  <input type="radio" name={`check-${selected.id}`} checked={answer === index} onChange={() => { setAnswer(index); setChecked(false); }} className="mt-1 accent-primary" />
                  <span className="text-text">{option}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={checkAnswer} disabled={answer === null} className="mt-4 bg-primary text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-40">Check answer</button>
            {checked && (
              <div role="status" className={`mt-4 rounded-xl border p-4 ${correct ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
                <p className={`font-bold ${correct ? 'text-success' : 'text-warning'}`}>{correct ? 'Correct — module complete' : 'Not quite — review the lesson and try again'}</p>
                <p className="text-sm text-muted mt-1">{selected.check.explanation}</p>
              </div>
            )}
            {correct && modules.findIndex((module) => module.id === selected.id) < modules.length - 1 && (
              <button type="button" onClick={openNext} className="mt-4 flex items-center gap-2 text-primary font-semibold">Continue to next module <ChevronRight size={18} /></button>
            )}
            {correct && completed.length === modules.length && <p className="mt-4 flex items-center gap-2 text-success font-semibold"><ShieldCheck size={20} />Learning path complete. Apply these checks whenever a network seems unfamiliar.</p>}
          </section>
        </main>
      </div>
    </div>
  );
}
