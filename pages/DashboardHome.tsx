
import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Clock, IndianRupee, Users,
  CheckCircle2, XCircle, ArrowRight, Pill,
  HandCoins, AlertTriangle, UserPlus, TrendingUp,
  Package,
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
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

export const DashboardHome = () => {
  const { orders, retailers, payments, updateOrderStatus } = useDataStore();
  const { wholesaler } = useAuthStore();
  const navigate = useNavigate();

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    api.get('/wholesaler/agencies/pending')
      .then(r => setPendingRequests(r.data))
      .catch(() => { });
  }, []);

  const handleRespond = async (retailer_id: string, action: 'ACCEPT' | 'REJECT') => {
    setRespondingId(retailer_id);
    try {
      await api.patch(`/wholesaler/agencies/${retailer_id}/respond`, { action });
      setPendingRequests(prev => prev.filter(r => r.retailer.id !== retailer_id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setRespondingId(null);
    }
  };

  const handleOrderAction = async (orderId: string, status: 'ACCEPTED' | 'REJECTED') => {
    if (!wholesaler) return;
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status, wholesaler.id);
    } finally {
      setUpdatingOrder(null);
    }
  };

  // ── Real stats ───────────────────────────────────────────────────────────
  const myOrders = orders.filter(o => o.wholesaler_id === wholesaler?.id);
  const pending = myOrders.filter(o => o.status === 'PENDING');
  const delivered = myOrders.filter(o => o.status === 'DELIVERED');
  const myPayments = payments.filter(p => p.wholesaler_id === wholesaler?.id && p.status === 'COMPLETED');
  const totalRevenue = delivered.reduce((s, o) => s + o.total_amount, 0);
  const totalCollected = myPayments.reduce((s, p) => s + p.amount, 0);
  const overdueCount = retailers.filter(r => r.current_balance > r.credit_limit * 0.8).length;
  const totalDue = retailers.reduce((s, r) => s + r.current_balance, 0);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const stats = [
    {
      label: 'Total Orders',
      value: myOrders.length,
      sub: `${pending.length} pending review`,
      icon: ShoppingCart,
      gradient: 'from-blue-600 to-indigo-700',
      glow: 'shadow-blue-600/20',
      link: '/orders',
    },
    {
      label: 'Active Retailers',
      value: retailers.filter(r => r.is_active).length,
      sub: overdueCount > 0 ? `${overdueCount} overdue` : 'All clear',
      icon: Users,
      gradient: 'from-violet-600 to-purple-700',
      glow: 'shadow-violet-600/20',
      link: '/retailers',
    },
    {
      label: 'Total Revenue',
      value: fmtCurrency(totalRevenue),
      sub: `${delivered.length} delivered orders`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/20',
      link: '/ledger',
    },
    {
      label: 'Outstanding Due',
      value: fmtCurrency(totalDue),
      sub: `Collected: ${fmtCurrency(totalCollected)}`,
      icon: IndianRupee,
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/20',
      link: '/collection',
    },
  ];

  const quickActions = [
    { icon: ShoppingCart, label: 'View Orders', path: '/orders', gradient: 'from-blue-500 to-indigo-600' },
    { icon: HandCoins, label: 'Collect Payment', path: '/collection', gradient: 'from-emerald-500 to-teal-600' },
    { icon: Pill, label: 'Add Medicine', path: '/medicines', gradient: 'from-violet-500 to-purple-600' },
    { icon: UserPlus, label: 'Add Retailer', path: '/retailers', gradient: 'from-amber-500 to-orange-600' },
    { icon: Package, label: 'Ledger', path: '/ledger', gradient: 'from-indigo-500 to-blue-600' },
    { icon: IndianRupee, label: 'Payments', path: '/payments', gradient: 'from-rose-500 to-pink-600' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {greeting()}, {wholesaler?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">{today}</p>
        </div>
        {pending.length > 0 ? (
          <Link
            to="/orders"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 group"
          >
            <Clock size={13} />
            {pending.length} order{pending.length > 1 ? 's' : ''} need review
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <div className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100">
            <CheckCircle2 size={13} />
            All orders up to date
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, gradient, glow, link }, idx) => (
          <Link
            key={label}
            to={link}
            className={`group relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg ${glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {/* Decorative circle */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
            <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/[0.04]" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-xl bg-white/[0.15] backdrop-blur-sm">
                  <Icon size={17} strokeWidth={2} className="text-white" />
                </div>
                <ArrowRight size={13} className="text-white/30 group-hover:text-white/60 mt-1 transition-colors" />
              </div>
              <p className="text-[22px] font-extrabold text-white tracking-tight leading-none">{value}</p>
              <p className="text-xs font-semibold text-white/80 mt-1.5">{label}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left – pending orders */}
        <div className="lg:col-span-2 space-y-5">

          {/* Retailer join requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-amber-100/60">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-sm">
                  <UserPlus size={15} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Retailer Join Requests</p>
                  <p className="text-[11px] text-amber-700">{pendingRequests.length} waiting for approval</p>
                </div>
              </div>
              <div className="divide-y divide-amber-100/60">
                {pendingRequests.map((req) => (
                  <div key={req.retailer.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{req.retailer.shop_name}</p>
                      <p className="text-xs text-slate-500">{req.retailer.name} · {req.retailer.phone}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={respondingId === req.retailer.id}
                        onClick={() => handleRespond(req.retailer.id, 'REJECT')}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        disabled={respondingId === req.retailer.id}
                        onClick={() => handleRespond(req.retailer.id, 'ACCEPT')}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg transition-all hover:shadow-md disabled:opacity-50"
                      >
                        {respondingId === req.retailer.id ? '…' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending orders */}
          <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl shadow-sm">
                  <Clock size={15} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Pending Orders</p>
                  <p className="text-[11px] text-slate-400">{pending.length} awaiting your action</p>
                </div>
              </div>
              <Link to="/orders" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline">
                All orders <ArrowRight size={11} />
              </Link>
            </div>

            {pending.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {pending.slice(0, 6).map(order => (
                  <div key={order.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm truncate">{order.retailer_name}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} ·
                        <span className="font-bold text-slate-700 ml-1">₹{order.total_amount.toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={updatingOrder === order.id}
                        onClick={() => handleOrderAction(order.id, 'REJECTED')}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-40"
                        title="Reject"
                      >
                        <XCircle size={18} />
                      </button>
                      <button
                        disabled={updatingOrder === order.id}
                        onClick={() => handleOrderAction(order.id, 'ACCEPTED')}
                        className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-40"
                        title="Accept"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <Link
                        to="/orders"
                        className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="View"
                      >
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                ))}
                {pending.length > 6 && (
                  <div className="px-5 py-3 text-center">
                    <Link to="/orders" className="text-xs font-bold text-indigo-600 hover:underline">
                      +{pending.length - 6} more orders →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending orders right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right – quick actions + overdue */}
        <div className="space-y-5">

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-800 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ icon: Icon, label, path, gradient }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-start gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                    <Icon size={14} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overdue retailers */}
          {overdueCount > 0 && (
            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                  <AlertTriangle size={13} className="text-white" />
                </div>
                <p className="text-sm font-bold text-slate-800">High Risk Accounts</p>
                <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  {overdueCount}
                </span>
              </div>
              <div className="space-y-2">
                {retailers
                  .filter(r => r.current_balance > r.credit_limit * 0.8)
                  .sort((a, b) => b.current_balance - a.current_balance)
                  .slice(0, 4)
                  .map(r => (
                    <Link
                      key={r.id}
                      to="/collection"
                      className="flex items-center justify-between py-2 px-3 bg-rose-50/60 hover:bg-rose-100/60 rounded-xl transition-colors border border-rose-100/40"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{r.shop_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round((r.current_balance / r.credit_limit) * 100)}% utilized
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-rose-600 shrink-0 ml-2">
                        ₹{r.current_balance.toLocaleString('en-IN')}
                      </span>
                    </Link>
                  ))}
              </div>
              <Link
                to="/collection"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
              >
                View all in Collection <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg shadow-slate-900/10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Business Summary</p>
            <div className="space-y-3">
              {[
                { l: 'Total Orders', v: myOrders.length },
                { l: 'Delivered', v: delivered.length },
                { l: 'Active Retailers', v: retailers.filter(r => r.is_active).length },
                { l: 'Revenue', v: fmtCurrency(totalRevenue) },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">{l}</span>
                  <span className="text-sm font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


