
import React, { useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Users, Pill,
  LogOut, Menu, Wallet, Activity, HandCoins,
  Settings, Bell, X, ChevronRight, RotateCcw,
  Check, CheckCheck, Package, CreditCard, AlertTriangle,
  Clock, ArrowRight, MapPin, FileText, Home, Tag, Truck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { getSocket } from '../utils/socket';
import { cn } from '../utils/cn';
import { AppNotification } from '../types';

const navGroups = [
  {
    label: 'Main',
    items: [
      { icon: Home, label: 'Home', path: '/' },
      { icon: FileText, label: 'Quick Sale', path: '/quick-sale' },
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Users, label: 'Retailers', path: '/retailers' },
      { icon: RotateCcw, label: 'Returns', path: '/returns' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: HandCoins, label: 'Collection', path: '/collection' },
      { icon: Activity, label: 'Ledger', path: '/ledger' },
      { icon: Wallet, label: 'Payments', path: '/payments' },
      { icon: FileText, label: 'GST Returns', path: '/gst' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { icon: Pill, label: 'Medicines', path: '/medicines' },
      { icon: Truck, label: 'Purchase Orders', path: '/purchase-orders' },
      { icon: Tag, label: 'Schemes', path: '/schemes' },
      { icon: MapPin, label: 'Rack Manager', path: '/rack-manager', pro: true },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/quick-sale': 'Quick Sale',
  '/orders': 'Orders',
  '/retailers': 'Retailers',
  '/collection': 'Collection',
  '/ledger': 'Ledger',
  '/payments': 'Payments',
  '/medicines': 'Medicines',
  '/rack-manager': 'Rack Manager',
  '/returns': 'Returns',
  '/settings': 'Settings',
  '/gst': 'GST Returns',
  '/purchase-orders': 'Purchase Orders',
};

/* ── Notification icon helper ────────────────────────────────────────────── */
const notifIcon = (type: string) => {
  switch (type) {
    case 'NEW_ORDER': return <Package size={15} className="text-blue-500" />;
    case 'PAYMENT_RECEIVED': return <CreditCard size={15} className="text-emerald-500" />;
    case 'CREDIT_LIMIT_ALERT': return <AlertTriangle size={15} className="text-amber-500" />;
    case 'ORDER_DELIVERED': return <Check size={15} className="text-emerald-500" />;
    case 'ORDER_STATUS_CHANGED': return <ArrowRight size={15} className="text-indigo-500" />;
    default: return <Bell size={15} className="text-slate-400" />;
  }
};

const notifColor = (type: string) => {
  switch (type) {
    case 'NEW_ORDER': return 'from-blue-500/20 to-blue-600/10 border-blue-500/20';
    case 'PAYMENT_RECEIVED': return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20';
    case 'CREDIT_LIMIT_ALERT': return 'from-amber-500/20 to-amber-600/10 border-amber-500/20';
    default: return 'from-slate-500/20 to-slate-600/10 border-slate-500/20';
  }
};

const timeAgo = (dateStr: string) => {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/* ── Notification sound ──────────────────────────────────────────────────── */
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) { /* silent fail */ }
};

/* ── Toast Component ─────────────────────────────────────────────────────── */
const Toast = ({ notification, onDismiss }: { key?: React.Key; notification: AppNotification; onDismiss: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="animate-slide-in-right pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/80 overflow-hidden">
      <div className={cn('px-4 py-3 flex items-start gap-3 bg-gradient-to-r', notifColor(notification.type))}>
        <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          {notifIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 leading-tight">{notification.title}</p>
          <p className="text-[12px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{notification.body}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Just now</p>
        </div>
        <button onClick={onDismiss} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { logout, wholesaler } = useAuthStore();
  const { orders, notifications, markNotificationRead, markAllNotificationsRead } = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [toasts, setToasts] = React.useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const pendingCount = orders.filter(
    o => o.wholesaler_id === wholesaler?.id && o.status === 'PENDING'
  ).length;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const isHome = location.pathname === '/';

  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([p]) => location.pathname === p
  )?.[1] ?? 'PharmaOS';

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Listen for real-time notification socket events → show toast
  const addToast = useCallback((notif: AppNotification) => {
    playNotificationSound();
    setToasts(prev => [notif, ...prev].slice(0, 3));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: AppNotification) => addToast(notif);
    socket.on('notification', handler);
    return () => { socket.off('notification', handler); };
  }, [addToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.is_read) markNotificationRead(notif.id);
    setNotifOpen(false);
    if (notif.type === 'NEW_ORDER' || notif.type === 'ORDER_STATUS_CHANGED' || notif.type === 'ORDER_DELIVERED') {
      navigate('/orders');
    } else if (notif.type === 'PAYMENT_RECEIVED') {
      navigate('/payments');
    } else if (notif.type === 'CREDIT_LIMIT_ALERT') {
      navigate('/retailers');
    }
  };

  // On the home dashboard, render children full-width (no sidebar)
  if (isHome) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">

      {/* ── Toast container ── */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <Toast key={t.id} notification={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>

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
                {group.items.map(({ icon: Icon, label, path, ...rest }: any) => {
                  const active = location.pathname === path;
                  const badge = path === '/orders' && pendingCount > 0 ? pendingCount : null;
                  const isProItem = rest.pro;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav',
                        active
                          ? isProItem ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300' : 'bg-white/[0.08] text-white'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                          active
                            ? isProItem ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20' : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/20'
                            : 'bg-white/[0.05] group-hover/nav:bg-white/[0.08]'
                        )}>
                          <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                        </div>
                        <span className={cn(active && 'font-semibold')}>{label}</span>
                        {isProItem && (
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[7px] font-black uppercase tracking-widest rounded-md shadow-sm">PRO</span>
                        )}
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
        <header className="h-16 shrink-0 flex items-center justify-between px-5 lg:px-7 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30">
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

            {/* ── Notification Bell ── */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className={cn(
                  'relative p-2 rounded-xl transition-all duration-200',
                  notifOpen
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                )}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black rounded-full ring-2 ring-white shadow-lg shadow-rose-500/30 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/80 overflow-hidden z-50 animate-fade-in-down">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-indigo-500" />
                      <h3 className="text-[13px] font-extrabold text-slate-800 tracking-tight">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { markAllNotificationsRead(wholesaler?.id || ''); }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Bell size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-400">No notifications yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">They'll appear here when something happens</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={cn(
                            'w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50/80 transition-all duration-150 group',
                            !n.is_read && 'bg-indigo-50/30'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
                            !n.is_read ? 'bg-gradient-to-br ' + notifColor(n.type) : 'bg-slate-100 border-slate-200/60'
                          )}>
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-[12px] leading-tight', !n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600')}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock size={10} className="text-slate-400" />
                              <span className="text-[10px] text-slate-400 font-medium">{timeAgo(n.created_at)}</span>
                            </div>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2 ring-2 ring-indigo-200" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/60">
                      <button
                        onClick={() => { setNotifOpen(false); navigate('/orders'); }}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors rounded-lg hover:bg-indigo-50"
                      >
                        View All Orders
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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

      {/* ── Animation styles ── */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in-down {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
