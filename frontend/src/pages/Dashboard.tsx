import { useState, useEffect } from 'react';
import { Activity, Smartphone, Wifi, AlertTriangle, Network, Ghost } from 'lucide-react';
import { getLabStatus } from '../services/api';
import { wsService } from '../services/websocket';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
    <div className={`p-4 rounded-lg bg-${color}/10 text-${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-muted text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-text">{value}</h3>
    </div>
  </div>
);

export default function Dashboard() {
  const [labState, setLabState] = useState<any>({ status: 'stopped', mode: 'NETWORK_LAB' });
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // A simple set to track unique devices connecting
  const [devices, setDevices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getLabStatus();
        setLabState(data);
      } catch (e) {
        console.error("Failed to fetch lab status", e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    wsService.connect();
    
    const unsubscribe = wsService.subscribe((data) => {
      if (data.is_alert) {
        setAlerts((prev) => [data, ...prev]);
      } else {
        setEvents((prev) => [data, ...prev]);
        if (data.device_id) {
          setDevices((prev) => new Set(prev).add(data.device_id));
        }
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  const isRunning = labState.status === 'running';
  const isEvilTwin = labState.mode === 'EVIL_TWIN';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-muted mt-2">Overview of your simulated network environment.</p>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
          isEvilTwin ? 'border-accent/50 bg-accent/10 text-accent' : 'border-primary/50 bg-primary/10 text-primary'
        }`}>
          {isEvilTwin ? <Ghost size={20} /> : <Network size={20} />}
          <span className="font-semibold">
            {isEvilTwin ? 'Evil Twin Simulation' : 'Network Lab Mode'}
          </span>
        </div>
      </header>

      {isEvilTwin && isRunning && (
        <div className="bg-accent/10 border border-accent/50 p-4 rounded-xl flex items-start gap-4">
          <AlertTriangle className="text-accent flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-accent font-bold">Evil Twin Detection Active</h3>
            <p className="text-sm text-accent/80 mt-1">
              Monitoring environment for multiple BSSIDs advertising the target SSID. Authentication laboratory is active.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="AP Status" 
          value={isRunning ? "Active" : "Offline"} 
          icon={Wifi} 
          color={isRunning ? "success" : "muted"} 
        />
        <StatCard title="Connected Devices" value={devices.size.toString()} icon={Smartphone} color="primary" />
        <StatCard title="Total Events" value={events.length.toString()} icon={Activity} color="warning" />
        <StatCard title="Alerts" value={alerts.length.toString()} icon={AlertTriangle} color="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-surface p-6 rounded-xl border border-border min-h-[300px]">
          <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted">
              No recent events recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((ev, i) => (
                <div key={i} className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="font-medium text-text">{ev.event_type}</span>
                  <span className="text-xs text-muted">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-surface p-6 rounded-xl border border-border min-h-[300px]">
          <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted">
              No alerts detected.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.slice(0, 5).map((al, i) => (
                <div key={i} className="flex justify-between items-start pb-2 border-b border-border/50">
                  <div>
                    <span className="font-medium text-accent block">{al.alert_type}</span>
                    <span className="text-sm text-text/80">{al.message}</span>
                  </div>
                  <span className="text-xs text-muted">{new Date(al.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}