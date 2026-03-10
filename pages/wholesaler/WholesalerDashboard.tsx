import React, { useEffect, useState } from 'react';
import {
  Package, Clock, CheckCircle, Truck, XCircle, TrendingUp,
  ArrowRight, IndianRupee, AlertTriangle, BarChart3,
  Users, BookOpen, Wallet, FileText, Settings, ShieldAlert,
  Zap, ArrowUpRight, ArrowDownRight, ChevronRight,
  Activity, Boxes, Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { cn } from '../../utils/cn';
import { SupplyOrder, SupplyOrderStatus } from '../../types';

/* ─── Types ─── */
interface Analytics {
  supply_orders: { total: number; pending: number; accepted: number; dispatched: number; delivered: number; cancelled: number };
  revenue: { total: number; this_month: number; last_month: number };
  catalog: { total: number; active: number; low_stock: number; near_expiry: number };
  top_products: { medicine_name: string; total_qty: number; total_revenue: number }[];
}

/* ─── Helpers ─── */
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtCompact = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const STATUS_CFG: Record<SupplyOrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Pending',    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200', icon: Clock },
  ACCEPTED:   { label: 'Accepted',   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',  icon: CheckCircle },
  DISPATCHED: { label: 'Dispatched', color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200',icon: Truck },
  DELIVERED:  { label: 'Delivered',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  CANCELLED:  { label: 'Cancelled',  color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',  icon: XCircle },
};

/* ─── Module Cards Config ─── */
const modules = [
  { path: '/wholesaler/orders', label: 'Supply Orders', desc: 'Track & manage supply pipeline', icon: Truck, accent: 'from-blue-500 to-indigo-600', dot: 'bg-blue-500' },
  { path: '/wholesaler/catalog', label: 'Product Catalog', desc: 'Manage medicines, stock & pricing', icon: Boxes, accent: 'from-violet-500 to-purple-600', dot: 'bg-violet-500' },
  { path: '/wholesaler/main-schemes', label: 'Schemes', desc: 'BOGO, discounts & promotions', icon: Tag, accent: 'from-fuchsia-500 to-pink-600', dot: 'bg-fuchsia-500' },
  { path: '/wholesaler/sub-wholesalers', label: 'Sub Wholesalers', desc: 'Your distribution network', icon: Users, accent: 'from-cyan-500 to-blue-600', dot: 'bg-cyan-500' },
  { path: '/wholesaler/collection', label: 'Collection', desc: 'Collect payments from network', icon: Wallet, accent: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
  { path: '/wholesaler/main-ledger', label: 'Ledger', desc: 'Full transaction history', icon: BookOpen, accent: 'from-sky-500 to-cyan-600', dot: 'bg-sky-500' },
  { path: '/wholesaler/main-payments', label: 'Payments', desc: 'Track all incoming payments', icon: IndianRupee, accent: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
  { path: '/wholesaler/gst', label: 'GST Returns', desc: 'GSTR1, GSTR3B & HSN reports', icon: FileText, accent: 'from-orange-500 to-red-500', dot: 'bg-orange-500' },
  { path: '/wholesaler/alerts', label: 'Alerts & Expiry', desc: 'Expiry tracker & stock alerts', icon: ShieldAlert, accent: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  { path: '/wholesaler/settings', label: 'Settings', desc: 'Company profile & preferences', icon: Settings, accent: 'from-slate-500 to-slate-700', dot: 'bg-slate-500' },
];

/* ─── Dashboard Component ─── */
export const WholesalerDashboard = () => {
  const navigate = useNavigate();
  const { mainWholesaler } = useAuthStore();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/main-wholesalers/supply-orders'),
      api.get('/main-wholesalers/analytics'),
    ])
      .then(([ordersRes, analyticsRes]) => {
        setOrders(ordersRes.data);
        setAnalytics(analyticsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const so = analytics?.supply_orders;
  const rev = analytics?.revenue;
  const cat = analytics?.catalog;
  const recentOrders = orders.slice(0, 6);
  const revenueGrowth = rev && rev.last_month > 0
    ? ((rev.this_month - rev.last_month) / rev.last_month * 100)
    : null;
  const growthUp = revenueGrowth !== null && revenueGrowth >= 0;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  // Priority items
  const priorities: { label: string; count: number; color: string; bg: string; icon: React.ElementType; path: string }[] = [];
  if ((so?.pending ?? 0) > 0) priorities.push({ label: 'Pending Orders', count: so!.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, path: '/wholesaler/orders?status=PENDING' });
  if ((cat?.low_stock ?? 0) > 0) priorities.push({ label: 'Low Stock Items', count: cat!.low_stock, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle, path: '/wholesaler/alerts' });
  if ((cat?.near_expiry ?? 0) > 0) priorities.push({ label: 'Near Expiry', count: cat!.near_expiry, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: ShieldAlert, path: '/wholesaler/alerts' });
  if ((so?.dispatched ?? 0) > 0) priorities.push({ label: 'In Transit', count: so!.dispatched, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: Truck, path: '/wholesaler/orders?status=DISPATCHED' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-400 mt-4">Loading command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ━━━ HERO: Greeting + Live Pulse ━━━ */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting()},{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {mainWholesaler?.name}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Your distribution command center</p>
        </div>

        {/* Live Pulse Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full">
            <Package size={11} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-600">{so?.total ?? 0} orders</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full">
            <Boxes size={11} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-600">{cat?.active ?? 0} products</span>
          </div>
        </div>
      </div>

      {/* ━━━ PRIORITY ALERTS ━━━ */}
      {priorities.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {priorities.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.label}
                onClick={() => navigate(p.path)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl border min-w-[200px] shrink-0',
                  'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group',
                  p.bg,
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 border border-white')}>
                  <Icon size={16} className={p.color} />
                </div>
                <div className="text-left">
                  <p className={cn('text-lg font-black leading-none', p.color)}>{p.count}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">{p.label}</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      )}

      {/* ━━━ BENTO GRID: Revenue + Pipeline ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Revenue Card — spans 5 cols */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <IndianRupee size={16} className="text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
            </div>

            <p className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              {fmtCompact(rev?.total ?? 0)}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5">
              Lifetime from {so?.delivered ?? 0} delivered orders
            </p>

            <div className="h-px bg-white/10 my-5" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">This Month</p>
                <p className="text-xl font-black text-white">{fmtCompact(rev?.this_month ?? 0)}</p>
                {revenueGrowth !== null && (
                  <div className={cn('flex items-center gap-1 mt-1', growthUp ? 'text-emerald-400' : 'text-rose-400')}>
                    {growthUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span className="text-[11px] font-bold">{Math.abs(revenueGrowth).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Month</p>
                <p className="text-xl font-black text-slate-400">{fmtCompact(rev?.last_month ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Pipeline — spans 7 cols */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Activity size={16} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Order Pipeline</h3>
                <p className="text-[10px] text-slate-400 font-medium">{so?.total ?? 0} total orders</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/wholesaler/orders')}
              className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          {/* Pipeline visual flow */}
          <div className="flex items-stretch gap-2">
            {([
              { key: 'pending', label: 'Pending', value: so?.pending ?? 0, cfg: STATUS_CFG.PENDING },
              { key: 'accepted', label: 'Accepted', value: so?.accepted ?? 0, cfg: STATUS_CFG.ACCEPTED },
              { key: 'dispatched', label: 'Dispatched', value: so?.dispatched ?? 0, cfg: STATUS_CFG.DISPATCHED },
              { key: 'delivered', label: 'Delivered', value: so?.delivered ?? 0, cfg: STATUS_CFG.DELIVERED },
            ] as const).map((stage, i, arr) => {
              const Icon = stage.cfg.icon;
              const total = (so?.pending ?? 0) + (so?.accepted ?? 0) + (so?.dispatched ?? 0) + (so?.delivered ?? 0);
              const pct = total > 0 ? (stage.value / total) * 100 : 0;
              return (
                <React.Fragment key={stage.key}>
                  <button
                    onClick={() => navigate(`/wholesaler/orders?status=${stage.key.toUpperCase()}`)}
                    className={cn(
                      'flex-1 rounded-2xl border p-3 sm:p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 group cursor-pointer',
                      stage.cfg.bg, stage.cfg.border,
                    )}
                  >
                    <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-xl mx-auto flex items-center justify-center bg-white/80 shadow-sm mb-2')}>
                      <Icon size={16} className={stage.cfg.color} />
                    </div>
                    <p className={cn('text-xl sm:text-2xl font-black leading-none', stage.cfg.color)}>
                      {stage.value}
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{stage.label}</p>
                    {/* Mini bar */}
                    <div className="h-1 bg-white/80 rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', stage.cfg.color.replace('text-', 'bg-'))}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </button>
                  {i < arr.length - 1 && (
                    <div className="flex items-center shrink-0">
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {(so?.cancelled ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-500 font-semibold">
              <XCircle size={13} />
              {so!.cancelled} cancelled order{so!.cancelled > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ━━━ ROW 2: Catalog Health + Top Products + Recent Orders ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Catalog Health — 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-violet-50 rounded-xl">
              <Boxes size={16} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Catalog Health</h3>
              <p className="text-[10px] text-slate-400 font-medium">{cat?.total ?? 0} medicines total</p>
            </div>
          </div>

          {/* Visual ring */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="10"
                  strokeDasharray={`${((cat?.active ?? 0) / Math.max(cat?.total ?? 1, 1)) * 251.3} 251.3`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-black text-slate-900">{cat?.active ?? 0}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Active', value: cat?.active ?? 0, color: 'bg-violet-500', textColor: 'text-violet-700' },
              { label: 'Low Stock', value: cat?.low_stock ?? 0, color: 'bg-amber-500', textColor: 'text-amber-700' },
              { label: 'Near Expiry', value: cat?.near_expiry ?? 0, color: 'bg-rose-500', textColor: 'text-rose-700' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                </div>
                <span className={cn('text-sm font-black', item.textColor)}>{item.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/wholesaler/catalog')}
            className="w-full mt-4 py-2.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            Manage Catalog <ArrowRight size={12} />
          </button>
        </div>

        {/* Top Products — 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <BarChart3 size={16} className="text-emerald-500" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Top Products</h3>
            </div>
          </div>

          {!analytics?.top_products?.length ? (
            <div className="py-8 text-center">
              <BarChart3 size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.top_products.slice(0, 6).map((p, i) => {
                const maxRev = analytics.top_products[0].total_revenue;
                const pct = maxRev > 0 ? (p.total_revenue / maxRev) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate">{p.medicine_name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-2">{fmtCompact(p.total_revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders — 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Clock size={16} className="text-blue-500" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Recent Orders</h3>
            </div>
            <button
              onClick={() => navigate('/wholesaler/orders')}
              className="text-[10px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-0.5"
            >
              All <ChevronRight size={11} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center">
              <Package size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentOrders.map(order => {
                const cfg = STATUS_CFG[order.status];
                const Icon = cfg.icon;
                return (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/wholesaler/orders/${order.id}/invoice`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                      <Icon size={13} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{order.so_number}</p>
                      <p className="text-[10px] text-slate-400 truncate">{order.wholesaler?.name || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700">{fmt(order.total_amount)}</p>
                      <p className={cn('text-[9px] font-bold', cfg.color)}>{cfg.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ━━━ MODULE CARDS: Quick Access to Everything ━━━ */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <Zap size={14} className="text-violet-500" />
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.15em]">Quick Access</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {modules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.path}
                onClick={() => navigate(mod.path)}
                className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 text-left hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Accent stripe */}
                <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl', mod.accent)} />

                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-2 h-2 rounded-full', mod.dot)} />
                  <div className={cn('w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform')}>
                    <Icon size={17} strokeWidth={1.8} className="text-slate-600" />
                  </div>
                </div>

                <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 leading-tight">{mod.label}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{mod.desc}</p>

                <ArrowRight size={12} className="absolute bottom-3.5 right-3.5 text-slate-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ━━━ FOOTER PULSE STRIP ━━━ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Pulse</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Real-time snapshot of your distribution network</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { l: 'Total Revenue', v: fmtCompact(rev?.total ?? 0), c: 'text-emerald-400' },
              { l: 'This Month', v: fmtCompact(rev?.this_month ?? 0), c: 'text-blue-400' },
              { l: 'Products', v: String(cat?.active ?? 0), c: 'text-violet-400' },
              { l: 'Delivered', v: String(so?.delivered ?? 0), c: 'text-white' },
            ].map(({ l, v, c }) => (
              <div key={l} className="text-center sm:text-right">
                <p className={cn('text-base sm:text-lg font-extrabold leading-none', c)}>{v}</p>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-[11px] text-slate-300 font-medium">
          Powered by <span className="text-violet-400 font-bold">PharmaOS</span> · Wholesaler Command Center
        </p>
      </div>
    </div>
  );
};
