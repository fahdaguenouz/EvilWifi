import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { Activity, ShieldAlert, FileText, Wifi, Monitor } from 'lucide-react';

const EventIcon = ({ type, isAlert }: { type: string, isAlert?: boolean }) => {
  if (isAlert) return <ShieldAlert className="text-accent" size={20} />;
  
  switch(type) {
    case 'device_discovered': return <Monitor className="text-primary" size={20} />;
    case 'wifi_association': return <Wifi className="text-primary" size={20} />;
    case 'dhcp_request': return <Activity className="text-warning" size={20} />;
    case 'dns_query': return <FileText className="text-success" size={20} />;
    case 'http_request':
    case 'tls_connection': return <Activity className="text-blue-400" size={20} />;
    default: return <Activity className="text-muted" size={20} />;
  }
};

const EventExplanation = ({ type, metadata }: { type: string, metadata: any }) => {
  switch(type) {
    case 'device_discovered':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>A new device ({metadata.mac_hash}) was discovered probing for networks. 
             Even before connecting, devices send out probe requests containing their MAC address.</p>
        </div>
      );
    case 'wifi_association':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device successfully negotiated a wireless link ({metadata.protocol}) with the access point. 
             This is a Layer 2 connection, but the device doesn't have an IP address yet.</p>
        </div>
      );
    case 'dhcp_request':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device ({metadata.hostname}) is requesting an IP address. The Rogue AP will assign it an IP 
             ({metadata.requested_ip}), making itself the default gateway for all outgoing traffic.</p>
        </div>
      );
    case 'dns_query':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device is looking up the IP address for '{metadata.domain}'. Since the Rogue AP controls 
             DNS, it can redirect this request to a fake captive portal or phishing site.</p>
        </div>
      );
    case 'multiple_bssid':
      return (
        <div className="text-xs text-accent/80 mt-1 bg-accent/10 p-2 rounded border border-accent/20">
          <p className="font-semibold text-accent mb-1">Security Warning:</p>
          <p>Multiple access points are broadcasting the same SSID. This is a common indicator of an Evil Twin 
             attack, as the rogue AP tries to trick devices into connecting to it instead of the legitimate network.</p>
        </div>
      );
    default:
      return null;
  }
};

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    wsService.connect();
    
    const unsubscribe = wsService.subscribe((data) => {
      setEvents((prev) => [data, ...prev]);
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text">Event Log</h1>
        <p className="text-muted mt-2">Real-time stream of network and security events.</p>
      </header>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-background/50 border-b border-border">
            <tr>
              <th className="p-4 font-medium text-muted w-32">Time</th>
              <th className="p-4 font-medium text-muted w-10"></th>
              <th className="p-4 font-medium text-muted w-48">Type</th>
              <th className="p-4 font-medium text-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">
                  Waiting for events... Start the lab to capture traffic.
                </td>
              </tr>
            ) : (
              events.map((event, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                  <td className="p-4 text-muted text-sm align-top pt-5">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-4 align-top pt-5">
                    <EventIcon type={event.event_type || event.alert_type} isAlert={event.is_alert} />
                  </td>
                  <td className="p-4 align-top pt-5">
                    <span className={`font-semibold ${event.is_alert ? 'text-accent' : 'text-text'}`}>
                      {event.is_alert ? event.alert_type : event.event_type}
                    </span>
                    {event.is_alert && (
                      <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        Alert
                      </span>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    {event.is_alert ? (
                      <div className="text-sm text-text mb-1">{event.message}</div>
                    ) : (
                      <div className="text-sm font-mono text-muted mb-2 bg-background p-2 rounded">
                        {JSON.stringify(event.event_metadata)}
                      </div>
                    )}
                    <EventExplanation type={event.event_type || event.alert_type} metadata={event.event_metadata} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
