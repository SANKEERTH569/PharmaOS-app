import React, { useEffect, useState } from 'react';
import {
  Plus, FileText, Truck, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, PackageCheck, Send,
  Package, Trash2, AlertCircle, Filter, RotateCcw, Building, LinkIcon, Printer,
  RefreshCw, X, FlaskConical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { GRNModal } from '../components/GRNModal';
import { PurchaseOrder, POStatus, POItem } from '../types';
import api from '../utils/api';

// ── Update Stock Modal ─────────────────────────────────────────────────────

interface StockItem {
  medicine_name: string;
  qty_received: number | '';
  unit_cost: number | '';
  mrp: number | '';
  batch_no: string;
  expiry_date: string;
}

const UpdateStockModal: React.FC<{ po: PurchaseOrder; onClose: () => void; onDone: () => void }> = ({ po, onClose, onDone }) => {
  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  };

  const [items, setItems] = useState<StockItem[]>(
    po.items.map((i, idx) => ({
      medicine_name: i.medicine_name,
      qty_received: i.qty_ordered,
      unit_cost: i.unit_cost,
      mrp: i.unit_cost,
      batch_no: `PO-${Date.now()}-${idx + 1}`,
      expiry_date: defaultExpiry(),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (idx: number, field: keyof StockItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const handleConfirm = async () => {
    setError('');
    setSaving(true);
    try {
      const normalizedItems = items.map((item) => ({
        ...item,
        qty_received: Number(item.qty_received),
        unit_cost: Number(item.unit_cost),
        mrp: Number(item.mrp),
      }));
      await api.post(`/purchase-orders/${po.id}/receive-stock`, { items: normalizedItems });
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to update stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FlaskConical size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Update Medicine Stock</h2>
              <p className="text-xs text-slate-400">{po.po_number} · {po.supplier_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Review quantities, set batch numbers and expiry dates, then confirm to add stock to your medicine inventory.
          </p>
          {items.map((item, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">{item.medicine_name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty Received</label>
                  <input
                    type="number" min="0"
                    value={item.qty_received}
                    onChange={e => updateItem(idx, 'qty_received', e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Cost (₹)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.unit_cost}
                    onChange={e => updateItem(idx, 'unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MRP (₹)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.mrp}
                    onChange={e => updateItem(idx, 'mrp', e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batch No.</label>
                  <input
                    type="text"
                    value={item.batch_no}
                    onChange={e => updateItem(idx, 'batch_no', e.target.value)}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={item.expiry_date}
                    onChange={e => updateItem(idx, 'expiry_date', e.target.value)}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
            {saving ? 'Updating…' : 'Confirm & Update Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_META: Record<
  POStatus,
  { label: string; icon: React.FC<any>; color: string; bg: string }
> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-100 border-slate-200',
  },
  SENT: {
    label: 'Sent',
    icon: Send,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  PARTIALLY_RECEIVED: {
    label: 'Partial',
    icon: Package,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  RECEIVED: {
    label: 'Received',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
};

const StatusBadge = ({ status }: { status: POStatus }) => {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}
    >
      <Icon size={11} />
      {m.label}
    </span>
  );
};

// ── PO Row (expandable) ────────────────────────────────────────────────────

const PORow: React.FC<{ po: PurchaseOrder }> = ({ po }) => {
  const { updatePOStatus, deletePurchaseOrder, fetchPurchaseOrders, fetchMedicines } = useDataStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
  const [showUpdateStock, setShowUpdateStock] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalOrdered = po.items.reduce((s, i) => s + i.qty_ordered, 0);
  const totalValue = po.items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);

  const handleTransition = async (newStatus: POStatus) => {
    if (
      newStatus === 'CANCELLED' &&
      !window.confirm('Cancel this purchase order?')
    )
      return;
    setLoading(true);
    try {
      await updatePOStatus(po.id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this PO? This cannot be undone.')) return;
    setLoading(true);
    try {
      await deletePurchaseOrder(po.id);
    } finally {
      setLoading(false);
    }
  };

  const canReceive = po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED';
  const canUpdateStock =
    po.status !== 'RECEIVED' &&
    po.status !== 'CANCELLED' &&
    po.supply_order?.status === 'DELIVERED';

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Summary row */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{po.po_number}</span>
              <StatusBadge status={po.status} />
              {po.supply_order && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${po.supply_order.status === 'DELIVERED'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : po.supply_order.status === 'DISPATCHED'
                      ? 'bg-purple-50 text-purple-600 border-purple-200'
                      : po.supply_order.status === 'ACCEPTED'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : po.supply_order.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-500 border-red-200'
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                  <Building size={10} />
                  {po.supply_order.so_number} · {po.supply_order.status === 'DELIVERED' ? 'Delivered ✓' : po.supply_order.status}
                </span>
              )}
              {po.grns && po.grns.length > 0 && (
                <span className="text-xs text-slate-400">
                  {po.grns.length} GRN{po.grns.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500">
                <Truck size={11} className="inline mr-1 text-slate-400" />
                {po.supplier_name}
              </span>
              {po.supplier_phone && (
                <span className="text-xs text-slate-400">{po.supplier_phone}</span>
              )}
              <span className="text-xs text-slate-400">
                {new Date(po.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-slate-800">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500">{po.items.length} item{po.items.length !== 1 ? 's' : ''} · {totalOrdered} units</div>
          </div>

          <div className="shrink-0 flex items-center gap-1">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : (
              <>
                {/* Actions based on status */}
                {po.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTransition('SENT');
                      }}
                      title="Mark as Sent"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Send size={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      title="Delete PO"
                      className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
                {canUpdateStock && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUpdateStock(true);
                    }}
                    title="Update Medicine Stock"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                  >
                    <RefreshCw size={13} /> Update Stock
                  </button>
                )}
                {canReceive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGRN(true);
                    }}
                    title="Receive Goods (GRN)"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <PackageCheck size={14} /> Receive
                  </button>
                )}
                {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransition('CANCELLED');
                    }}
                    title="Cancel PO"
                    className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <XCircle size={15} />
                  </button>
                )}
              </>
            )}
            {expanded ? (
              <ChevronUp size={16} className="text-slate-400 ml-1" />
            ) : (
              <ChevronDown size={16} className="text-slate-400 ml-1" />
            )}
          </div>
        </div>

        {/* Expanded items */}
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            {po.notes && (
              <p className="text-xs text-slate-500 mb-2 italic">{po.notes}</p>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left font-medium pb-1 w-1/2">Medicine</th>
                  <th className="text-right font-medium pb-1">Ordered</th>
                  <th className="text-right font-medium pb-1">Received</th>
                  <th className="text-right font-medium pb-1">Unit Cost</th>
                  <th className="text-right font-medium pb-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item: POItem) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-1 text-slate-700 font-medium">{item.medicine_name}</td>
                    <td className="py-1 text-right text-slate-600">{item.qty_ordered}</td>
                    <td className="py-1 text-right">
                      <span
                        className={
                          item.qty_received >= item.qty_ordered
                            ? 'text-emerald-600 font-medium'
                            : item.qty_received > 0
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }
                      >
                        {item.qty_received}
                      </span>
                    </td>
                    <td className="py-1 text-right text-slate-600">
                      ₹{item.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 text-right text-slate-700 font-medium">
                      ₹{(item.qty_ordered * item.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Supply Order Tracking */}
            {po.supply_order && (() => {
              const soSteps = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'] as const;
              const statusColors: Record<string, { dot: string; text: string; bg: string }> = {
                PENDING: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
                ACCEPTED: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                DISPATCHED: { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
                DELIVERED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                CANCELLED: { dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50' },
              };
              const currentIdx = soSteps.indexOf(po.supply_order!.status as any);
              const isCancelled = po.supply_order!.status === 'CANCELLED';
              return (
                <div className="mt-3 border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building size={13} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-700">Wholesaler Fulfillment</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{po.supply_order!.so_number}</span>
                  </div>
                  {isCancelled ? (
                    <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      Supply order was cancelled by wholesaler
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {soSteps.map((step, idx) => {
                        const isDone = currentIdx > idx;
                        const isActive = currentIdx === idx;
                        const c = statusColors[step];
                        const labels: Record<string, string> = { PENDING: 'Pending', ACCEPTED: 'Accepted', DISPATCHED: 'In Transit', DELIVERED: 'Delivered' };
                        return (
                          <React.Fragment key={step}>
                            <div className={`flex items-center gap-1 shrink-0 ${!isDone && !isActive ? 'opacity-30' : ''}`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${isDone || isActive ? c.dot : 'bg-slate-300'}`} />
                              <span className={`text-[10px] font-bold ${isActive ? c.text : isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                                {labels[step]}
                              </span>
                            </div>
                            {idx < soSteps.length - 1 && (
                              <div className={`w-5 h-px shrink-0 ${currentIdx > idx ? 'bg-slate-400' : 'bg-slate-200'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* GRN list */}
            {po.grns && po.grns.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Goods Receipt Notes</p>
                <div className="flex flex-wrap gap-2">
                  {po.grns.map((grn) => (
                    <span
                      key={grn.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full"
                    >
                      <PackageCheck size={11} />
                      {grn.grn_number} · {new Date(grn.created_at).toLocaleDateString('en-IN')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* View Invoice button */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => navigate(`/purchase-orders/${po.id}/invoice`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                <Printer size={13} /> View Invoice
              </button>
            </div>
          </div>
        )}
      </div>

      {showGRN && (
        <GRNModal linkedPO={po} onClose={() => setShowGRN(false)} />
      )}
      {showUpdateStock && (
        <UpdateStockModal
          po={po}
          onClose={() => setShowUpdateStock(false)}
          onDone={async () => {
            await Promise.all([fetchPurchaseOrders(), fetchMedicines()]);
          }}
        />
      )}
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

export const PurchaseOrdersPage = () => {
  const navigate = useNavigate();
  const { purchaseOrders, fetchPurchaseOrders, fetchGRNs, grns, fetchMedicines } = useDataStore();

  const [filter, setFilter] = useState<POStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'pos' | 'grns'>('pos');
  const [showStandaloneGRN, setShowStandaloneGRN] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPurchaseOrders(), fetchGRNs(), fetchMedicines()]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered =
    filter === 'ALL'
      ? purchaseOrders
      : purchaseOrders.filter((po) => po.status === filter);

  const statusCounts = purchaseOrders.reduce<Record<string, number>>((acc, po) => {
    acc[po.status] = (acc[po.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage orders to stockists / manufacturers and receive goods into inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStandaloneGRN(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            <PackageCheck size={16} />
            Quick GRN
          </button>
          <button
            onClick={() => navigate('/purchase-orders/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            New PO
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['ALL', 'DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const).map((s) => {
          const count = s === 'ALL' ? purchaseOrders.length : (statusCounts[s] ?? 0);
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all ${isActive
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
            >
              <div
                className={`text-lg font-bold ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}
              >
                {count}
              </div>
              <div className={`text-xs mt-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                {s === 'ALL'
                  ? 'All POs'
                  : s === 'PARTIALLY_RECEIVED'
                    ? 'Partial'
                    : s.charAt(0) + s.slice(1).toLowerCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pos'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'grns'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          GRNs ({grns.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : activeTab === 'pos' ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <FileText size={26} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No purchase orders</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'ALL'
                ? 'Create your first PO to start ordering from suppliers.'
                : `No ${filter.toLowerCase().replace('_', ' ')} purchase orders.`}
            </p>
            {filter === 'ALL' && (
              <button
                onClick={() => navigate('/purchase-orders/new')}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors"
              >
                <Plus size={15} /> Create PO
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((po) => (
              <PORow key={po.id} po={po} />
            ))}
          </div>
        )
      ) : /* GRNs tab */
        grns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <PackageCheck size={26} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No goods received yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Use "Quick GRN" or receive against a PO to add stock.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grns.map((grn) => (
              <div
                key={grn.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{grn.grn_number}</span>
                      {grn.po && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">
                          {grn.po.po_number}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <Truck size={11} className="inline mr-1 text-slate-400" />
                      {grn.supplier_name} · {new Date(grn.created_at).toLocaleDateString('en-IN')}
                    </div>
                    {grn.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">{grn.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800">
                      ₹{grn.items
                        .reduce((s, i) => s + i.qty_received * i.unit_cost, 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {grn.items.length} item{grn.items.length !== 1 ? 's' : ''} ·{' '}
                      {grn.items.reduce((s, i) => s + i.qty_received, 0)} units
                    </div>
                  </div>
                </div>
                {/* GRN Items */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left font-medium pb-1">Medicine</th>
                        <th className="text-left font-medium pb-1">Batch</th>
                        <th className="text-left font-medium pb-1">Expiry</th>
                        <th className="text-right font-medium pb-1">Qty</th>
                        <th className="text-right font-medium pb-1">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grn.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-50">
                          <td className="py-1 text-slate-700 font-medium">{item.medicine_name}</td>
                          <td className="py-1 text-slate-500">{item.batch_no}</td>
                          <td className="py-1 text-slate-500">
                            {new Date(item.expiry_date).toLocaleDateString('en-IN', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-1 text-right text-emerald-600 font-medium">
                            +{item.qty_received}
                          </td>
                          <td className="py-1 text-right text-slate-600">
                            ₹{item.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Modals */}
      {showStandaloneGRN && (
        <GRNModal onClose={() => setShowStandaloneGRN(false)} />
      )}
    </div>
  );
};
