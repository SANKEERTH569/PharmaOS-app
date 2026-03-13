import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  RotateCcw, Plus, Clock, CheckCircle, XCircle, Building2,
  ChevronDown, ChevronRight, Package, Calendar, Search,
  AlertTriangle, AlertCircle, Send, Loader2, X, Check,
  ShieldAlert, PackageX, Minus,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { ReturnReason, ComplaintType } from '../../types';
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
  const [searchParams] = useSearchParams();
  const { returns, fetchReturns, submitReturn, orders, fetchOrders, stockComplaints, fetchStockComplaints, submitStockComplaint } = useDataStore();
  const { retailer } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'RETURNS' | 'COMPLAINTS'>('RETURNS');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'complaints') {
      setActiveTab('COMPLAINTS');
    }
  }, [searchParams]);

  // ── Return form state ──────────────────────────────────────────────────
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

  // ── Complaint form state ───────────────────────────────────────────────
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintType, setComplaintType] = useState<ComplaintType>('SHORT_DELIVERY');
  const [complaintNotes, setComplaintNotes] = useState('');
  const [complaintWholesaler, setComplaintWholesaler] = useState('');
  const [complaintOrderId, setComplaintOrderId] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(null);
  const [complaintFilter, setComplaintFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');

  interface ComplaintItem { order_item_key: string; medicine_name: string; ordered_qty: number; received_qty: number; unit_price: number; }
  const [complaintItems, setComplaintItems] = useState<ComplaintItem[]>([
    { order_item_key: '', medicine_name: '', ordered_qty: 0, received_qty: 0, unit_price: 0 },
  ]);

  useEffect(() => {
    fetchReturns();
    fetchOrders();
    fetchStockComplaints();
    api.get('/retailer/agencies').then(res => {
      const active = res.data.filter((a: any) => a.status === 'ACTIVE');
      setAgencies(active);
      if (active.length > 0) {
        setSelectedWholesaler(active[0].wholesaler_id);
        setComplaintWholesaler(active[0].wholesaler_id);
      }
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

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedComplaintItems = complaintItems.filter(i => i.order_item_key && i.medicine_name.trim());
    if (!complaintWholesaler || !complaintOrderId || selectedComplaintItems.length === 0) return;
    setSubmittingComplaint(true);
    try {
      await submitStockComplaint({
        wholesaler_id: complaintWholesaler,
        order_id: complaintOrderId || undefined,
        complaint_type: complaintType,
        notes: complaintNotes || undefined,
        items: selectedComplaintItems.map(({ medicine_name, ordered_qty, received_qty, unit_price }) => ({
          medicine_name,
          ordered_qty,
          received_qty,
          unit_price,
        })),
      });
      setShowComplaintForm(false);
      setComplaintNotes('');
      setComplaintOrderId('');
      setComplaintItems([{ order_item_key: '', medicine_name: '', ordered_qty: 0, received_qty: 0, unit_price: 0 }]);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to submit complaint');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Orders for the complaint order-picker (all delivered orders for selected supplier)
  const complaintOrders = useMemo(() => {
    if (!complaintWholesaler || !retailer) return [];
    return orders.filter(o => o.wholesaler_id === complaintWholesaler && o.retailer_id === retailer.id && o.status === 'DELIVERED');
  }, [complaintWholesaler, orders, retailer]);

  const complaintOrderItems = useMemo(() => {
    if (!complaintOrderId) return [];
    const selectedOrder = complaintOrders.find(o => o.id === complaintOrderId);
    if (!selectedOrder?.items?.length) return [];

    return selectedOrder.items.map((item: any, idx: number) => ({
      key: `${item.medicine_id || item.medicine_name}-${idx}`,
      medicine_name: item.medicine_name || '',
      ordered_qty: Number(item.qty) || 0,
      unit_price: Number(item.unit_price) || 0,
    }));
  }, [complaintOrderId, complaintOrders]);

  useEffect(() => {
    setComplaintItems([{ order_item_key: '', medicine_name: '', ordered_qty: 0, received_qty: 0, unit_price: 0 }]);
  }, [complaintOrderId]);

  const myComplaints = stockComplaints.filter(c => c.retailer_id === retailer?.id);
  const filteredComplaints = complaintFilter === 'ALL' ? myComplaints : myComplaints.filter(c => c.status === complaintFilter);

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    APPROVED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    REJECTED: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  };

  const complaintStatusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    OPEN: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Open' },
    ACKNOWLEDGED: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Acknowledged' },
    RESOLVED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Resolved' },
  };

  const complaintTypeConfig: Record<ComplaintType, { icon: any; label: string; color: string }> = {
    SHORT_DELIVERY: { icon: Minus, label: 'Short Delivery', color: 'text-amber-600' },
    WRONG_ITEM: { icon: PackageX, label: 'Wrong Item', color: 'text-rose-600' },
    MISSING_ITEM: { icon: ShieldAlert, label: 'Missing Item', color: 'text-purple-600' },
  };

  const reasonConfig: Record<string, { icon: any; label: string }> = {
    EXPIRED: { icon: Calendar, label: 'Expired' },
    DAMAGED: { icon: AlertTriangle, label: 'Damaged' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Returns & Complaints</h1>
          <p className="text-xs text-slate-500">Manage product returns and delivery complaints</p>
        </div>
        {activeTab === 'RETURNS' ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(true); setOrderItems(prev => prev.map(i => ({ ...i, selected: false }))); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/25">
            <Plus size={14} /> New Return
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowComplaintForm(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-500/25">
            <Plus size={14} /> New Complaint
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 rounded-xl p-1 gap-1">
        <button onClick={() => setActiveTab('RETURNS')}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'RETURNS' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <RotateCcw size={13} /> Returns
          {myReturns.length > 0 && <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", activeTab === 'RETURNS' ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500")}>{myReturns.length}</span>}
        </button>
        <button onClick={() => setActiveTab('COMPLAINTS')}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'COMPLAINTS' ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <ShieldAlert size={13} /> Stock Complaints
          {myComplaints.filter(c => c.status === 'OPEN').length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">{myComplaints.filter(c => c.status === 'OPEN').length}</span>}
        </button>
      </div>

      {/* ══════════════ RETURNS TAB ══════════════ */}
      {activeTab === 'RETURNS' && (
        <>
          {/* New Return Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100/80 shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100/60 bg-gradient-to-r from-slate-50 to-blue-50/30">
                    <h3 className="text-sm font-bold text-slate-800">New Return Request</h3>
                    <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={16} className="text-slate-500" /></button>
                  </div>
                  <div className="p-4 space-y-4">
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
                          {(['EXPIRED', 'DAMAGED'] as ReturnReason[]).map(r => {
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
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items by name or invoice..."
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>
                    <div className="border border-slate-100/80 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      {visibleOrderItems.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400"><Package size={20} className="mx-auto mb-1 text-slate-300" />No delivered items found</div>
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
                                  <button type="button" onClick={() => updateItemField(realIdx, 'qty', Math.max(1, item.qty - 1))} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold hover:bg-slate-200">−</button>
                                  <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                                  <button type="button" onClick={() => updateItemField(realIdx, 'qty', Math.min(item.max_qty, item.qty + 1))} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold hover:bg-slate-200">+</button>
                                  <span className="text-[10px] text-slate-400 ml-1">/{item.max_qty}</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes (optional)..." rows={2}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none" />
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500">{selectedItems.length} items selected</span>
                        {selectedItems.length > 0 && <span className="text-sm font-bold text-slate-800 ml-2">₹{totalAmount.toFixed(0)}</span>}
                      </div>
                      <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting || selectedItems.length === 0}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit Return
                      </motion.button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter */}
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
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><RotateCcw size={24} className="text-slate-300" /></div>
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
        </>
      )}

      {/* ══════════════ STOCK COMPLAINTS TAB ══════════════ */}
      {activeTab === 'COMPLAINTS' && (
        <>
          {/* New Complaint Form */}
          <AnimatePresence>
            {showComplaintForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <form onSubmit={handleSubmitComplaint} className="bg-white rounded-2xl border border-rose-100/80 shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100/60 bg-gradient-to-r from-rose-50/50 to-orange-50/30">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">New Stock Complaint</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Report delivery discrepancies — short delivery, wrong or missing items</p>
                    </div>
                    <button type="button" onClick={() => setShowComplaintForm(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={16} className="text-slate-500" /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Supplier + Order */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Supplier</label>
                        <select value={complaintWholesaler} onChange={e => { setComplaintWholesaler(e.target.value); setComplaintOrderId(''); }}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none">
                          {agencies.map((a: any) => <option key={a.wholesaler_id} value={a.wholesaler_id}>{a.wholesaler?.name || 'Agency'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Order Invoice</label>
                        <select value={complaintOrderId} onChange={e => setComplaintOrderId(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none" required>
                          <option value="">— Select invoice —</option>
                          {complaintOrders.map((o: any) => (
                            <option key={o.id} value={o.id}>
                              #{o.invoice_no || o.id.slice(-6).toUpperCase()} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Complaint Type */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Complaint Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['SHORT_DELIVERY', 'WRONG_ITEM', 'MISSING_ITEM'] as ComplaintType[]).map(ct => {
                          const cfg = complaintTypeConfig[ct];
                          const Icon = cfg.icon;
                          return (
                            <button type="button" key={ct} onClick={() => setComplaintType(ct)}
                              className={cn("flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-[10px] font-semibold border transition-all",
                                complaintType === ct ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                              <Icon size={16} /> {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Items</label>
                        <button
                          type="button"
                          onClick={() => setComplaintItems(prev => [...prev, { order_item_key: '', medicine_name: '', ordered_qty: 0, received_qty: 0, unit_price: 0 }])}
                          disabled={!complaintOrderId || complaintOrderItems.length === 0}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 disabled:text-slate-300 disabled:cursor-not-allowed"
                        >
                          <Plus size={11} /> Add Item
                        </button>
                      </div>
                      <div className="space-y-2">
                        {complaintItems.map((ci, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/60 rounded-xl p-2.5">
                            <div className="col-span-5">
                              <select
                                value={ci.order_item_key}
                                onChange={e => {
                                  const selectedKey = e.target.value;
                                  const pickedItem = complaintOrderItems.find(item => item.key === selectedKey);
                                  setComplaintItems(prev => prev.map((x, i) => i === idx
                                    ? {
                                      ...x,
                                      order_item_key: selectedKey,
                                      medicine_name: pickedItem?.medicine_name || '',
                                      ordered_qty: pickedItem?.ordered_qty || 0,
                                      received_qty: pickedItem?.ordered_qty || 0,
                                      unit_price: pickedItem?.unit_price || 0,
                                    }
                                    : x));
                                }}
                                required
                                disabled={!complaintOrderId || complaintOrderItems.length === 0}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-rose-200 focus:border-rose-300 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                <option value="">{complaintOrderId ? 'Select medicine' : 'Select invoice first'}</option>
                                {complaintOrderItems
                                  .filter(item => !complaintItems.some((x, i) => i !== idx && x.order_item_key === item.key))
                                  .map(item => (
                                    <option key={item.key} value={item.key}>
                                      {item.medicine_name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <input type="number" min={0} value={ci.ordered_qty || ''} readOnly
                                placeholder="Ordered"
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-slate-100 text-slate-600" />
                            </div>
                            <div className="col-span-2">
                              <input type="number" min={0} value={ci.received_qty || ''} onChange={e => setComplaintItems(prev => prev.map((x, i) => i === idx ? { ...x, received_qty: +e.target.value } : x))}
                                placeholder="Received"
                                className={cn("w-full text-xs border rounded-lg px-2.5 py-2 focus:ring-1 outline-none bg-white",
                                  ci.received_qty < ci.ordered_qty && ci.ordered_qty > 0 ? "border-rose-300 focus:ring-rose-200 focus:border-rose-300 text-rose-700" : "border-slate-200 focus:ring-rose-200 focus:border-rose-300")} />
                            </div>
                            <div className="col-span-2">
                              <input type="number" min={0} step="0.01" value={ci.unit_price || ''} readOnly
                                placeholder="₹ Price"
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-slate-100 text-slate-600" />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              {complaintItems.length > 1 && (
                                <button type="button" onClick={() => setComplaintItems(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors">
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="grid grid-cols-12 gap-2 px-2.5">
                          <div className="col-span-5 text-[9px] text-slate-400 font-semibold">Medicine</div>
                          <div className="col-span-2 text-[9px] text-slate-400 font-semibold">Ordered</div>
                          <div className="col-span-2 text-[9px] text-slate-400 font-semibold">Received</div>
                          <div className="col-span-2 text-[9px] text-slate-400 font-semibold">Unit Price</div>
                        </div>
                      </div>
                    </div>

                    <textarea value={complaintNotes} onChange={e => setComplaintNotes(e.target.value)} placeholder="Describe the issue in detail (optional)..." rows={2}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-rose-100 focus:border-rose-300 outline-none resize-none" />

                    <div className="flex justify-end">
                      <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submittingComplaint || !complaintOrderId || complaintItems.every(i => !i.order_item_key)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/25">
                        {submittingComplaint ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit Complaint
                      </motion.button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complaint Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map(f => (
              <button key={f} onClick={() => setComplaintFilter(f)}
                className={cn("text-[10px] font-bold px-3.5 py-1.5 rounded-lg border whitespace-nowrap transition-all",
                  complaintFilter === f ? "bg-rose-600 border-rose-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
                {f === 'ALL' ? `All (${myComplaints.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${myComplaints.filter(c => c.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Complaint List */}
          <div className="space-y-2">
            {filteredComplaints.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 bg-white rounded-2xl border border-slate-100/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3"><ShieldAlert size={24} className="text-rose-300" /></div>
                <p className="text-sm font-semibold text-slate-600">No complaints raised</p>
                <p className="text-xs text-slate-400 mt-1">Report short deliveries, wrong items, or missing goods</p>
              </motion.div>
            ) : (
              filteredComplaints.map((cmp: any) => {
                const isExpanded = expandedComplaint === cmp.id;
                const cs = complaintStatusConfig[cmp.status] || complaintStatusConfig.OPEN;
                const ct = complaintTypeConfig[cmp.complaint_type as ComplaintType];
                const CmpIcon = cs.icon;
                const TypeIcon = ct?.icon;
                return (
                  <motion.div key={cmp.id} layout className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all">
                    <button onClick={() => setExpandedComplaint(isExpanded ? null : cmp.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cs.bg)}>
                        <CmpIcon size={16} className={cs.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">Complaint #{cmp.id.slice(-6).toUpperCase()}</p>
                          <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg", cs.bg, cs.color)}>{cs.label}</span>
                          {ct && <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-slate-100", ct.color)}>{ct.label}</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(cmp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {cmp.items?.length || 0} items · {cmp.wholesaler?.name || 'Supplier'}
                        </p>
                      </div>
                      {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-50">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Building2 size={12} />{cmp.wholesaler?.name}</span>
                              {TypeIcon && <span className={cn("flex items-center gap-1 font-semibold", ct?.color)}><TypeIcon size={12} /> {ct?.label}</span>}
                            </div>
                            {cmp.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{cmp.notes}</p>}
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-4 text-[9px] font-bold text-slate-400 uppercase px-1 pb-1 border-b border-slate-100">
                                <span className="col-span-2">Medicine</span><span className="text-center">Ordered</span><span className="text-center">Received</span>
                              </div>
                              {(cmp.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-4 items-center py-1.5 border-b border-slate-50 last:border-0">
                                  <p className="col-span-2 text-xs font-medium text-slate-700 truncate">{item.medicine_name}</p>
                                  <p className="text-xs text-center text-slate-600">{item.ordered_qty}</p>
                                  <p className={cn("text-xs text-center font-semibold", item.received_qty < item.ordered_qty ? "text-rose-600" : "text-emerald-600")}>{item.received_qty}</p>
                                </div>
                              ))}
                            </div>
                            {cmp.resolution_note && (
                              <div className="bg-emerald-50 rounded-lg p-2 text-xs text-emerald-700">
                                <span className="font-semibold">Resolution:</span> {cmp.resolution_note}
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
        </>
      )}
    </div>
  );
};
