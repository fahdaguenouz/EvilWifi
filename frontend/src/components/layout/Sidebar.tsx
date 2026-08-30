import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, Smartphone, Activity, Settings } from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/lab', label: 'Laboratory', icon: FlaskConical },
    { to: '/devices', label: 'Devices', icon: Smartphone },
    { to: '/events', label: 'Events', icon: Activity },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-surface border-r border-border h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          📡 EvilWifi Lab
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-white/5 hover:text-text'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border text-xs text-muted text-center">
        Laboratory Use Only
      </div>
    </div>
  );
};
