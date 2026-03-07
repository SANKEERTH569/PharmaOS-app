import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Users, Pill, ArrowRight,
  HandCoins, Activity, Wallet, Settings,
  RotateCcw, MapPin, FileText, TrendingUp,
  IndianRupee, LogOut, Bell, LayoutGrid, Package, ReceiptText, AlertCircle, ShoppingBag,
  Heart,
  Tag, Clock, CreditCard, AlertTriangle, Check, ChevronRight
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const dashNotifIcon = (type: string) => {
  switch (type) {
    case 'NEW_ORDER': return <Package size={14} className="text-blue-500" />;
    case 'PAYMENT_RECEIVED': return <CreditCard size={14} className="text-emerald-500" />;
    case 'CREDIT_LIMIT_ALERT': return <AlertTriangle size={14} className="text-amber-500" />;
    case 'ORDER_DELIVERED': return <Check size={14} className="text-emerald-500" />;
    case 'ORDER_STATUS_CHANGED': return <ArrowRight size={14} className="text-indigo-500" />;
    default: return <Bell size={14} className="text-slate-400" />;
  }
};

const dashNotifBg = (type: string) => {
  switch (type) {
    case 'NEW_ORDER': return 'bg-blue-50 border-blue-100';
    case 'PAYMENT_RECEIVED': return 'bg-emerald-50 border-emerald-100';
    case 'CREDIT_LIMIT_ALERT': return 'bg-amber-50 border-amber-100';
    case 'ORDER_DELIVERED': return 'bg-emerald-50 border-emerald-100';
    default: return 'bg-slate-50 border-slate-100';
  }
};

const appSections = [
  {
    category: 'Operations',
    apps: [
      {
        icon: ReceiptText,
        label: 'Quick Sale',
        description: 'Create sale & generate invoice',
        path: '/quick-sale',
        gradient: 'from-emerald-500 to-green-600',
        bg: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        ring: 'ring-emerald-500/20',
      },
      {
        icon: ShoppingCart,
        label: 'Orders',
        description: 'Manage & track all orders',
        path: '/orders',
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        ring: 'ring-blue-500/20',
      },
      {
        icon: Users,
        label: 'Retailers',
        description: 'View & manage retailers',
        path: '/retailers',
        gradient: 'from-violet-500 to-purple-600',
        bg: 'bg-violet-50',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        ring: 'ring-violet-500/20',
      },
      {
        icon: RotateCcw,
        label: 'Returns',
        description: 'Process return requests',
        path: '/returns',
        gradient: 'from-rose-500 to-pink-600',
        bg: 'bg-rose-50',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        ring: 'ring-rose-500/20',
      },
    ],
  },
  {
    category: 'Finance',
    apps: [
      {
        icon: HandCoins,
        label: 'Collection',
        description: 'Collect payments from retailers',
        path: '/collection',
        gradient: 'from-emerald-500 to-teal-600',
        bg: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        ring: 'ring-emerald-500/20',
      },
      {
        icon: Activity,
        label: 'Ledger',
        description: 'Full transaction history',
        path: '/ledger',
        gradient: 'from-cyan-500 to-blue-600',
        bg: 'bg-cyan-50',
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        ring: 'ring-cyan-500/20',
      },
      {
        icon: Wallet,
        label: 'Payments',
        description: 'Track all payments',
        path: '/payments',
        gradient: 'from-indigo-500 to-blue-600',
        bg: 'bg-indigo-50',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        ring: 'ring-indigo-500/20',
      },
      {
        icon: Tag,
        label: 'Schemes',
        description: 'BOGO & Discounts',
        path: '/schemes',
        gradient: 'from-fuchsia-500 to-pink-600',
        bg: 'bg-fuchsia-50',
        iconBg: 'bg-fuchsia-100',
        iconColor: 'text-fuchsia-600',
        ring: 'ring-fuchsia-500/20',
      },
      {
        icon: FileText,
        label: 'GST Returns',
        description: 'GST filing & reports',
        path: '/gst',
        gradient: 'from-amber-500 to-orange-600',
        bg: 'bg-amber-50',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        ring: 'ring-amber-500/20',
      },
    ],
  },
  {
    category: 'Inventory',
    apps: [
      {
        icon: Pill,
        label: 'Medicines',
        description: 'Medicine stock & catalog',
        path: '/medicines',
        gradient: 'from-teal-500 to-emerald-600',
        bg: 'bg-teal-50',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-600',
        ring: 'ring-teal-500/20',
      },
      {
        icon: MapPin,
        label: 'Rack Manager',
        description: 'Organize shelf positions',
        path: '/rack-manager',
        gradient: 'from-orange-500 to-red-600',
        bg: 'bg-orange-50',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        ring: 'ring-orange-500/20',
        pro: true,
      },
      {
        icon: Settings,
        label: 'Settings',
        description: 'Account & preferences',
        path: '/settings',
        gradient: 'from-slate-500 to-slate-700',
        bg: 'bg-slate-50',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600',
        ring: 'ring-slate-500/20',
      },
    ],
  },
];

export const DashboardHome = () => {
  const { orders, retailers, payments, notifications } = useDataStore();
  const { wholesaler, logout } = useAuthStore();
  const navigate = useNavigate();

  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);

  useEffect(() => {
    if (!wholesaler?.id) return;
    api.get('/medicines/alerts/expiry')
      .then(res => setExpiringBatches(res.data))
      .catch(err => console.error(err));
  }, [wholesaler]);

  const myOrders = orders.filter(o => o.wholesaler_id === wholesaler?.id);
  const pending = myOrders.filter(o => o.status === 'PENDING');
  const delivered = myOrders.filter(o => o.status === 'DELIVERED');
  const myPayments = payments.filter(p => p.wholesaler_id === wholesaler?.id && p.status === 'COMPLETED');
  const totalRevenue = delivered.reduce((s, o) => s + o.total_amount, 0);
  const totalCollected = myPayments.reduce((s, p) => s + p.amount, 0);
  const totalDue = retailers.reduce((s, r) => s + r.current_balance, 0);
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => { logout(); navigate('/login'); };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const getBadge = (path: string): string | null => {
    if (path === '/orders' && pending.length > 0) return String(pending.length);
    return null;
  };

  const stats = [
    { label: 'Orders', value: myOrders.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Revenue', value: fmtCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Retailers', value: retailers.filter(r => r.is_active).length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Collected', value: fmtCurrency(totalCollected), icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-white font-black text-base leading-none">P</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[16px] font-extrabold text-slate-900 leading-none tracking-tight">PharmaOS</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sub-Wholesale OS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wide">Live</span>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="relative p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <Bell size={18} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black rounded-full ring-2 ring-white shadow-lg shadow-rose-500/30">
                  {unreadNotifs > 99 ? '99+' : unreadNotifs}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-200/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {wholesaler?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{wholesaler?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{wholesaler?.phone}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all ml-1"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {/* ── Greeting ── */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting()}, {wholesaler?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">{today}</p>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, bg }, idx) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={18} strokeWidth={2} className={color} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</p>
              <p className="text-xs font-medium text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex gap-6 items-start">

          {/* ── LEFT: main content ── */}
          <div className="flex-1 min-w-0">

        {/* ── Pending banner ── */}
        {pending.length > 0 && (
          <button
            onClick={() => navigate('/orders')}
            className="w-full mb-8 flex items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">{pending.length} order{pending.length > 1 ? 's' : ''} need your review</p>
                <p className="text-xs text-white/70 mt-0.5">Tap to manage pending orders</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all" />
          </button>
        )}

        {/* ── App Grid Sections ── */}
        <div className="space-y-8 mt-0">
          {appSections.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2.5 mb-4">
                <LayoutGrid size={14} className="text-slate-400" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">{section.category}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {section.apps.map(({ icon: Icon, label, description, path, bg, iconBg, iconColor, ring, ...rest }) => {
                  const badge = getBadge(path);
                  const isPro = (rest as any).pro;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={`group relative flex flex-col items-start p-5 sm:p-6 rounded-2xl ${bg} border border-white/80 hover:bg-white hover:border-slate-200/80 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 ring-1 ${ring} hover:ring-2 transition-all duration-300 text-left overflow-hidden`}
                    >
                      {/* Decorative dot pattern */}
                      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03]" style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '8px 8px',
                      }} />

                      <div className="relative z-10 w-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                            <Icon size={22} strokeWidth={1.8} className={iconColor} />
                          </div>
                          {badge && (
                            <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-rose-500/30 animate-pulse">
                              {badge}
                            </span>
                          )}
                          {isPro && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{label}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed group-hover:text-slate-500 transition-colors">{description}</p>
                      </div>

                      <ArrowRight
                        size={14}
                        className="absolute bottom-4 right-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-300"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom summary strip ── */}
        <div className="mt-10 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-900/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Business Overview</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Quick snapshot of your performance</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { l: 'Revenue', v: fmtCurrency(totalRevenue), c: 'text-emerald-400' },
                { l: 'Collected', v: fmtCurrency(totalCollected), c: 'text-blue-400' },
                { l: 'Outstanding', v: fmtCurrency(totalDue), c: 'text-amber-400' },
                { l: 'Delivered', v: String(delivered.length), c: 'text-white' },
              ].map(({ l, v, c }) => (
                <div key={l} className="text-center sm:text-right">
                  <p className={`text-base sm:text-lg font-extrabold ${c} leading-none`}>{v}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer brand ── */}
        <div className="mt-6 text-center pb-4">
          <p className="text-[11px] text-slate-300 font-medium">
            Powered by <span className="text-indigo-400 font-bold">PharmaOS</span> · A product of <span className="text-indigo-400 font-bold">leeep dev</span>
          </p>
        </div>

          </div>{/* end LEFT column */}

          {/* ── RIGHT: Notifications Panel ── */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0">
            <div className="sticky top-24 space-y-4">

              {/* Expiry Alerts */}
              {expiringBatches.length > 0 && (
                <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 flex items-center gap-2.5 border-b border-red-100">
                    <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                      <AlertCircle size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[11px] font-extrabold text-red-900 uppercase tracking-wide">Near Expiry</h3>
                      <p className="text-[10px] font-semibold text-red-600">{expiringBatches.length} batches within 90 days</p>
                    </div>
                    <button
                      onClick={() => navigate('/medicines')}
                      className="text-[10px] font-bold text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200 hover:shadow-sm transition-all shrink-0"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {expiringBatches.map(batch => {
                      const diffDays = Math.max(0, Math.floor((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      const urgentColor = diffDays <= 30 ? 'bg-red-100 text-red-700 border-red-200' : diffDays <= 60 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                      return (
                        <div key={batch.id} className="px-4 py-3 flex items-start gap-2.5 hover:bg-red-50/30 transition-colors">
                          <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            <Pill size={13} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-900 leading-tight truncate">{batch.medicine.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Batch: <span className="font-semibold text-slate-700">{batch.batch_no}</span></p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-slate-400">Stock: {batch.stock_qty}</span>
                              <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded border ${urgentColor}`}>
                                {diffDays}d left
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notifications */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-indigo-500" />
                    <h3 className="text-[12px] font-extrabold text-slate-800">Notifications</h3>
                    {unreadNotifs > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{unreadNotifs} new</span>
                    )}
                  </div>
                  {unreadNotifs > 0 && (
                    <button
                      onClick={() => navigate('/orders')}
                      className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      View all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Bell size={16} className="text-slate-300" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400">No notifications yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">They'll appear here</p>
                    </div>
                  ) : (
                    notifications.slice(0, 15).map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (n.type === 'NEW_ORDER' || n.type === 'ORDER_STATUS_CHANGED' || n.type === 'ORDER_DELIVERED') navigate('/orders');
                          else if (n.type === 'PAYMENT_RECEIVED') navigate('/payments');
                          else if (n.type === 'CREDIT_LIMIT_ALERT') navigate('/retailers');
                        }}
                        className={`w-full px-3 py-2.5 flex items-start gap-2.5 text-left hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${dashNotifBg(n.type)}`}>
                          {dashNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] leading-tight truncate ${!n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {n.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-snug">{n.body}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock size={9} className="text-slate-400" />
                            <span className="text-[9px] text-slate-400">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2 ring-2 ring-indigo-200" />
                        )}
                      </button>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100">
                    <button
                      onClick={() => navigate('/orders')}
                      className="flex items-center justify-center gap-1 w-full py-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors rounded-lg hover:bg-indigo-50"
                    >
                      View All Orders
                      <ChevronRight size={11} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>{/* end RIGHT column */}

        </div>{/* end two-column flex */}
      </div>
    </div>
  );
};


