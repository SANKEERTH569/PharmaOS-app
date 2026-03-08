import React, { useEffect, useState } from 'react';
import {
  Plus, FileText, Truck, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, PackageCheck, Send,
  Package, Trash2, AlertCircle, Filter, RotateCcw, Building, LinkIcon,
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { GRNModal } from '../components/GRNModal';
import { PurchaseOrder, POStatus, POItem } from '../types';
import api from '../utils/api';

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

// ── Create PO Modal ────────────────────────────────────────────────────────

interface CreatePOModalProps {
  onClose: () => void;
}

interface NewPOItem {
  medicine_id: string;
  medicine_name: string;
  qty_ordered: number;
  unit_cost: number;
}

const emptyPOLine = (): NewPOItem => ({
  medicine_id: '',
  medicine_name: '',
  qty_ordered: 0,
  unit_cost: 0,
});

const CreatePOModal = ({ onClose }: CreatePOModalProps) => {
  const { medicines, createPurchaseOrder } = useDataStore();
  const activeMedicines = medicines.filter((m) => m.is_active && m.wholesaler_id);

  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewPOItem[]>([emptyPOLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [medSearch, setMedSearch] = useState<Record<number, string>>({});

  // MainWholesaler linking
  const [linkToMW, setLinkToMW] = useState(false);
  const [mwSearch, setMwSearch] = useState('');
  const [mwResults, setMwResults] = useState<{ id: string; name: string; phone: string; address?: string | null }[]>([]);
  const [selectedMW, setSelectedMW] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [mwSearching, setMwSearching] = useState(false);

  const searchMW = async (q: string) => {
    if (!q || q.length < 2) { setMwResults([]); return; }
    setMwSearching(true);
    try {
      const { data } = await api.get('/main-wholesalers/list', { params: { q } });
      setMwResults(data);
    } finally {
      setMwSearching(false);
    }
  };

  React.useEffect(() => {
    const t = setTimeout(() => searchMW(mwSearch), 300);
    return () => clearTimeout(t);
  }, [mwSearch]);

  const updateItem = <K extends keyof NewPOItem>(
    idx: number,
    key: K,
    value: NewPOItem[K]
  ) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const selectMed = (idx: number, med: any) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, medicine_id: med.id, medicine_name: med.name, unit_cost: med.price }
          : item
      )
    );
    setMedSearch((prev) => ({ ...prev, [idx]: '' }));
  };

  const handleSubmit = async () => {
    setError('');
    const effectiveSupplierName = linkToMW && selectedMW ? selectedMW.name : supplierName.trim();
    if (!effectiveSupplierName) return setError(linkToMW ? 'Please select a wholesaler from the platform.' : 'Supplier name is required.');
    for (const [i, item] of items.entries()) {
      if (!item.medicine_name.trim()) return setError(`Row ${i + 1}: medicine name is required.`);
      if (item.qty_ordered <= 0) return setError(`Row ${i + 1}: quantity must be > 0.`);
    }

    setSaving(true);
    try {
      await createPurchaseOrder({
        supplier_name: effectiveSupplierName,
        supplier_phone: (linkToMW && selectedMW ? selectedMW.phone : supplierPhone.trim()) || undefined,
        supplier_gstin: supplierGstin.trim() || undefined,
        notes: notes.trim() || undefined,
        main_wholesaler_id: linkToMW && selectedMW ? selectedMW.id : undefined,
        items,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to create PO.');
    } finally {
      setSaving(false);
    }
  };

  const totalValue = items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800">New Purchase Order</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Link to PharmaOS Wholesaler (optional) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building size={15} className="text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">Order from a Wholesaler on PharmaOS</span>
                <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Optional</span>
              </div>
              <button
                type="button"
                onClick={() => { setLinkToMW(!linkToMW); setSelectedMW(null); setMwSearch(''); setMwResults([]); }}
                className={`relative w-10 h-5 rounded-full transition-colors ${linkToMW ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${linkToMW ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {linkToMW && (
              <div className="mt-3 relative">
                {selectedMW ? (
                  <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{selectedMW.name}</div>
                      <div className="text-xs text-slate-500">{selectedMW.phone}</div>
                    </div>
                    <button onClick={() => setSelectedMW(null)} className="text-slate-400 hover:text-rose-500 text-lg leading-none">×</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={mwSearch}
                      onChange={(e) => setMwSearch(e.target.value)}
                      placeholder="Search wholesaler by name or phone..."
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {mwSearching && <div className="text-xs text-slate-500 mt-1">Searching...</div>}
                    {mwResults.length > 0 && (
                      <ul className="absolute z-30 left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {mwResults.map((mw) => (
                          <li
                            key={mw.id}
                            onClick={() => { setSelectedMW(mw); setMwSearch(''); setMwResults([]); if (!supplierName) setSupplierName(mw.name); }}
                            className="px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
                          >
                            <div className="font-semibold text-slate-800">{mw.name}</div>
                            <div className="text-xs text-slate-500">{mw.phone}{mw.address ? ` · ${mw.address}` : ''}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {mwSearch.length >= 2 && !mwSearching && mwResults.length === 0 && (
                      <div className="text-xs text-slate-500 mt-1">No wholesalers found. You can still enter manual supplier details below.</div>
                    )}
                  </>
                )}
                {selectedMW && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <LinkIcon size={11} />
                    When you mark this PO as "Sent", an order will automatically appear in their dashboard.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Supplier details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Supplier / Stockist Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Apollo Pharmacy Dist."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phone (optional)
              </label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Supplier GSTIN (optional)
              </label>
              <input
                type="text"
                value={supplierGstin}
                onChange={(e) => setSupplierGstin(e.target.value)}
                placeholder="27AAPFU0939F1ZV"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery timeline, special instructions..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</span>
              <button
                onClick={() => setItems((prev) => [...prev, emptyPOLine()])}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus size={13} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2 rounded-tl-lg w-52">Medicine</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 w-20">Qty</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 w-28">Unit Cost (₹)</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 rounded-tr-lg w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const search = medSearch[idx] ?? '';
                    const suggestions =
                      search.length >= 2
                        ? activeMedicines
                            .filter(
                              (m) =>
                                m.name.toLowerCase().includes(search.toLowerCase()) ||
                                (m.brand ?? '').toLowerCase().includes(search.toLowerCase())
                            )
                            .slice(0, 6)
                        : [];

                    return (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-2 relative">
                          {item.medicine_id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-700 font-medium truncate max-w-[170px]">
                                {item.medicine_name}
                              </span>
                              <button
                                onClick={() => updateItem(idx, 'medicine_id', '')}
                                className="text-slate-400 hover:text-rose-500"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                value={search}
                                placeholder="Search or type name…"
                                onChange={(e) => {
                                  setMedSearch((prev) => ({ ...prev, [idx]: e.target.value }));
                                  if (!item.medicine_id) {
                                    updateItem(idx, 'medicine_name', e.target.value);
                                  }
                                }}
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              {suggestions.length > 0 && (
                                <ul className="absolute z-30 left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                  {suggestions.map((m) => (
                                    <li
                                      key={m.id}
                                      onClick={() => selectMed(idx, m)}
                                      className="px-3 py-1.5 text-xs cursor-pointer hover:bg-indigo-50"
                                    >
                                      <span className="font-medium text-slate-700">{m.name}</span>
                                      <span className="text-slate-400 ml-1">({m.brand})</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.qty_ordered || ''}
                            onChange={(e) => updateItem(idx, 'qty_ordered', parseInt(e.target.value) || 0)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost || ''}
                            onChange={(e) => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-slate-700 font-medium">
                          ₹{(item.qty_ordered * item.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-1 py-2">
                          {items.length > 1 && (
                            <button
                              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Order Value:{' '}
            <span className="font-semibold text-slate-800">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── PO Row (expandable) ────────────────────────────────────────────────────

const PORow: React.FC<{ po: PurchaseOrder }> = ({ po }) => {
  const { updatePOStatus, deletePurchaseOrder } = useDataStore();
  const [expanded, setExpanded] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
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
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                  po.supply_order.status === 'DELIVERED'
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
          </div>
        )}
      </div>

      {showGRN && (
        <GRNModal linkedPO={po} onClose={() => setShowGRN(false)} />
      )}
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

export const PurchaseOrdersPage = () => {
  const { purchaseOrders, fetchPurchaseOrders, fetchGRNs, grns, fetchMedicines } = useDataStore();

  const [filter, setFilter] = useState<POStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'pos' | 'grns'>('pos');
  const [showCreatePO, setShowCreatePO] = useState(false);
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
            onClick={() => setShowCreatePO(true)}
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
              className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                isActive
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
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'pos'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'grns'
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
                onClick={() => setShowCreatePO(true)}
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
      {showCreatePO && <CreatePOModal onClose={() => setShowCreatePO(false)} />}
      {showStandaloneGRN && (
        <GRNModal onClose={() => setShowStandaloneGRN(false)} />
      )}
    </div>
  );
};
