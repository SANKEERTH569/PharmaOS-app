import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Clock, CheckCircle, Truck, Package, XCircle,
  ChevronDown, ChevronUp, Building2, RefreshCw, ShoppingBag,
  ShoppingCart, Calendar, Hash, ArrowRight, TrendingUp, AlertCircle, Check
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useCartStore } from '../../store/cartStore';
import { cn } from '../../utils/cn';
import { Order, OrderStatus } from '../../types';
import { OrderTimeline } from '../../components/OrderTimeline';
import api from '../../utils/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING_RETAILER: { label: 'Needs Confirmation', color: 'text-indigo-600', icon: AlertCircle, bg: 'bg-indigo-50 border-indigo-200' },
  PENDING: { label: 'Pending', color: 'text-amber-600', icon: Clock, bg: 'bg-amber-50 border-amber-200' },
  ACCEPTED: { label: 'Accepted', color: 'text-blue-600', icon: CheckCircle, bg: 'bg-blue-50 border-blue-200' },
  DISPATCHED: { label: 'Dispatched', color: 'text-indigo-600', icon: Truck, bg: 'bg-indigo-50 border-indigo-200' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-600', icon: Package, bg: 'bg-emerald-50 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50 border-rose-200' },
  REJECTED: { label: 'Rejected', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50 border-rose-200' },
};

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DELIVERED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export const RetailerOrdersPage: React.FC = () => {
  const { orders, fetchOrders, cancelOrder } = useDataStore();
  const { addMultipleItems } = useCartStore();
  const [tab, setTab] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [processingMR, setProcessingMR] = useState<string | null>(null);

  useEffect(() => { fetchOrders().catch(() => {}); }, []);

  const filtered = orders.filter(o => {
    if (tab === 'ALL') return true;
    if (tab === 'ACTIVE') return ['PENDING_RETAILER', 'PENDING', 'ACCEPTED', 'DISPATCHED'].includes(o.status);
    if (tab === 'DELIVERED') return o.status === 'DELIVERED';
    if (tab === 'CANCELLED') return o.status === 'CANCELLED' || o.status === 'REJECTED';
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId);
    try { await cancelOrder(orderId); } catch (e) { console.error(e); }
    setCancelling(null);
    setConfirmCancel(null);
  };

  const handleMRConfirm = async (orderId: string, action: 'confirm' | 'reject') => {
    setProcessingMR(orderId);
    try {
      const endpoint = action === 'confirm' ? 'retailer-confirm' : 'retailer-reject';
      await api.patch(`/orders/${orderId}/${endpoint}`);
      await fetchOrders();
    } catch (e: any) {
      alert(e.response?.data?.error || `Failed to ${action} order`);
    } finally {
      setProcessingMR(null);
    }
  };

  const handleReorder = (order: Order) => {
    const cartItems = order.items.map(item => ({
      medicine: {
        id: item.medicine_id,
        wholesaler_id: order.wholesaler_id,
        name: item.medicine_name,
        salt: '',
        brand: '',
        unit: '',
        mrp: item.mrp,
        price: item.unit_price,
        gst_rate: item.gst_rate,
        hsn_code: item.hsn_code || '',
        stock_qty: 999,
        is_active: true,
      },
      qty: item.qty,
    }));
    addMultipleItems(cartItems);
  };

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: orders.length, icon: ClipboardList, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: orders.filter(o => ['PENDING','ACCEPTED','DISPATCHED'].includes(o.status)).length, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'DELIVERED').length, icon: Package, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
          { label: 'Value', value: `₹${orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100/80 p-3.5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center", stat.color)}>
                <stat.icon size={13} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-lg font-extrabold text-slate-800">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-100/80 p-1.5 shadow-sm">
        {TABS.map(t => {
          const count = t.key === 'ALL' ? orders.length : t.key === 'ACTIVE' ? orders.filter(o => ['PENDING_RETAILER','PENDING','ACCEPTED','DISPATCHED'].includes(o.status)).length : t.key === 'DELIVERED' ? orders.filter(o => o.status === 'DELIVERED').length : orders.filter(o => o.status === 'CANCELLED' || o.status === 'REJECTED').length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all", tab === t.key ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:bg-slate-50")}>
              {t.label} <span className={cn("text-[10px] ml-0.5", tab === t.key ? "text-blue-200" : "text-slate-400")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchOrders()} className="text-xs text-blue-600 flex items-center gap-1.5 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all"><RefreshCw size={12} />Refresh</motion.button>
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} className="text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-600">No orders found</p>
          <p className="text-sm text-slate-400 mt-1">Your orders will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            const isExpanded = expandedId === order.id;
            const showItems = isExpanded ? order.items : order.items.slice(0, 2);
            const hasMore = order.items.length > 2;

            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* Header */}
                <div className="p-4">
                  {order.status === 'PENDING_RETAILER' && (
                    <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-indigo-600 mt-0.5 shrink-0" size={18} />
                        <div>
                          <p className="text-sm font-bold text-indigo-900 leading-tight">MR Order Needs Confirmation</p>
                          <p className="text-xs text-indigo-700 mt-1">
                            Field rep <span className="font-bold">{order.salesman?.name || 'Unknown'}</span> placed this order on your behalf.
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMRConfirm(order.id, 'confirm'); }}
                              disabled={processingMR === order.id}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                            >
                              {processingMR === order.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                              Confirm Order
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMRConfirm(order.id, 'reject'); }}
                              disabled={processingMR === order.id}
                              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1", config.bg, config.color)}>
                          <StatusIcon size={10} />{config.label}
                        </span>
                        {order.invoice_no && <span className="text-[10px] text-slate-400 flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded-md font-medium"><Hash size={10} />{order.invoice_no}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium"><Calendar size={11} />{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 font-medium"><Building2 size={11} />{order.wholesaler_id?.slice(-6) || 'Supplier'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-slate-800">₹{order.total_amount.toFixed(0)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{order.items.length} items</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="mt-3.5 space-y-1.5">
                    {showItems.map((item, j) => (
                      <div key={j} className="flex items-center justify-between text-xs bg-slate-50/80 rounded-xl px-3.5 py-2.5 border border-slate-100/50">
                        <span className="text-slate-600 flex-1 truncate font-medium">{item.medicine_name}</span>
                        <span className="text-slate-400 shrink-0 ml-2 font-semibold">×{item.qty}</span>
                        <span className="text-slate-700 font-bold shrink-0 ml-3 w-16 text-right">₹{item.total_price.toFixed(0)}</span>
                      </div>
                    ))}
                    {hasMore && !isExpanded && (
                      <button onClick={() => setExpandedId(order.id)} className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 mt-1.5 hover:text-blue-700 transition-colors">
                        +{order.items.length - 2} more items <ChevronDown size={10} />
                      </button>
                    )}
                    {isExpanded && hasMore && (
                      <button onClick={() => setExpandedId(null)} className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 mt-1.5 hover:text-blue-700 transition-colors">
                        Show less <ChevronUp size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Timeline + Actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-100/60 pt-4">
                        {/* Timeline */}
                        <OrderTimeline currentStatus={order.status} createdAt={order.created_at} updatedAt={order.updated_at} />

                        {/* Actions */}
                        <div className="flex gap-2">
                          {order.status === 'PENDING' && (
                            confirmCancel === order.id ? (
                              <div className="flex gap-2 w-full">
                                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleCancel(order.id)} disabled={cancelling === order.id}
                                  className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 rounded-xl transition-all shadow-sm">
                                  {cancelling === order.id ? 'Cancelling...' : 'Confirm Cancel'}
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirmCancel(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                                  Keep Order
                                </motion.button>
                              </div>
                            ) : (
                              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirmCancel(order.id)} className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 rounded-xl transition-all border border-rose-200">
                                Cancel Order
                              </motion.button>
                            )
                          )}
                          {order.status === 'DELIVERED' && (
                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleReorder(order)} className="text-xs font-bold text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-blue-200/50">
                              <ShoppingCart size={12} /> Reorder
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expand Toggle */}
                {!isExpanded && (
                  <button onClick={() => setExpandedId(order.id)} className="w-full py-2.5 text-[10px] font-bold text-slate-500 hover:text-blue-600 bg-slate-50/50 hover:bg-blue-50 transition-all flex items-center justify-center gap-1 border-t border-slate-100/60">
                    View Details <ChevronDown size={10} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
