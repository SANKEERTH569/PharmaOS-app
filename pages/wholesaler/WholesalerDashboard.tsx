import React, { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, Truck, XCircle, TrendingUp, ArrowRight, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { cn } from '../../utils/cn';
import { SupplyOrder, SupplyOrderStatus } from '../../types';

const STATUS_CONFIG: Record<SupplyOrderStatus, { label: string; color: string; lightBg: string; lightBorder: string; darkText: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',   color: 'text-amber-600',   lightBg: 'bg-amber-50',   lightBorder: 'border-amber-100',  darkText: 'text-amber-700',   icon: Clock },
  ACCEPTED:  { label: 'Accepted',  color: 'text-blue-600',    lightBg: 'bg-blue-50',    lightBorder: 'border-blue-100',   darkText: 'text-blue-700',    icon: CheckCircle },
  DISPATCHED:{ label: 'Dispatched',color: 'text-violet-600',  lightBg: 'bg-violet-50',  lightBorder: 'border-violet-100', darkText: 'text-violet-700',  icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-600', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-100',darkText: 'text-emerald-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600',    lightBg: 'bg-rose-50',    lightBorder: 'border-rose-100',   darkText: 'text-rose-700',    icon: XCircle },
};

export const WholesalerDashboard = () => {
  const navigate = useNavigate();
  const { mainWholesaler } = useAuthStore();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/main-wholesalers/supply-orders')
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  const pending    = orders.filter((o) => o.status === 'PENDING').length;
  const accepted   = orders.filter((o) => o.status === 'ACCEPTED').length;
  const dispatched = orders.filter((o) => o.status === 'DISPATCHED').length;
  const delivered  = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((s, o) => s + o.total_amount, 0);
  const totalOrderValue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.total_amount, 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Welcome back,{' '}
          <span className="text-violet-600">{mainWholesaler?.name}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1 font-medium">Here's your supply chain at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending',    value: pending,    status: 'PENDING'    as SupplyOrderStatus },
          { label: 'Accepted',   value: accepted,   status: 'ACCEPTED'   as SupplyOrderStatus },
          { label: 'Dispatched', value: dispatched, status: 'DISPATCHED' as SupplyOrderStatus },
          { label: 'Delivered',  value: delivered,  status: 'DELIVERED'  as SupplyOrderStatus },
        ].map(({ label, value, status }) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div
              key={label}
              onClick={() => navigate(`/wholesaler/orders?status=${status}`)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', cfg.lightBg)}>
                <Icon size={18} className={cfg.color} />
              </div>
              <div className={cn('text-2xl font-black', cfg.darkText)}>{value}</div>
              <div className="text-slate-400 text-xs font-semibold mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200/80 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={14} className="text-emerald-600" />
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Revenue Earned</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-slate-400 text-xs font-medium mt-1">
            From {delivered} delivered order{delivered !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-slate-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pipeline Value</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-slate-400 text-xs font-medium mt-1">
            Across {orders.filter(o => o.status !== 'CANCELLED').length} active order{orders.filter(o => o.status !== 'CANCELLED').length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Action needed banner */}
      {pending > 0 && (
        <div
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 cursor-pointer hover:bg-amber-100/70 transition-colors"
          onClick={() => navigate('/wholesaler/orders?status=PENDING')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-amber-800 font-bold text-sm">
                {pending} order{pending > 1 ? 's' : ''} awaiting your response
              </div>
              <div className="text-amber-600 text-xs font-medium">
                Accept or decline incoming supply orders
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-amber-500" />
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-bold text-sm">Recent Supply Orders</h2>
          <button
            onClick={() => navigate('/wholesaler/orders')}
            className="text-violet-600 hover:text-violet-700 text-xs font-bold flex items-center gap-1"
          >
            View All <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : recentOrders.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Package size={36} className="text-slate-300 mx-auto mb-2" />
            <div className="text-slate-400 font-semibold text-sm">No orders yet</div>
            <div className="text-slate-300 text-xs mt-1">
              Sub-wholesalers will appear here when they send POs to you
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => {
              const cfg = STATUS_CONFIG[order.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/wholesaler/orders')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', cfg.lightBg)}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div>
                      <div className="text-slate-800 text-sm font-semibold">{order.so_number}</div>
                      <div className="text-slate-400 text-xs">{order.wholesaler?.name || 'Sub-wholesaler'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-800 text-sm font-bold">
                      ₹{order.total_amount.toLocaleString('en-IN')}
                    </div>
                    <div className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TrendingUp usage to avoid unused import warning */}
      <span className="hidden"><TrendingUp size={1} /></span>
    </div>
  );
};
