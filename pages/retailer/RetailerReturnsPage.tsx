import React, { useEffect, useState, useMemo } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import {
    RotateCcw, Plus, Send, Clock, CheckCircle, XCircle,
    ChevronDown, ChevronUp, Loader2, AlertTriangle, Package,
    Calendar, Store, Search, Check, RefreshCcw
} from 'lucide-react';
import { ReturnReason, OrderItem } from '../../types';
import api from '../../utils/api';

// Item selected for return (from an existing delivered order)
interface SelectedReturnItem {
    order_id: string;
    order_invoice: string;
    medicine_id: string;
    medicine_name: string;
    max_qty: number;       // qty originally ordered
    qty: number;           // qty to return
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
    const [expandedReturns, setExpandedReturns] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    const [itemSearch, setItemSearch] = useState('');

    // Agencies
    const [agencies, setAgencies] = useState<any[]>([]);
    const [selectedWholesaler, setSelectedWholesaler] = useState('');

    // Items from delivered orders for the selected wholesaler
    const [orderItems, setOrderItems] = useState<SelectedReturnItem[]>([]);

    useEffect(() => {
        fetchReturns();
        fetchOrders();
        api.get('/retailer/agencies').then(res => {
            const active = res.data.filter((a: any) => a.status === 'ACTIVE');
            setAgencies(active);
            if (active.length > 0) setSelectedWholesaler(active[0].wholesaler_id);
        }).catch(() => { });
    }, []);

    // When wholesaler changes, build selectable items from delivered orders
    useEffect(() => {
        if (!selectedWholesaler || !retailer) return;

        const deliveredOrders = orders.filter(
            o => o.wholesaler_id === selectedWholesaler &&
                o.retailer_id === retailer.id &&
                o.status === 'DELIVERED'
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

    // Filter items by search
    const visibleOrderItems = useMemo(() => {
        if (!itemSearch.trim()) return orderItems;
        const q = itemSearch.toLowerCase();
        return orderItems.filter(i => i.medicine_name.toLowerCase().includes(q) || i.order_invoice.toLowerCase().includes(q));
    }, [orderItems, itemSearch]);

    const selectedItems = orderItems.filter(i => i.selected);
    const totalAmount = selectedItems.reduce((sum, i) => sum + (i.qty * i.unit_price), 0);

    const toggleItem = (idx: number) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === idx ? { ...item, selected: !item.selected } : item
        ));
    };

    const updateItemField = (idx: number, field: string, value: any) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === idx ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWholesaler) return alert('Please select a supplier');
        if (selectedItems.length === 0) return alert('Please select at least one item to return');
        if (selectedItems.some(i => i.qty <= 0 || i.qty > i.max_qty)) {
            return alert('Return qty must be between 1 and the ordered qty');
        }
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

    const toggleExpand = (id: string) => setExpandedReturns(prev => ({ ...prev, [id]: !prev[id] }));

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg: Record<string, { icon: any; color: string; bg: string }> = {
            PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200/50' },
            APPROVED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200/50' },
            REJECTED: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200/50' },
        };
        const c = cfg[status] || cfg.PENDING;
        const Icon = c.icon;
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest shadow-sm ${c.bg} ${c.color}`}>
                <Icon size={14} strokeWidth={2.5} /> {status}
            </div>
        );
    };

    const ReasonBadge = ({ reason }: { reason: ReturnReason }) => (
        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${reason === 'EXPIRED' ? 'bg-orange-50 text-orange-600 border border-orange-200/50' : 'bg-rose-50 text-rose-600 border border-rose-200/50'}`}>
            {reason === 'EXPIRED' ? <Calendar size={12} strokeWidth={2.5} /> : <AlertTriangle size={12} strokeWidth={2.5} />}
            {reason}
        </span>
    );

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm border border-orange-100 shrink-0">
                        <RotateCcw size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">Returns Manager</h1>
                        <p className="text-slate-500 font-medium text-sm">Process expired or damaged products</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Search size={14} className="text-slate-400" />
                        </div>
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value as any)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer pr-2 focus:ring-0 appearance-none min-w-[120px]"
                        >
                            <option value="ALL">All Returns ({myReturns.length})</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        <ChevronDown size={14} className="text-slate-400 pointer-events-none -ml-2" />
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-sm px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        {showForm ? <XCircle size={18} /> : <Plus size={18} strokeWidth={2.5} />}
                        {showForm ? 'Cancel Request' : 'New Return'}
                    </button>
                </div>
            </div>

            {/* New Return Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <RotateCcw size={18} className="text-orange-500" /> New Return Request
                    </h2>

                    {/* Supplier & Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Supplier</label>
                            <select
                                value={selectedWholesaler}
                                onChange={e => setSelectedWholesaler(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            >
                                {agencies.map((a: any) => (
                                    <option key={a.wholesaler_id} value={a.wholesaler_id}>{a.wholesaler?.name || a.wholesaler_id}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Return Reason</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReason('EXPIRED')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${reason === 'EXPIRED'
                                        ? 'border-orange-400 bg-orange-50 text-orange-600'
                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <Calendar size={16} /> Expired
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReason('DAMAGED')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${reason === 'DAMAGED'
                                        ? 'border-rose-400 bg-rose-50 text-rose-600'
                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <AlertTriangle size={16} /> Damaged
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Select Items from Orders */}
                    <div className="relative z-10 pt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-[13px] font-black text-slate-800 uppercase tracking-wider mb-1">
                                    <Package size={16} className="text-emerald-500" /> Select Items
                                </label>
                                <p className="text-xs text-slate-500 font-medium">
                                    Choose items from delivered orders with this supplier.
                                </p>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-auto min-w-[280px]">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search medicine or invoice..."
                                    value={itemSearch}
                                    onChange={e => setItemSearch(e.target.value)}
                                    className="w-full bg-slate-50 pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-3xl border border-slate-100/80 p-2 sm:p-4">
                            {visibleOrderItems.length === 0 ? (
                                <div className="py-12 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                                        <Package size={28} className="text-slate-300" strokeWidth={1.5} />
                                    </div>
                                    <p className="text-[15px] font-black text-slate-700">No eligible items found</p>
                                    <p className="text-sm text-slate-400 mt-1 max-w-sm">Items can only be returned from past orders that have been successfully delivered.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                    {visibleOrderItems.map((item, idx) => {
                                        const globalIdx = orderItems.indexOf(item);
                                        return (
                                            <div
                                                key={`${item.order_id}-${item.medicine_id}-${idx}`}
                                                className={`p-5 rounded-[20px] border-2 transition-all cursor-pointer group ${item.selected
                                                    ? 'border-emerald-400 bg-white shadow-md shadow-emerald-500/5'
                                                    : 'border-transparent bg-white shadow-sm hover:border-slate-200 hover:shadow-md'
                                                    }`}
                                                onClick={() => toggleItem(globalIdx)}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Checkbox */}
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${item.selected
                                                        ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30'
                                                        : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'
                                                        }`}>
                                                        {item.selected && <Check size={14} className="text-white" strokeWidth={4} />}
                                                    </div>

                                                    {/* Item details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 sm:gap-4 mb-1">
                                                            <div className="space-y-1">
                                                                <p className={`font-black text-[15px] transition-colors leading-tight ${item.selected ? 'text-emerald-800' : 'text-slate-800'}`}>{item.medicine_name}</p>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Inv #{item.order_invoice}</span>
                                                                    <span className="text-[11px] font-bold text-slate-400">Max Qty: {item.max_qty}</span>
                                                                    <span className="text-[11px] font-bold text-slate-400">₹{item.unit_price}/unit</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 hidden sm:block">Item Value</p>
                                                                <span className={`text-xl font-black ${item.selected ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                    ₹{(item.qty * item.unit_price).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Editable fields when selected */}
                                                        {item.selected && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100/80 grid grid-cols-1 sm:grid-cols-3 gap-4" onClick={e => e.stopPropagation()}>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Return Qty</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={item.max_qty}
                                                                        value={item.qty}
                                                                        onChange={e => updateItemField(globalIdx, 'qty', Math.min(item.max_qty, Math.max(1, parseInt(e.target.value) || 1)))}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Batch No.</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Optional"
                                                                        value={item.batch_no}
                                                                        onChange={e => updateItemField(globalIdx, 'batch_no', e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                                                                        {reason === 'EXPIRED' ? 'Expiry Date' : 'Damage Detail'}
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={reason === 'EXPIRED' ? 'e.g. 12/2025' : 'e.g. broken seal'}
                                                                        value={reason === 'EXPIRED' ? item.expiry_date : item.reason_detail}
                                                                        onChange={e => updateItemField(globalIdx, reason === 'EXPIRED' ? 'expiry_date' : 'reason_detail', e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedItems.length > 0 && (
                            <div className="flex items-center gap-2 mt-4 ml-2">
                                <div className="p-1 bg-emerald-100 rounded-md text-emerald-600">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                                <p className="text-sm font-bold text-emerald-700">
                                    {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} prepared for return
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Notes & Actions */}
                    <div className="relative z-10 pt-6 mt-6 border-t border-slate-100 flex flex-col md:flex-row gap-8 items-start md:items-end">
                        <div className="w-full md:flex-1">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">Additional Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any extra details we should know?..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-colors resize-none h-[104px]"
                            />
                        </div>

                        <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-200/60 shadow-inner w-full md:w-[320px] shrink-0">
                            <div className="mb-4">
                                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1">Estimated Return Value</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">₹{totalAmount.toFixed(2)}</p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || selectedItems.length === 0}
                                className="w-full group flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-[15px] px-6 py-4 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:hover:shadow-lg disabled:cursor-not-allowed active:scale-95"
                            >
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" strokeWidth={2.5} />}
                                Submit Request
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Return History */}
            <div className={`space-y-6 ${showForm ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''} transition-all duration-500`}>
                <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
                    <RefreshCcw size={20} className="text-slate-400" /> History
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredReturns.map(ret => {
                        const isExpanded = expandedReturns[ret.id];
                        const visibleItems = isExpanded ? ret.items : ret.items.slice(0, 2);

                        return (
                            <div key={ret.id} className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-extrabold text-slate-800 text-xl tracking-tight">#{ret.id.slice(-6).toUpperCase()}</span>
                                            <ReasonBadge reason={ret.reason} />
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                            {new Date(ret.created_at).toLocaleDateString()} at {new Date(ret.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100 mt-1 shadow-sm">
                                            <Store size={12} /> {ret.wholesaler?.name || 'Supplier'}
                                        </div>
                                    </div>
                                    <StatusBadge status={ret.status} />
                                </div>

                                {/* Items */}
                                <div className="space-y-3 mb-6 border-t border-slate-100 pt-6 flex-1">
                                    {visibleItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-start text-sm group/item">
                                            <div className="space-y-0.5">
                                                <span className="flex items-center gap-2 text-slate-700 font-bold group-hover/item:text-orange-600 transition-colors">
                                                    <span className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded font-black">{item.qty}x</span>
                                                    {item.medicine_name}
                                                </span>
                                                {item.batch_no && <span className="block text-slate-400 text-[10px] font-black uppercase tracking-widest pl-8">Batch: {item.batch_no}</span>}
                                            </div>
                                            <span className="font-black text-slate-800">₹{item.total_price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {ret.items.length > 2 && (
                                        <button
                                            onClick={() => toggleExpand(ret.id)}
                                            className="w-full flex justify-center items-center gap-2 text-[11px] font-black uppercase tracking-widest text-orange-600 bg-orange-50/50 hover:bg-orange-50 mt-4 py-2.5 rounded-xl border border-orange-100/50 transition-colors"
                                        >
                                            {isExpanded ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> + {ret.items.length - 2} more items</>}
                                        </button>
                                    )}
                                </div>

                                {/* Notes & Rejection */}
                                {ret.notes && (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attached Note</p>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{ret.notes}</p>
                                    </div>
                                )}
                                {ret.rejection_note && ret.status === 'REJECTED' && (
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mb-5 flex items-start gap-2">
                                        <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                                        <div>
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Rejection Reason</p>
                                            <p className="text-xs text-rose-700 font-bold">{ret.rejection_note}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="pt-6 border-t border-slate-100 flex justify-between items-end mt-auto">
                                    <span className="text-xs font-bold text-slate-400">Total Items: {ret.items.reduce((s, i) => s + i.qty, 0)}</span>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Credit</p>
                                        <p className="text-2xl font-black text-slate-900 leading-none tracking-tight">₹{ret.total_amount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredReturns.length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-slate-200/60 border-dashed shadow-sm max-w-2xl mx-auto relative overflow-hidden">
                        <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <RotateCcw size={40} className="text-slate-300" strokeWidth={1.5} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 mb-2">No returns history</p>
                        <p className="text-slate-500 font-medium max-w-sm">When you submit requests for expired or damaged items, they will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
