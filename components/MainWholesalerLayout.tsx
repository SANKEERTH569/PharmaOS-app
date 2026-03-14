import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, LogOut, Menu, X, Users, BookOpen, IndianRupee, FileText, Wallet, Settings, AlertTriangle, LifeBuoy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';
import api from '../utils/api';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/wholesaler', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Network',
    items: [
      { path: '/wholesaler/sub-wholesalers', label: 'Sub Wholesalers', icon: Users },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { path: '/wholesaler/catalog', label: 'Catalog', icon: Package, exact: true },
      { path: '/wholesaler/main-schemes', label: 'Schemes', icon: Package, exact: true },
      { path: '/wholesaler/alerts', label: 'Alerts & Expiry', icon: AlertTriangle, exact: true },
    ],
  },
  {
    label: 'Orders',
    items: [
      { path: '/wholesaler/orders', label: 'Supply Orders', icon: Package },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/wholesaler/collection', label: 'Collection', icon: Wallet },
      { path: '/wholesaler/main-ledger', label: 'Ledger', icon: BookOpen },
      { path: '/wholesaler/main-payments', label: 'Payments', icon: IndianRupee },
      { path: '/wholesaler/gst', label: 'GST Returns', icon: FileText },
    ]
  },
  {
    label: 'Settings',
    items: [
      { path: '/wholesaler/support-tickets', label: 'Support Tickets', icon: LifeBuoy, exact: true },
      { path: '/wholesaler/settings', label: 'Settings', icon: Settings, exact: true },
    ]
  }
];

const PAGE_TITLES: Record<string, string> = {
  '/wholesaler': 'Dashboard',
  '/wholesaler/catalog': 'Product Catalog',
  '/wholesaler/main-schemes': 'Schemes',
  '/wholesaler/orders': 'Supply Orders',
  '/wholesaler/sub-wholesalers': 'Sub Wholesalers',
  '/wholesaler/main-ledger': 'General Ledger',
  '/wholesaler/main-payments': 'Payments',
  '/wholesaler/gst': 'GST Returns',
  '/wholesaler/collection': 'Collection Management',
  '/wholesaler/settings': 'Settings',
  '/wholesaler/alerts': 'Alerts & Expiry Tracker',
  '/wholesaler/support-tickets': 'Support Tickets',
};

export const MainWholesalerLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, mainWholesaler } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get('/main-wholesalers/supply-orders', { params: { status: 'PENDING' } })
      .then(({ data }) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => { });
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Wholesaler';

  const SidebarInner = () => (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between px-5 h-[72px] border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="text-white font-black text-lg leading-none">P</span>
          </div>
          <div>
            <p className="text-[18px] font-extrabold text-text-primary leading-none tracking-tight">Pharma Head</p>
            <p className="text-[10px] text-text-muted font-semibold mt-0.5 tracking-wider uppercase">Wholesaler OS</p>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(false)}
          className="lg:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-alt rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {navGroups.map(group => (
          <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon: Icon, exact }: any) => {
                const active = exact ? location.pathname === path : location.pathname.startsWith(path);
                const badge = label === 'Supply Orders' && pendingCount > 0 ? pendingCount : null;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav',
                      active
                        ? 'bg-primary-light text-primary border border-primary-muted/40'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                        active
                          ? 'bg-gradient-to-br from-primary to-primary-dark shadow-md shadow-indigo-500/20 text-white'
                          : 'bg-surface-alt group-hover/nav:bg-primary-light text-text-secondary',
                      )}>
                        <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                      </div>
                      <span className={cn(active && 'font-semibold')}>{label}</span>
                    </div>
                    {badge && (
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-tight',
                        active ? 'bg-primary text-white' : 'bg-amber-100 text-amber-700',
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

      {/* Branding card */}
      <div className="mx-3 mb-3 rounded-xl bg-white border border-border p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black text-sm leading-none">P</span>
          </div>
          <p className="text-[14px] font-bold text-text-primary leading-none tracking-tight">Pharma Head</p>
        </div>
        <p className="text-[11px] text-text-muted font-medium leading-snug mb-2">
          Digital operating system for pharma wholesalers in India.
        </p>
        <p className="text-[10px] text-text-muted font-medium">
          A product of <span className="text-primary font-bold">leeep dev →</span>
        </p>
      </div>

      {/* User + logout */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
            {mainWholesaler?.name?.charAt(0).toUpperCase() ?? 'W'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-primary truncate leading-tight">{mainWholesaler?.name}</p>
            <p className="text-[10px] text-text-muted truncate mt-0.5">@{mainWholesaler?.username}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-[260px] shrink-0 transition-transform duration-300',
        'bg-surface border-r border-border',
        menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        <SidebarInner />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-5 lg:px-7 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={19} />
            </button>
            <h1 className="text-[15px] font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary rounded-full border border-primary-muted/40">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold">Wholesaler</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shadow-sm ml-1">
              {mainWholesaler?.name?.charAt(0).toUpperCase() ?? 'W'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
