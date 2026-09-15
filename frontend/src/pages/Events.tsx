import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { Activity, ShieldAlert, FileText, Wifi, Monitor, Radio, Globe, Lock } from 'lucide-react';
import type { EventMetadata, StreamEvent } from '../types/event';
import type { ProtocolAnalysis } from '../types/analysis';
import type { EducationalContext } from '../types/education';
import { getEvents } from '../services/api';

const EventIcon = ({ type, isAlert }: { type: string, isAlert?: boolean }) => {
  if (isAlert) return <ShieldAlert className="text-accent" size={20} />;
  
  switch(type) {
    case 'device_discovered': return <Monitor className="text-primary" size={20} />;
    case 'wifi_association': return <Wifi className="text-primary" size={20} />;
    case 'dhcp_request': return <Activity className="text-warning" size={20} />;
    case 'network_configuration': return <Activity className="text-warning" size={20} />;
    case 'dns_query': return <FileText className="text-success" size={20} />;
    case 'arp_request': return <Radio className="text-purple-400" size={20} />;
    case 'http_request': return <Globe className="text-blue-400" size={20} />;
    case 'tls_connection': return <Lock className="text-green-500" size={20} />;
    case 'captive_portal_opened': return <Globe className="text-warning" size={20} />;
    case 'test_form_submitted': return <ShieldAlert className="text-warning" size={20} />;
    default: return <Activity className="text-muted" size={20} />;
  }
};

const EventExplanation = ({ type, metadata }: { type: string, metadata: EventMetadata }) => {
  const detail = (key: string) => String(metadata[key] ?? 'unknown');
  const classified = metadata.analysis as ProtocolAnalysis | undefined;
  const education = metadata.education as EducationalContext | undefined;

  if (education?.what_happened) {
    return (
      <div className="text-sm text-muted mt-2 bg-background p-4 rounded-xl border border-border">
        {classified?.protocol && (
          <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-border">
            <span className="font-semibold text-primary">{classified.protocol}</span><span>·</span><span>{classified.osi_layer}</span><span>·</span>
            <span className={classified.encrypted ? 'text-success' : 'text-warning'}>{classified.visibility}</span>
          </div>
        )}
        <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">{education.concept}</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><h3 className="font-semibold text-text">What happened?</h3><p className="mt-1 leading-relaxed">{education.what_happened}</p></div>
          <div><h3 className="font-semibold text-text">Why does it matter?</h3><p className="mt-1 leading-relaxed">{education.why_it_matters}</p></div>
          <div><h3 className="font-semibold text-text">What could an attacker learn?</h3><p className="mt-1 leading-relaxed">{education.attacker_could_learn}</p></div>
          <div><h3 className="font-semibold text-text">How can a user protect themselves?</h3><p className="mt-1 leading-relaxed">{education.how_to_protect}</p></div>
        </div>
      </div>
    );
  }

  switch(type) {
    case 'device_discovered':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>A new device ({detail('mac_hash')}) was discovered probing for networks.
             Even before connecting, devices send out probe requests containing their MAC address.</p>
        </div>
      );
    case 'wifi_association':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device successfully negotiated a wireless link ({detail('protocol')}) with the access point.
             This is a Layer 2 connection, but the device doesn't have an IP address yet.</p>
        </div>
      );
    case 'dhcp_request':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device ({detail('hostname')}) is requesting an IP address. The Rogue AP will assign it an IP
             ({detail('requested_ip')}), making itself the default gateway for all outgoing traffic.</p>
        </div>
      );
    case 'dns_query':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device is looking up the IP address for '{detail('domain')}'. Since the Rogue AP controls
             DNS, it can redirect this request to a fake captive portal or phishing site.</p>
        </div>
      );
    case 'arp_request':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device is broadcasting an ARP "who-has" request to find the MAC address of {detail('ip')}.
             This shows how devices discover the local network topology and gateway.</p>
        </div>
      );
    case 'http_request':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device is sending unencrypted HTTP traffic to {detail('host')}. Because HTTP is plain text,
             the Rogue AP can see the exact URL requested: {detail('url')}, and can easily intercept or modify the content.</p>
        </div>
      );
    case 'tls_connection':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>The device is initiating an encrypted TLS (HTTPS) connection. While the exact URL path and contents are hidden, 
             the Server Name Indication (SNI) reveals the domain ({detail('sni')}) being visited.</p>
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
    case 'captive_portal_opened':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Educational Context:</p>
          <p>A captive portal can look polished while revealing nothing about who controls the access point. Verify unexpected portals before entering any information.</p>
        </div>
      );
    case 'test_form_submitted':
      return (
        <div className="text-xs text-muted mt-1 bg-background p-2 rounded border border-border">
          <p className="font-semibold text-text mb-1">Privacy check:</p>
          <p>The training form was submitted. Only the outcome and field names were recorded; submitted values were not stored.</p>
        </div>
      );
    default:
      return null;
  }
};

export default function Events() {
  const [events, setEvents] = useState<StreamEvent[]>([]);

  useEffect(() => {
    let active = true;
    getEvents(250).then((history) => {
      if (active) setEvents(history);
    }).catch(() => {
      // The live connection can still recover when the backend becomes available.
    });
    wsService.connect();
    
    const unsubscribe = wsService.subscribe((data) => {
      setEvents((prev) => [data, ...prev]);
    });

    return () => {
      active = false;
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

      <section className="grid md:grid-cols-3 gap-3" aria-label="How to read the event log">
        <div className="bg-surface border border-border rounded-xl p-4"><p className="text-xs font-bold text-primary uppercase tracking-wide">What happened</p><p className="text-sm text-muted mt-2">The event name identifies the network action the lab observed.</p></div>
        <div className="bg-surface border border-border rounded-xl p-4"><p className="text-xs font-bold text-warning uppercase tracking-wide">What was visible</p><p className="text-sm text-muted mt-2">Protocol analysis distinguishes exposed details from encrypted content.</p></div>
        <div className="bg-surface border border-border rounded-xl p-4"><p className="text-xs font-bold text-success uppercase tracking-wide">What to learn</p><p className="text-sm text-muted mt-2">Each event connects the packet to a practical security lesson.</p></div>
      </section>

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
                    <EventIcon type={event.event_type || event.alert_type || 'unknown'} isAlert={event.is_alert} />
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
                      <details className="text-sm text-muted mb-2">
                        <summary className="cursor-pointer hover:text-text">View technical metadata</summary>
                        <pre className="font-mono whitespace-pre-wrap break-all mt-2 bg-background p-3 rounded">{JSON.stringify(event.event_metadata, null, 2)}</pre>
                      </details>
                    )}
                    <EventExplanation type={event.event_type || event.alert_type || 'unknown'} metadata={event.event_metadata || {}} />
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
