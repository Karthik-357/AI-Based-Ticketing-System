import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Ticket, AlertTriangle, Users, LogOut, LayoutDashboard } from 'lucide-react';

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { label: 'Tickets', path: '/', icon: Ticket, activeCondition: (path) => path === '/' || path.startsWith('/ticket/') },
    { label: 'Incidents', path: '/incidents', icon: AlertTriangle, activeCondition: (path) => path.startsWith('/incidents') || path.startsWith('/incident/') },
  ];

  if (isAdmin) {
    navItems.push({ label: 'User Management', path: '/admin', icon: Users, activeCondition: (path) => path === '/admin' });
  }

  return (
    <div className="w-64 h-full bg-white border-r border-slate-100 flex flex-col shadow-[4px_0_24px_rgb(0,0,0,0.02)]">
      {/* Brand / Logo */}
      <div className="p-6 border-b border-slate-100">
        <h1 
          className="text-xl font-bold text-indigo-600 flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <LayoutDashboard className="w-6 h-6" />
          Ticketing System
        </h1>
      </div>

      {/* User Info (Optional top or bottom, we'll put it in nav space for now, or at bottom) */}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = item.activeCondition(location.pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-none ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer / User Session */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-bold text-slate-700 truncate">{user.email.split('@')[0]}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{user.role}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-none flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
