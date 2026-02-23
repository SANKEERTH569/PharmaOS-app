
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Users, Pill,
  LogOut, Menu, Wallet, Activity, HandCoins,
  Settings, Bell, X, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { cn } from '../utils/cn';

const navGroups = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Users, label: 'Retailers', path: '/retailers' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: HandCoins, label: 'Collection', path: '/collection' },
      { icon: Activity, label: 'Ledger', path: '/ledger' },
      { icon: Wallet, label: 'Payments', path: '/payments' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { icon: Pill, label: 'Medicines', path: '/medicines' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/retailers': 'Retailers',
  '/collection': 'Collection',
  '/ledger': 'Ledger',
  '/payments': 'Payments',
  '/medicines': 'Medicines',
  '/settings': 'Settings',
};

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { logout, wholesaler } = useAuthStore();
  const { orders } = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const pendingCount = orders.filter(
    o => o.wholesaler_id === wholesaler?.id && o.status === 'PENDING'
  ).length;

  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([p]) => location.pathname === p
  )?.[1] ?? 'PharmaOS';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen">

      {/* ── Mobile overlay ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-[260px] shrink-0 transition-transform duration-300',
        'bg-gradient-to-b from-[#0F172A] via-[#111827] to-[#1E293B]',
        menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-[72px] border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-white font-black text-lg leading-none">P</span>
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-white leading-none tracking-tight">PharmaOS</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 tracking-wider uppercase">Sub-Wholesale OS</p>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-hide">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ icon: Icon, label, path }) => {
                  const active = location.pathname === path;
                  const badge = path === '/orders' && pendingCount > 0 ? pendingCount : null;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav',
                        active
                          ? 'bg-white/[0.08] text-white'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                          active
                            ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/20'
                            : 'bg-white/[0.05] group-hover/nav:bg-white/[0.08]'
                        )}>
                          <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                        </div>
                        <span className={cn(active && 'font-semibold')}>{label}</span>
                      </div>
                      {badge && (
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-tight',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-500/20 text-rose-400'
                        )}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* PharmaOS branding card */}
        <div className="mx-3 mb-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-black text-sm leading-none">P</span>
            </div>
            <p className="text-[14px] font-bold text-white leading-none tracking-tight">PharmaOS</p>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-snug mb-2">
            Digital operating system for pharma sub-wholesalers in India.
          </p>
          <p className="text-[10px] text-slate-600 font-medium">
            A product of <span className="text-indigo-400 font-bold">leeep dev →</span>
          </p>
        </div>

        {/* User */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {wholesaler?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">{wholesaler?.name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{wholesaler?.phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] rounded-lg transition-all duration-200"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-5 lg:px-7 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wide">Live</span>
            </div>
            <Link
              to="/orders"
              className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </Link>
            <Link
              to="/settings"
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            >
              <Settings size={18} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-5 lg:p-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
