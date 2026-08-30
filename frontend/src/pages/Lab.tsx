import { useState, useEffect } from 'react';
import { Play, Square, Network, Ghost } from 'lucide-react';
import { AuthorizationModal } from '../components/AuthorizationModal';
import { getLabStatus, startLab, stopLab } from '../services/api';

export default function Lab() {
  const [isRunning, setIsRunning] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'NETWORK_LAB' | 'EVIL_TWIN'>('NETWORK_LAB');

  // On mount, check if already running
  useEffect(() => {
    getLabStatus().then((data) => {
      setIsRunning(data.status === 'running');
      if (data.mode) {
          setSelectedMode(data.mode);
      }
    });
  }, []);

  const handleStartLab = async () => {
    if (!isAuthorized) {
      setShowAuthModal(true);
      return;
    }

    try {
      await startLab(selectedMode, true);
      setIsRunning(true);
    } catch (e) {
      console.error("Failed to start lab", e);
    }
  };

  const handleStopLab = async () => {
    try {
      await stopLab();
      setIsRunning(false);
    } catch (e) {
      console.error("Failed to stop lab", e);
    }
  };

  const handleAuthorize = () => {
    setIsAuthorized(true);
    setShowAuthModal(false);
    // Automatically attempt start after authorization
    setTimeout(() => {
      startLab(selectedMode, true).then(() => setIsRunning(true)).catch(console.error);
    }, 100);
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

        <div className="bg-surface p-8 rounded-xl border border-border max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold">Access Point Status</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-muted'}`}></span>
                <span className={isRunning ? 'text-success font-medium' : 'text-muted'}>
                  {isRunning ? 'Broadcasting' : 'Offline'}
                </span>
              </div>
            </div>

            <button
              onClick={isRunning ? handleStopLab : handleStartLab}
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
            <div>
              <label className="block text-sm font-medium text-muted mb-3">Simulation Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => !isRunning && setSelectedMode('NETWORK_LAB')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'NETWORK_LAB' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-background hover:border-muted'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Network className={selectedMode === 'NETWORK_LAB' ? 'text-primary' : 'text-muted'} size={24} />
                  <h3 className={`font-semibold mt-3 ${selectedMode === 'NETWORK_LAB' ? 'text-primary' : 'text-text'}`}>Network Lab</h3>
                  <p className="text-xs text-muted mt-1">Controlled Wi-Fi laboratory for understanding post-connection behavior.</p>
                </div>

                <div 
                  onClick={() => !isRunning && setSelectedMode('EVIL_TWIN')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'EVIL_TWIN' 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border bg-background hover:border-muted'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Ghost className={selectedMode === 'EVIL_TWIN' ? 'text-accent' : 'text-muted'} size={24} />
                  <h3 className={`font-semibold mt-3 ${selectedMode === 'EVIL_TWIN' ? 'text-accent' : 'text-text'}`}>Evil Twin</h3>
                  <p className="text-xs text-muted mt-1">SSID impersonation and synthetic authentication demonstration.</p>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Target SSID</label>
              <input 
                type="text" 
                defaultValue="FahdWiFi-Lab" 
                disabled={isRunning}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Wireless Interface</label>
              <input 
                type="text" 
                defaultValue="wlan0" 
                disabled={isRunning}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
