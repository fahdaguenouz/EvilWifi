import { NavLink } from 'react-router-dom';
import { Activity, FlaskConical, LayoutDashboard, ScanSearch, Settings, Smartphone } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { to: '/lab', label: 'Laboratory', shortLabel: 'Lab', icon: FlaskConical },
  { to: '/devices', label: 'Devices', shortLabel: 'Devices', icon: Smartphone },
  { to: '/events', label: 'Events', shortLabel: 'Events', icon: Activity },
  { to: '/analysis', label: 'Packet Lab', shortLabel: 'Analyze', icon: ScanSearch },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export const Sidebar = () => (
  <>
    <aside className="hidden lg:flex w-64 bg-surface border-r border-border h-full flex-col shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">📡 EvilWifi Lab</h1>
        <p className="text-xs text-muted mt-2">Authorized security training</p>
      </div>

      <nav className="flex-1 px-4 space-y-2" aria-label="Primary navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-white/5 hover:text-text'}`}
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border text-xs text-muted text-center">Laboratory use only</div>
    </aside>

    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface/95 backdrop-blur border-t border-border overflow-x-auto" aria-label="Mobile navigation">
      <div className="flex min-w-max px-2 py-2">
        {navItems.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `min-w-[4.5rem] flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted'}`}
          >
            <Icon size={19} />
            <span>{shortLabel}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  </>
);
