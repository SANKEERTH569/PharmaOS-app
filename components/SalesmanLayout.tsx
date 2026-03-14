import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Building2, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const tabs = [
  { path: '/salesman', label: 'Today', icon: Home, end: true },
  { path: '/salesman/order', label: 'Order', icon: ShoppingCart },
  { path: '/salesman/wholesalers', label: 'Wholesalers', icon: Building2 },
];

export const SalesmanLayout = ({ children }: { children: React.ReactNode }) => {
  const { salesman, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login/wholesaler'); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initials = (salesman?.name || 'F').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto relative">
      {/* Dark top bar */}
      <div className="shrink-0 bg-white border-b border-border px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-xs font-medium tracking-wide">{greeting},</p>
            <h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight mt-0.5">
              {salesman?.name || 'Field Rep'}
            </h1>
            {salesman?.company_name && (
              <p className="text-text-muted text-xs mt-0.5 font-medium">{salesman.company_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-base">{initials}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-2xl bg-surface hover:bg-rose-50 flex items-center justify-center transition-all border border-border"
            >
              <LogOut size={17} className="text-text-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch px-3 py-2 gap-1">
          {tabs.map(tab => {
            const active = tab.end
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-200"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    active ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-transparent'
                  }`}
                >
                  <tab.icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? 'text-white' : 'text-slate-400'}
                  />
                </div>
                <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};
