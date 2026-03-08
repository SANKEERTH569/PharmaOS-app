import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Plus, Clock, CheckCircle, XCircle, Building2,
  ChevronDown, ChevronRight, Package, Calendar, Search,
  AlertTriangle, AlertCircle, Send, Loader2, X, Check,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { ReturnReason } from '../../types';
import { cn } from '../../utils/cn';
import api from '../../utils/api';

interface SelectedReturnItem {
  order_id: string;
  order_invoice: string;
  medicine_id: string;
  medicine_name: string;
  max_qty: number;
  qty: number;
  unit_price: number;
  batch_no: string;
  expiry_date: string;
  reason_detail: string;
  selected: boolean;
}

export const RetailerReturnsPage = () => {
  const { returns, fetchReturns, submitReturn, orders, fetchOrders } = useDataStore();
  const { retailer } = useAuthStore();

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<ReturnReason>('EXPIRED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedReturn, setExpandedReturn] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [itemSearch, setItemSearch] = useState('');

  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [orderItems, setOrderItems] = useState<SelectedReturnItem[]>([]);

  useEffect(() => {
    fetchReturns();
    fetchOrders();
    api.get('/retailer/agencies').then(res => {
      const active = res.data.filter((a: any) => a.status === 'ACTIVE');
      setAgencies(active);
      if (active.length > 0) setSelectedWholesaler(active[0].wholesaler_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWholesaler || !retailer) return;
    const deliveredOrders = orders.filter(
      o => o.wholesaler_id === selectedWholesaler && o.retailer_id === retailer.id && o.status === 'DELIVERED'
    );
    const items: SelectedReturnItem[] = [];
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        items.push({
          order_id: order.id,
          order_invoice: order.invoice_no || order.id.slice(-6).toUpperCase(),
          medicine_id: item.medicine_id,
          medicine_name: item.medicine_name,
          max_qty: item.qty,
          qty: item.qty,
          unit_price: item.unit_price,
          batch_no: '',
          expiry_date: (item as any).expiry_date || '',
          reason_detail: '',
          selected: false,
        });
      });
    });
    setOrderItems(items);
    setItemSearch('');
  }, [selectedWholesaler, orders, retailer]);

  const myReturns = returns.filter(r => r.retailer_id === retailer?.id);
  const filteredReturns = filter === 'ALL' ? myReturns : myReturns.filter(r => r.status === filter);

  const visibleOrderItems = useMemo(() => {
    if (!itemSearch.trim()) return orderItems;
    const q = itemSearch.toLowerCase();
    return orderItems.filter(i => i.medicine_name.toLowerCase().includes(q) || i.order_invoice.toLowerCase().includes(q));
  }, [orderItems, itemSearch]);

  const selectedItems = orderItems.filter(i => i.selected);
  const totalAmount = selectedItems.reduce((sum, i) => sum + (i.qty * i.unit_price), 0);

  const toggleItem = (idx: number) => {
    const realIdx = orderItems.indexOf(visibleOrderItems[idx]);
    if (realIdx === -1) return;
    setOrderItems(prev => prev.map((item, i) => i === realIdx ? { ...item, selected: !item.selected } : item));
  };

  const updateItemField = (realIdx: number, field: string, value: any) => {
    setOrderItems(prev => prev.map((item, i) => i === realIdx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWholesaler || selectedItems.length === 0) return;
    if (selectedItems.some(i => i.qty <= 0 || i.qty > i.max_qty)) return;
    setSubmitting(true);
    try {
      await submitReturn({
        wholesaler_id: selectedWholesaler,
        reason,
        notes: notes || undefined,
        items: selectedItems.map(i => ({
          medicine_name: i.medicine_name,
          batch_no: i.batch_no || undefined,
          expiry_date: i.expiry_date || undefined,
          qty: i.qty,
          unit_price: i.unit_price,
          reason_detail: i.reason_detail || undefined,
        })),
      });
      setShowForm(false);
      setReason('EXPIRED');
      setNotes('');
      setOrderItems(prev => prev.map(i => ({ ...i, selected: false })));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    APPROVED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    REJECTED: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  };

  const reasonConfig: Record<string, { icon: any; label: string }> = {
    EXPIRED: { icon: Calendar, label: 'Expired' },
    DAMAGED: { icon: AlertTriangle, label: 'Damaged' },
    MISSING: { icon: AlertCircle, label: 'Missing' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Returns</h1>
          <p className="text-xs text-slate-500">Return expired or damaged products</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(true); setOrderItems(prev => prev.map(i => ({ ...i, selected: false }))); }}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/25">
          <Plus size={14} /> New Return
        </motion.button>
      </div>

      {/* New Return Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100/80 shadow-lg overflow-hidden">
              {/* Form Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100/60 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <h3 className="text-sm font-bold text-slate-800">New Return Request</h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={16} className="text-slate-500" /></button>
              </div>

              <div className="p-4 space-y-4">
                {/* Supplier + Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Supplier</label>
                    <select value={selectedWholesaler} onChange={e => setSelectedWholesaler(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none">
                      {agencies.map((a: any) => <option key={a.wholesaler_id} value={a.wholesaler_id}>{a.wholesaler?.name || 'Agency'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Reason</label>
                    <div className="flex gap-2">
                      {(['EXPIRED', 'DAMAGED', 'MISSING'] as ReturnReason[]).map(r => {
                        const cfg = reasonConfig[r];
                        const Icon = cfg.icon;
                        return (
                          <button type="button" key={r} onClick={() => setReason(r)}
                            className={cn("flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold border transition-all",
                              reason === r ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                            <Icon size={12} /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Item Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items by name or invoice..."
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                </div>

                {/* Items List */}
                <div className="border border-slate-100/80 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  {visibleOrderItems.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      <Package size={20} className="mx-auto mb-1 text-slate-300" />
                      No delivered items found for this supplier
                    </div>
                  ) : (
                    visibleOrderItems.map((item, idx) => {
                      const realIdx = orderItems.indexOf(item);
                      return (
                        <div key={`${item.order_id}-${item.medicine_id}-${idx}`}
                          className={cn("flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 transition-colors", item.selected && "bg-blue-50/50")}>
                          <button type="button" onClick={() => toggleItem(idx)}
                            className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                              item.selected ? "bg-blue-600 border-blue-600" : "border-slate-300 hover:border-blue-400")}>
                            {item.selected && <Check size={12} className="text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{item.medicine_name}</p>
                            <p className="text-[10px] text-slate-400">Invoice: {item.order_invoice} · ₹{item.unit_price}</p>
                          </div>
                          {item.selected && (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateItemField(realIdx, 'qty', Math.max(1, item.qty - 1))}
                                className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold hover:bg-slate-200">−</button>
                              <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                              <button type="button" onClick={() => updateItemField(realIdx, 'qty', Math.min(item.max_qty, item.qty + 1))}
                                className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold hover:bg-slate-200">+</button>
                              <span className="text-[10px] text-slate-400 ml-1">/{item.max_qty}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Notes */}
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes (optional)..." rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none" />

                {/* Submit */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">{selectedItems.length} items selected</span>
                    {selectedItems.length > 0 && <span className="text-sm font-bold text-slate-800 ml-2">₹{totalAmount.toFixed(0)}</span>}
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting || selectedItems.length === 0}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit Return
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={cn("text-[10px] font-bold px-3.5 py-1.5 rounded-lg border whitespace-nowrap transition-all",
              filter === f ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
            {f === 'ALL' ? `All (${myReturns.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${myReturns.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Return History */}
      <div className="space-y-2">
        {filteredReturns.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 bg-white rounded-2xl border border-slate-100/80 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <RotateCcw size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No returns found</p>
            <p className="text-xs text-slate-400 mt-1">Your return requests will appear here</p>
          </motion.div>
        ) : (
          filteredReturns.map((ret: any) => {
            const isExpanded = expandedReturn === ret.id;
            const sc = statusConfig[ret.status] || statusConfig.PENDING;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={ret.id} layout className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <button onClick={() => setExpandedReturn(isExpanded ? null : ret.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", sc.bg, sc.bg.replace('bg-', 'border-').replace('50', '100/50'))}>
                    <StatusIcon size={16} className={sc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">Return #{ret.id.slice(-6).toUpperCase()}</p>
                      <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg", sc.bg, sc.color)}>{ret.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(ret.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {ret.items?.length || 0} items · ₹{ret.total_amount?.toFixed(0) || '0'}
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-50">
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Building2 size={12} />{ret.wholesaler?.name || 'Supplier'}</span>
                          <span className="flex items-center gap-1">{reasonConfig[ret.reason]?.icon && React.createElement(reasonConfig[ret.reason]?.icon, { size: 12 })} {ret.reason}</span>
                        </div>
                        {ret.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{ret.notes}</p>}
                        <div className="space-y-1.5">
                          {(ret.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                              <div>
                                <p className="text-xs font-medium text-slate-700">{item.medicine_name}</p>
                                {item.batch_no && <p className="text-[10px] text-slate-400">Batch: {item.batch_no}</p>}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-slate-800">{item.qty} × ₹{item.unit_price}</p>
                                <p className="text-[10px] text-slate-400">₹{(item.qty * item.unit_price).toFixed(0)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {ret.admin_notes && (
                          <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700">
                            <span className="font-semibold">Response:</span> {ret.admin_notes}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
