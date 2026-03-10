import React, { useEffect, useState, useCallback } from 'react';
import {
  Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp,
  Search, FilterX, RefreshCw, AlertCircle, PackageCheck, MapPin, FileText,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { cn } from '../../utils/cn';
import { SupplyOrder, SupplyOrderStatus } from '../../types';

const STATUS_CONFIG: Record<SupplyOrderStatus, { label: string; color: string; bg: string; border: string; lightBg: string; lightBorder: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  lightBg: 'bg-amber-50',   lightBorder: 'border-amber-100',  icon: Clock },
  ACCEPTED:  { label: 'Accepted',  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',   lightBg: 'bg-blue-50',    lightBorder: 'border-blue-100',   icon: CheckCircle },
  DISPATCHED:{ label: 'Dispatched',color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200', lightBg: 'bg-violet-50',  lightBorder: 'border-violet-100', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-100',icon: PackageCheck },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',   lightBg: 'bg-rose-50',    lightBorder: 'border-rose-100',   icon: XCircle },
};

const TRANSITIONS: Partial<Record<SupplyOrderStatus, { next: SupplyOrderStatus; label: string; btnColor: string; icon: React.ElementType; needsNotes?: boolean }>> = {
  PENDING: { next: 'ACCEPTED', label: 'Accept Order', btnColor: 'bg-blue-600 hover:bg-blue-500', icon: CheckCircle },
  ACCEPTED: { next: 'DISPATCHED', label: 'Mark Dispatched', btnColor: 'bg-purple-600 hover:bg-purple-500', icon: Truck, needsNotes: true },
  DISPATCHED: { next: 'DELIVERED', label: 'Mark Delivered', btnColor: 'bg-emerald-600 hover:bg-emerald-500', icon: PackageCheck },
};

const PIPELINE: SupplyOrderStatus[] = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'];
const ALL_STATUSES: SupplyOrderStatus[] = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Horizontal stepper showing order journey */
const StatusTimeline: React.FC<{ order: SupplyOrder }> = ({ order }) => {
  if (order.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-2">
        <XCircle size={14} className="text-rose-500" />
        <span className="text-rose-600 text-xs font-semibold">Order Cancelled</span>
      </div>
    );
  }
  const currentIdx = PIPELINE.indexOf(order.status);
  const dateByStep: Record<SupplyOrderStatus, string | null | undefined> = {
    PENDING: order.created_at,
    ACCEPTED: null,
    DISPATCHED: order.dispatch_date,
    DELIVERED: order.delivered_date,
    CANCELLED: null,
  };
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {PIPELINE.map((step, idx) => {
        const cfg = STATUS_CONFIG[step];
        const Icon = cfg.icon;
        const isDone = currentIdx > idx;
        const isActive = currentIdx === idx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center shrink-0 min-w-[68px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                isDone ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                  : isActive ? cn(cfg.lightBg, cfg.border, cfg.color)
                  : 'bg-slate-100 border-slate-200 text-slate-400',
              )}>
                <Icon size={14} />
              </div>
              <div className={cn(
                'text-[10px] font-bold mt-1 text-center leading-tight',
                isDone ? 'text-emerald-600' : isActive ? cfg.color : 'text-slate-400',
              )}>
                {cfg.label}
              </div>
              {dateByStep[step] && (isDone || isActive) && (
                <div className="text-[9px] text-slate-400 mt-0.5">{fmt(dateByStep[step])}</div>
              )}
            </div>
            {idx < PIPELINE.length - 1 && (
              <div className={cn('h-0.5 flex-1 mt-4 mx-0.5', isDone ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const SupplyOrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filterStatus = searchParams.get('status') as SupplyOrderStatus | null;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/main-wholesalers/supply-orders');
      setOrders(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load supply orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (order: SupplyOrder, newStatus: SupplyOrderStatus, notes?: string) => {
    setUpdatingId(order.id);
    try {
      const { data } = await api.patch(`/main-wholesalers/supply-orders/${order.id}`, {
        status: newStatus,
        ...(notes ? { notes } : {}),
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...data } : o)));
      setExpandedId(null);
      setDispatchingId(null);
      setDispatchNotes('');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (order: SupplyOrder) => {
    if (!confirm(`Cancel supply order ${order.so_number}?`)) return;
    setCancellingId(order.id);
    try {
      const { data } = await api.patch(`/main-wholesalers/supply-orders/${order.id}`, { status: 'CANCELLED' });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...data } : o)));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Cannot cancel this order');
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.so_number.toLowerCase().includes(q) ||
        (o.wholesaler?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countByStatus = (s: SupplyOrderStatus) => orders.filter((o) => o.status === s).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Supply Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5 font-medium">Incoming orders from sub-wholesalers</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSearchParams({})}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            !filterStatus
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
          )}
        >
          All <span className="ml-1 opacity-60">{orders.length}</span>
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const count = countByStatus(s);
          return (
            <button
              key={s}
              onClick={() => setSearchParams({ status: s })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                filterStatus === s
                  ? cn(cfg.lightBg, cfg.color, cfg.border)
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
              )}
            >
              <Icon size={11} />
              {cfg.label}
              <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number or sub-wholesaler name..."
          className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 text-sm font-medium shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <FilterX size={15} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-rose-600 text-sm font-medium">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading supply orders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500 font-semibold">
            {search || filterStatus ? 'No orders match your filters' : 'No supply orders yet'}
          </div>
          <div className="text-slate-400 text-sm mt-1">
            {!search && !filterStatus && 'Sub-wholesalers will appear here when they send purchase orders to you'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === order.id;
            const transition = TRANSITIONS[order.status];
            const canCancel = ['PENDING', 'ACCEPTED'].includes(order.status);

            return (
              <div key={order.id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                {/* Order row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('p-2.5 rounded-xl border', cfg.lightBg, cfg.lightBorder)}>
                      <StatusIcon size={16} className={cfg.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-bold text-sm">{order.so_number}</span>
                        <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', cfg.lightBg, cfg.color, cfg.lightBorder)}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">
                        {order.wholesaler?.name || 'Sub-wholesaler'} · {fmt(order.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-slate-800 font-bold">₹{order.total_amount.toLocaleString('en-IN')}</div>
                      <div className="text-slate-400 text-xs">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/50">
                    {/* From info */}
                    <div className="flex items-start gap-6 text-xs">
                      <div>
                        <div className="text-slate-400 uppercase tracking-wider mb-1 font-bold text-[10px]">From</div>
                        <div className="text-slate-800 font-semibold">{order.wholesaler?.name || '—'}</div>
                        <div className="text-slate-400">{order.wholesaler?.phone}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase tracking-wider mb-1 font-bold text-[10px]">Placed</div>
                        <div className="text-slate-800">{fmt(order.created_at)}</div>
                      </div>
                      {order.purchase_order && (
                        <div>
                          <div className="text-slate-400 uppercase tracking-wider mb-1 font-bold text-[10px]">Linked PO</div>
                          <div className="text-slate-800 font-mono">{order.purchase_order.po_number}</div>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-2">Order Items</div>
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2">
                            <div className="text-slate-800 text-sm font-medium">{item.medicine_name}</div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{item.qty_ordered} units</span>
                              <span>₹{item.unit_cost}/unit</span>
                              <span className="text-slate-700 font-bold">₹{item.total_price.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-white border border-slate-100 rounded-xl px-3 py-2">
                        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Notes</div>
                        <div className="text-slate-600 text-sm">{order.notes}</div>
                      </div>
                    )}

                    {/* Status timeline */}
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-3">Order Journey</div>
                      <StatusTimeline order={order} />
                    </div>

                    {/* Invoice button — always shown */}
                    <div>
                      <button
                        onClick={() => navigate(`/wholesaler/orders/${order.id}/invoice`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-sm font-bold transition-all"
                      >
                        <FileText size={14} />
                        View Invoice
                      </button>
                    </div>

                    {/* Action buttons */}
                    {(transition || canCancel) && (
                      <div className="flex flex-col gap-2 pt-1">
                        {/* Dispatch flow: show inline notes input */}
                        {transition?.needsNotes && dispatchingId === order.id ? (
                          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                            <div className="text-xs font-bold text-violet-700">Add dispatch details (optional)</div>
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={dispatchNotes}
                                onChange={(e) => setDispatchNotes(e.target.value)}
                                placeholder="Tracking number, transport details..."
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-500/30"
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateStatus(order, 'DISPATCHED', dispatchNotes)}
                                disabled={updatingId === order.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold bg-purple-600 hover:bg-purple-500 transition-all disabled:opacity-50"
                              >
                                {updatingId === order.id ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
                                Confirm Dispatch
                              </button>
                              <button
                                onClick={() => { setDispatchingId(null); setDispatchNotes(''); }}
                                className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {transition && (
                              <button
                                onClick={() => {
                                  if (transition.needsNotes) {
                                    setDispatchingId(order.id);
                                  } else {
                                    updateStatus(order, transition.next);
                                  }
                                }}
                                disabled={updatingId === order.id}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 ${transition.btnColor}`}
                              >
                                {updatingId === order.id ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <transition.icon size={14} />
                                )}
                                {transition.label}
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => cancelOrder(order)}
                                disabled={cancellingId === order.id}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-sm font-bold transition-all disabled:opacity-50"
                              >
                                {cancellingId === order.id ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
