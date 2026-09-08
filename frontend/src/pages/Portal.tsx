import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Coffee, Eye, ShieldAlert, Wifi } from 'lucide-react';
import { enterTrainingSession, getPortalStatus, openTrainingPortal } from '../services/api';

type PortalStatus = {
  available: boolean;
  ssid: string | null;
  training_user: string;
  training_token: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' && error !== null && 'response' in error &&
    typeof error.response === 'object' && error.response !== null && 'data' in error.response
  ) {
    const data = error.response.data as { detail?: string };
    return data.detail || fallback;
  }
  return fallback;
};

export default function Portal() {
  const [portal, setPortal] = useState<PortalStatus | null>(null);
  const [trainingUser, setTrainingUser] = useState('');
  const [trainingToken, setTrainingToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const initializePortal = async () => {
      try {
        const status: PortalStatus = await getPortalStatus();
        if (!active) return;
        setPortal(status);
        setTrainingUser(status.training_user);
        setTrainingToken(status.training_token);
        if (status.available) await openTrainingPortal();
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, 'Unable to load the training portal.'));
      }
    };

    void initializePortal();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await enterTrainingSession(trainingUser, trainingToken);
      setTrainingToken('');
      setIsComplete(true);
    } catch (requestError) {
      setTrainingToken('');
      setError(getErrorMessage(requestError, 'The synthetic training session was not accepted.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <section className="max-w-2xl w-full bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl p-8 sm:p-10">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-5" />
          <p className="text-emerald-400 font-semibold tracking-wide uppercase text-sm">Simulation complete</p>
          <h1 className="text-3xl font-bold mt-2">That page looked believable on purpose.</h1>
          <p className="text-slate-300 mt-4 leading-relaxed">
            A network name and polished portal do not prove who operates the access point. This lab accepted only
            the displayed synthetic token and did not store the values you submitted.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-7">
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
              <h2 className="font-semibold text-amber-300">Warning signs</h2>
              <p className="text-sm text-slate-400 mt-2">An unexpected sign-in page, duplicate SSID, or request for a familiar password.</p>
            </div>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
              <h2 className="font-semibold text-emerald-300">Safer response</h2>
              <p className="text-sm text-slate-400 mt-2">Disconnect, verify the network with staff, and never reuse a real password in a Wi-Fi portal.</p>
            </div>
          </div>
          <Link to="/events" className="mt-8 inline-flex items-center justify-center w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400">
            Review the lab event
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-950 via-slate-950 to-slate-900 text-slate-900 flex flex-col">
      <div className="bg-red-600 text-white py-3 px-4 flex items-center justify-center gap-3 shadow-lg">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <p className="font-bold text-center text-sm sm:text-base">LAB ONLY — Never enter a real username, password, or token.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-5">
        <section className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/30">
          <header className="bg-amber-50 p-7 text-center border-b border-amber-100">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-8 h-8 text-amber-700" />
            </div>
            <p className="text-xs font-bold tracking-widest text-red-600 uppercase">Security training simulation</p>
            <h1 className="text-2xl font-bold mt-2">Coffee Shop Guest Wi-Fi</h1>
            <p className="text-slate-500 mt-2">Network: {portal?.ssid || 'Lab network unavailable'}</p>
          </header>

          <div className="p-7">
            {portal && !portal.available && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm">
                Start the lab in <strong>Evil Twin</strong> mode before using this portal.
                <Link to="/lab" className="block font-semibold underline mt-2">Go to Laboratory Control</Link>
              </div>
            )}

            {error && <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="training-user" className="block text-sm font-medium mb-1">Training user</label>
                <input id="training-user" value={trainingUser} onChange={(event) => setTrainingUser(event.target.value)} disabled={!portal?.available || isSubmitting} required autoComplete="off" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-600 outline-none disabled:bg-slate-100" />
              </div>
              <div>
                <label htmlFor="training-token" className="block text-sm font-medium mb-1">Synthetic training token</label>
                <input id="training-token" type="text" value={trainingToken} onChange={(event) => setTrainingToken(event.target.value)} disabled={!portal?.available || isSubmitting} required autoComplete="off" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-600 outline-none disabled:bg-slate-100" />
              </div>

              <div className="bg-blue-50 text-blue-900 text-sm p-4 rounded-xl border border-blue-100">
                <p className="font-semibold flex items-center gap-2"><Eye size={16} /> Use only these displayed test values</p>
                <p className="font-mono mt-2">{portal?.training_user || 'training-user'}</p>
                <p className="font-mono">{portal?.training_token || 'training-token'}</p>
              </div>

              <button type="submit" disabled={!portal?.available || isSubmitting} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-400 disabled:cursor-not-allowed">
                <Wifi className="w-5 h-5" />
                {isSubmitting ? 'Checking training token…' : 'Enter test session'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">No internet access is granted. No submitted values are retained.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
