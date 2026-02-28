import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import {
    RotateCcw, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
    Loader2, AlertTriangle, Calendar, Package, Store, Filter, User
} from 'lucide-react';
import { ReturnRequest, ReturnReason, ReturnStatus } from '../types';

export const WholesalerReturnsPage = () => {
    const { returns, fetchReturns, updateReturnStatus } = useDataStore();

    const [filter, setFilter] = useState<ReturnStatus | 'ALL'>('ALL');
    const [expandedReturns, setExpandedReturns] = useState<Record<string, boolean>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionNote, setRejectionNote] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    useEffect(() => { fetchReturns(); }, []);

    const filteredReturns = filter === 'ALL' ? returns : returns.filter(r => r.status === filter);

    const pendingCount = returns.filter(r => r.status === 'PENDING').length;

    const toggleExpand = (id: string) => setExpandedReturns(prev => ({ ...prev, [id]: !prev[id] }));

    const handleApprove = async (returnId: string) => {
        if (!window.confirm('Approve this return? The retailer\'s balance will be credited.')) return;
        setProcessingId(returnId);
        try {
            await updateReturnStatus(returnId, 'APPROVED');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to approve');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!showRejectModal) return;
        setProcessingId(showRejectModal);
        try {
            await updateReturnStatus(showRejectModal, 'REJECTED', rejectionNote || undefined);
            setShowRejectModal(null);
            setRejectionNote('');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to reject');
        } finally {
            setProcessingId(null);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg: Record<string, { icon: any; color: string; bg: string }> = {
            PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            APPROVED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            REJECTED: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
        };
        const c = cfg[status] || cfg.PENDING;
        const Icon = c.icon;
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase ${c.bg} ${c.color}`}>
                <Icon size={14} /> {status}
            </div>
        );
    };

    const ReasonBadge = ({ reason }: { reason: ReturnReason }) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${reason === 'EXPIRED' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
            {reason === 'EXPIRED' ? <Calendar size={11} /> : <AlertTriangle size={11} />}
            {reason}
        </span>
    );

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                        <RotateCcw size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Return Requests</h1>
                        <p className="text-xs text-slate-400 font-medium">
                            {pendingCount > 0
                                ? <span className="text-amber-600">{pendingCount} pending for review</span>
                                : 'Manage product returns from retailers'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as ReturnStatus | 'ALL')}
                        className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer"
                    >
                        <option value="ALL">All Returns ({returns.length})</option>
                        <option value="PENDING">Pending ({returns.filter(r => r.status === 'PENDING').length})</option>
                        <option value="APPROVED">Approved ({returns.filter(r => r.status === 'APPROVED').length})</option>
                        <option value="REJECTED">Rejected ({returns.filter(r => r.status === 'REJECTED').length})</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{returns.filter(r => r.status === 'PENDING').length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{returns.filter(r => r.status === 'APPROVED').length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle size={16} className="text-rose-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
                    </div>
                    <p className="text-2xl font-black text-rose-600">{returns.filter(r => r.status === 'REJECTED').length}</p>
                </div>
            </div>

            {/* Return List */}
            <div className="space-y-4">
                {filteredReturns.map(ret => {
                    const isExpanded = expandedReturns[ret.id];
                    const visibleItems = isExpanded ? ret.items : ret.items.slice(0, 2);

                    return (
                        <div key={ret.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-bold text-slate-900 text-lg">Return #{ret.id.slice(-6).toUpperCase()}</span>
                                        <ReasonBadge reason={ret.reason} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">
                                            <User size={12} /> {ret.retailer?.shop_name || ret.retailer?.name || 'Retailer'}
                                        </div>
                                        {ret.retailer?.phone && (
                                            <span className="text-[11px] text-slate-400">{ret.retailer.phone}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        {new Date(ret.created_at).toLocaleDateString()} at {new Date(ret.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                                <StatusBadge status={ret.status} />
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-4 border-t border-slate-50 pt-4">
                                {visibleItems.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <div>
                                            <span className="text-slate-600 font-medium">{item.qty} x {item.medicine_name}</span>
                                            {item.batch_no && <span className="text-slate-400 text-xs ml-2">(Batch: {item.batch_no})</span>}
                                            {item.expiry_date && <span className="text-orange-400 text-xs ml-1">Exp: {item.expiry_date}</span>}
                                            {item.reason_detail && <span className="text-rose-400 text-xs ml-1">— {item.reason_detail}</span>}
                                        </div>
                                        <span className="font-bold text-slate-800">₹{item.total_price.toFixed(2)}</span>
                                    </div>
                                ))}
                                {ret.items.length > 2 && (
                                    <button
                                        onClick={() => toggleExpand(ret.id)}
                                        className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mt-2 py-1 transition-colors"
                                    >
                                        {isExpanded ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> + {ret.items.length - 2} more items</>}
                                    </button>
                                )}
                            </div>

                            {/* Notes */}
                            {ret.notes && (
                                <p className="text-xs text-slate-500 italic mb-3 bg-slate-50 px-3 py-2 rounded-lg">💬 {ret.notes}</p>
                            )}
                            {ret.rejection_note && ret.status === 'REJECTED' && (
                                <p className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-2 rounded-lg mb-3">❌ Rejection: {ret.rejection_note}</p>
                            )}

                            {/* Footer */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                                <div>
                                    {ret.status === 'PENDING' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(ret.id)}
                                                disabled={processingId === ret.id}
                                                className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200 transition-all disabled:opacity-50"
                                            >
                                                {processingId === ret.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                                            </button>
                                            <button
                                                onClick={() => { setShowRejectModal(ret.id); setRejectionNote(''); }}
                                                disabled={processingId === ret.id}
                                                className="flex items-center gap-1.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl border border-rose-200 transition-all disabled:opacity-50"
                                            >
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Return Amount</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">₹{ret.total_amount.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredReturns.length === 0 && (
                    <div className="p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                        <Package size={40} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-bold text-slate-500">No return requests</p>
                        <p className="text-sm mt-1">Return requests from retailers will appear here.</p>
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <XCircle size={20} className="text-rose-500" /> Reject Return
                        </h3>
                        <p className="text-sm text-slate-500">Provide a reason for rejecting this return (optional).</p>
                        <textarea
                            value={rejectionNote}
                            onChange={e => setRejectionNote(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 resize-none h-24"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(null)}
                                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId !== null}
                                className="flex items-center gap-2 bg-rose-500 text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                                {processingId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Reject Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
