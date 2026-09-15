import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, Network, Ghost, ExternalLink, Wifi } from 'lucide-react';
import { AuthorizationModal } from '../components/AuthorizationModal';
import { getLabStatus, getNetworkInterfaces, startLab, stopLab } from '../services/api';

export default function Lab() {
  const [isRunning, setIsRunning] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'NETWORK_LAB' | 'EVIL_TWIN'>('NETWORK_LAB');
  const [ssid, setSsid] = useState('FahdWiFi-Lab');
  const [networkInterface, setNetworkInterface] = useState('');
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [wirelessReady, setWirelessReady] = useState(false);
  const [usbWirelessInterfaces, setUsbWirelessInterfaces] = useState<string[]>([]);
  const [readinessIssues, setReadinessIssues] = useState<string[]>([]);
  const [captureStatus, setCaptureStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [captureError, setCaptureError] = useState<string | null>(null);

  // On mount, check if already running
  useEffect(() => {
    Promise.all([getLabStatus(), getNetworkInterfaces()]).then(([lab, interfaceData]) => {
      setIsRunning(lab.status === 'running');
      if (lab.mode) setSelectedMode(lab.mode);
      if (lab.ssid) setSsid(lab.ssid);
      setCaptureStatus(lab.capture_status || 'stopped');
      setCaptureError(lab.capture_error || null);
      const detected = interfaceData.interfaces as string[];
      setInterfaces(detected);
      setNetworkInterface(lab.interface || interfaceData.recommended || '');
      setWirelessReady(Boolean(interfaceData.wireless_ready));
      setUsbWirelessInterfaces(interfaceData.usb_wireless_interfaces || []);
      setReadinessIssues(interfaceData.issues || []);
    }).catch(() => setError('Unable to load laboratory configuration. Check that the backend is running.'));
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      getLabStatus().then((lab) => {
        setCaptureStatus(lab.capture_status || 'running');
        setCaptureError(lab.capture_error || null);
      }).catch(() => {
        // The main error state handles explicit start/stop failures.
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const startConfiguredLab = async () => {
    setError('');
    try {
      const result = await startLab(selectedMode, true, ssid.trim(), networkInterface);
      setIsRunning(true);
      setCaptureStatus(result.capture_status || 'running');
      setCaptureError(result.capture_error || null);
    } catch (requestError) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError.response as { data?: { detail?: string } })?.data?.detail
        : undefined;
      setError(message || 'The laboratory could not start. Check the selected interface and try again.');
    }
  };

  const handleStartLab = async () => {
    if (!isAuthorized) {
      setShowAuthModal(true);
      return;
    }

    await startConfiguredLab();
  };

  const handleStopLab = async () => {
    try {
      const result = await stopLab();
      setIsRunning(false);
      setCaptureStatus(result.capture_status || 'stopped');
      setCaptureError(null);
    } catch {
      setError('The laboratory could not be stopped. Check the backend connection.');
    }
  };

  const handleAuthorize = () => {
    setIsAuthorized(true);
    setShowAuthModal(false);
    void startConfiguredLab();
  };

  return (
    <>
      {showAuthModal && (
        <AuthorizationModal 
          onAuthorize={handleAuthorize} 
          onCancel={() => setShowAuthModal(false)} 
        />
      )}
      
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-text">Laboratory Control</h1>
          <p className="text-muted mt-2">Manage the rogue access point and simulation settings.</p>
        </header>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 max-w-5xl" aria-label="Laboratory workflow">
          {[
            ['1', 'Choose a mode', 'Network Lab teaches normal traffic. Evil Twin adds the safe portal lesson.'],
            ['2', 'Confirm authorization', 'Use only an isolated lab and devices you own or may test.'],
            ['3', 'Generate traffic', 'Connect the test device and make a DNS lookup or web request.'],
            ['4', 'Read the result', 'Open Events for the timeline, then Packet Lab for protocol explanations.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="bg-surface border border-border rounded-xl p-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Step {number}</span>
              <h2 className="font-semibold text-text mt-2">{title}</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">{copy}</p>
            </div>
          ))}
        </section>

        {error && <div role="alert" className="max-w-2xl p-4 rounded-xl border border-accent/40 bg-accent/10 text-accent">{error}</div>}

        {captureStatus === 'error' && captureError && (
          <div role="alert" className="max-w-2xl p-4 rounded-xl border border-accent/40 bg-accent/10 text-accent">
            <strong>Capture stopped:</strong> {captureError}
          </div>
        )}

        <section className={`max-w-2xl rounded-xl border p-4 ${wirelessReady ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`} aria-label="Wireless capture readiness">
          <div className="flex items-start gap-3">
            <Wifi className={wirelessReady ? 'text-success' : 'text-warning'} size={22} />
            <div>
              <h2 className="font-semibold text-text">{wirelessReady ? 'Wireless capture ready' : 'Wireless capture needs attention'}</h2>
              {wirelessReady ? (
                <p className="text-sm text-muted mt-1">Ready interface: <span className="font-mono text-text">{usbWirelessInterfaces[0] || networkInterface}</span></p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-muted list-disc pl-5">
                  {readinessIssues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
              {!wirelessReady && <p className="text-xs text-muted mt-2">You may still use Ethernet or loopback for protocol-learning tests; wireless-specific testing requires a visible Wi-Fi interface and capture permission.</p>}
            </div>
          </div>
        </section>

        <div className="bg-surface p-8 rounded-xl border border-border max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold">Access Point Status</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-muted'}`}></span>
                <span className={isRunning ? 'text-success font-medium' : 'text-muted'}>
                  {isRunning ? 'Lab active' : 'Offline'}
                </span>
              </div>
            </div>

            <button
              onClick={isRunning ? handleStopLab : handleStartLab}
              disabled={!isRunning && (!ssid.trim() || !networkInterface)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isRunning 
                  ? 'bg-accent/10 text-accent hover:bg-accent/20' 
                  : 'bg-success/10 text-success hover:bg-success/20'
              }`}
            >
              {isRunning ? <Square size={20} /> : <Play size={20} />}
              {isRunning ? 'Stop Lab' : 'Start Lab'}
            </button>
          </div>

          <div className="space-y-6">
            {isRunning && selectedMode === 'EVIL_TWIN' && (
              <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-text">Educational portal is ready</p>
                  <p className="text-sm text-muted mt-1">Use only the synthetic identity displayed on the portal.</p>
                </div>
                <Link to="/portal" className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-background font-semibold hover:opacity-90">
                  Open portal <ExternalLink size={16} />
                </Link>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted mb-3">Simulation Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button"
                  onClick={() => !isRunning && setSelectedMode('NETWORK_LAB')}
                  disabled={isRunning}
                  className={`text-left p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'NETWORK_LAB' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-background hover:border-muted'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Network className={selectedMode === 'NETWORK_LAB' ? 'text-primary' : 'text-muted'} size={24} />
                  <h3 className={`font-semibold mt-3 ${selectedMode === 'NETWORK_LAB' ? 'text-primary' : 'text-text'}`}>Network Lab</h3>
                  <p className="text-xs text-muted mt-1">Controlled Wi-Fi laboratory for understanding post-connection behavior.</p>
                </button>

                <button type="button"
                  onClick={() => !isRunning && setSelectedMode('EVIL_TWIN')}
                  disabled={isRunning}
                  className={`text-left p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'EVIL_TWIN' 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border bg-background hover:border-muted'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Ghost className={selectedMode === 'EVIL_TWIN' ? 'text-accent' : 'text-muted'} size={24} />
                  <h3 className={`font-semibold mt-3 ${selectedMode === 'EVIL_TWIN' ? 'text-accent' : 'text-text'}`}>Evil Twin</h3>
                  <p className="text-xs text-muted mt-1">SSID impersonation and synthetic authentication demonstration.</p>
                </button>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Target SSID</label>
              <input 
                type="text" 
                value={ssid}
                onChange={(event) => setSsid(event.target.value)}
                maxLength={32}
                disabled={isRunning}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="network-interface" className="block text-sm font-medium text-muted mb-1">Capture Interface</label>
              <select
                id="network-interface"
                value={networkInterface}
                onChange={(event) => setNetworkInterface(event.target.value)}
                disabled={isRunning}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary disabled:opacity-50"
              >
                {interfaces.length === 0 && <option value="">No interface detected</option>}
                {interfaces.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <p className="text-xs text-muted mt-2">Choose the isolated interface carrying your authorized test traffic. Loopback (<span className="font-mono">lo</span>) is usually only useful for local service testing.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
