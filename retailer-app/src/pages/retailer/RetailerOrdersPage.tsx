import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Clock, CheckCircle, Truck, Package, XCircle,
  ChevronDown, ChevronUp, Building2, RefreshCw, ShoppingBag,
  ShoppingCart, Calendar, Hash, ArrowRight,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useCartStore } from '../../store/cartStore';
import { cn } from '../../utils/cn';
import { Order, OrderStatus } from '../../types';
import { OrderTimeline } from '../../components/OrderTimeline';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
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

  useEffect(() => { fetchOrders().catch(() => {}); }, []);

  const filtered = orders.filter(o => {
    if (tab === 'ALL') return true;
    if (tab === 'ACTIVE') return ['PENDING', 'ACCEPTED', 'DISPATCHED'].includes(o.status);
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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 py-2 text-xs font-medium rounded-lg transition-colors", tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
        <button onClick={() => fetchOrders()} className="text-xs text-blue-600 flex items-center gap-1 font-medium hover:text-blue-700"><RefreshCw size={12} />Refresh</button>
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No orders found</p>
          <p className="text-xs text-slate-400 mt-1">Your orders will appear here</p>
        </div>
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
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1", config.bg, config.color)}>
                          <StatusIcon size={10} />{config.label}
                        </span>
                        {order.invoice_no && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Hash size={10} />{order.invoice_no}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={11} />{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Building2 size={11} />{order.wholesaler_id?.slice(-6) || 'Supplier'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-800">₹{order.total_amount.toFixed(0)}</p>
                      <p className="text-[10px] text-slate-400">{order.items.length} items</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="mt-3 space-y-1.5">
                    {showItems.map((item, j) => (
                      <div key={j} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600 flex-1 truncate">{item.medicine_name}</span>
                        <span className="text-slate-400 shrink-0 ml-2">×{item.qty}</span>
                        <span className="text-slate-700 font-medium shrink-0 ml-3 w-16 text-right">₹{item.total_price.toFixed(0)}</span>
                      </div>
                    ))}
                    {hasMore && !isExpanded && (
                      <button onClick={() => setExpandedId(order.id)} className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5 mt-1">
                        +{order.items.length - 2} more items <ChevronDown size={10} />
                      </button>
                    )}
                    {isExpanded && hasMore && (
                      <button onClick={() => setExpandedId(null)} className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5 mt-1">
                        Show less <ChevronUp size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Timeline + Actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-50 pt-4">
                        {/* Timeline */}
                        <OrderTimeline currentStatus={order.status} createdAt={order.created_at} updatedAt={order.updated_at} />

                        {/* Actions */}
                        <div className="flex gap-2">
                          {order.status === 'PENDING' && (
                            confirmCancel === order.id ? (
                              <div className="flex gap-2 w-full">
                                <button onClick={() => handleCancel(order.id)} disabled={cancelling === order.id}
                                  className="flex-1 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors">
                                  {cancelling === order.id ? 'Cancelling...' : 'Confirm Cancel'}
                                </button>
                                <button onClick={() => setConfirmCancel(null)} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                  Keep Order
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmCancel(order.id)} className="text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors border border-rose-200">
                                Cancel Order
                              </button>
                            )
                          )}
                          {order.status === 'DELIVERED' && (
                            <button onClick={() => handleReorder(order)} className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200">
                              <ShoppingCart size={12} /> Reorder
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expand Toggle */}
                {!isExpanded && (
                  <button onClick={() => setExpandedId(order.id)} className="w-full py-2.5 text-[10px] font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 border-t border-slate-50">
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
