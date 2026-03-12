import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import {
    RotateCcw, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
    Loader2, AlertTriangle, Calendar, Package, Store, Filter, User, AlertCircle,
    ShieldAlert, PackageX, Minus
} from 'lucide-react';
import { ReturnRequest, ReturnReason, ReturnStatus, StockComplaint, ComplaintType, ComplaintStatus } from '../types';

export const WholesalerReturnsPage = () => {
    const { returns, fetchReturns, updateReturnStatus, stockComplaints, fetchStockComplaints, updateComplaintStatus } = useDataStore();

    const [filter, setFilter] = useState<ReturnStatus | 'ALL'>('ALL');
    const [expandedReturns, setExpandedReturns] = useState<Record<string, boolean>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionNote, setRejectionNote] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    useEffect(() => { fetchReturns(); fetchStockComplaints(); }, []);

    const [activeTab, setActiveTab] = useState<'RETURNS' | 'COMPLAINTS'>('RETURNS');
    const [complaintFilter, setComplaintFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
    const [expandedComplaints, setExpandedComplaints] = useState<Record<string, boolean>>({});
    const [processingComplaintId, setProcessingComplaintId] = useState<string | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [showResolveModal, setShowResolveModal] = useState<string | null>(null);

    const filteredReturns = filter === 'ALL' ? returns : returns.filter(r => r.status === filter);

    const pendingCount = returns.filter(r => r.status === 'PENDING').length;

    const toggleExpand = (id: string) => setExpandedReturns(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleExpandComplaint = (id: string) => setExpandedComplaints(prev => ({ ...prev, [id]: !prev[id] }));

    const filteredComplaints = complaintFilter === 'ALL' ? stockComplaints : stockComplaints.filter(c => c.status === complaintFilter);
    const openCount = stockComplaints.filter(c => c.status === 'OPEN').length;

    const handleAcknowledge = async (complaintId: string) => {
        setProcessingComplaintId(complaintId);
        try {
            await updateComplaintStatus(complaintId, 'ACKNOWLEDGED');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to acknowledge');
        } finally {
            setProcessingComplaintId(null);
        }
    };

    const handleResolveConfirm = async () => {
        if (!showResolveModal) return;
        setProcessingComplaintId(showResolveModal);
        try {
            await updateComplaintStatus(showResolveModal, 'RESOLVED', resolutionNote || undefined);
            setShowResolveModal(null);
            setResolutionNote('');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to resolve');
        } finally {
            setProcessingComplaintId(null);
        }
    };

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

    const ReasonBadge = ({ reason }: { reason: ReturnReason }) => {
        const colors: Record<string, string> = {
            EXPIRED: 'bg-orange-50 text-orange-600 border-orange-200',
            DAMAGED: 'bg-red-50 text-red-600 border-red-200',
            MISSING: 'bg-indigo-50 text-indigo-600 border-indigo-200'
        };
        const icons: Record<string, any> = {
            EXPIRED: <Calendar size={11} />,
            DAMAGED: <AlertTriangle size={11} />,
            MISSING: <AlertCircle size={11} />
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${colors[reason] || colors.DAMAGED}`}>
                {icons[reason] || icons.DAMAGED}
                {reason}
            </span>
        );
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                    <RotateCcw size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Returns & Complaints</h1>
                    <p className="text-xs text-slate-400 font-medium">
                        {pendingCount > 0
                            ? <span className="text-amber-600">{pendingCount} return{pendingCount > 1 ? 's' : ''} pending</span>
                            : openCount > 0
                            ? <span className="text-rose-600">{openCount} complaint{openCount > 1 ? 's' : ''} open</span>
                            : 'Manage returns and stock complaints from retailers'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('RETURNS')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${activeTab === 'RETURNS' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <RotateCcw size={15} /> Returns
                    {pendingCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">{pendingCount}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('COMPLAINTS')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${activeTab === 'COMPLAINTS' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <ShieldAlert size={15} /> Stock Complaints
                    {openCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">{openCount}</span>
                    )}
                </button>
            </div>

            {/* ─── RETURNS TAB ─── */}
            {activeTab === 'RETURNS' && (<>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 w-fit">
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
            </>)}

            {/* ─── COMPLAINTS TAB ─── */}
            {activeTab === 'COMPLAINTS' && (<>
                <div className="flex flex-wrap items-center gap-2">
                    {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setComplaintFilter(s as ComplaintStatus | 'ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${complaintFilter === s ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'}`}
                        >
                            {s === 'ALL' ? `All (${stockComplaints.length})` : `${s} (${stockComplaints.filter(c => c.status === s).length})`}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-rose-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open</span>
                        </div>
                        <p className="text-2xl font-black text-rose-600">{stockComplaints.filter(c => c.status === 'OPEN').length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acknowledged</span>
                        </div>
                        <p className="text-2xl font-black text-amber-600">{stockComplaints.filter(c => c.status === 'ACKNOWLEDGED').length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">{stockComplaints.filter(c => c.status === 'RESOLVED').length}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredComplaints.map(complaint => {
                        const isExpanded = expandedComplaints[complaint.id];
                        const complaintTypeCfg: Record<ComplaintType, { label: string; icon: any; color: string; bg: string }> = {
                            SHORT_DELIVERY: { label: 'Short Delivery', icon: Minus, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                            WRONG_ITEM: { label: 'Wrong Item', icon: PackageX, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                            MISSING_ITEM: { label: 'Missing Item', icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
                        };
                        const complaintStatusCfg: Record<ComplaintStatus, { color: string; bg: string }> = {
                            OPEN: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                            ACKNOWLEDGED: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                            RESOLVED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                        };
                        const typeCfg = complaintTypeCfg[complaint.complaint_type];
                        const statusCfg = complaintStatusCfg[complaint.status];
                        const TypeIcon = typeCfg.icon;
                        return (
                            <div key={complaint.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="font-bold text-slate-900">Complaint #{complaint.id.slice(-6).toUpperCase()}</span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${typeCfg.bg} ${typeCfg.color}`}>
                                                <TypeIcon size={12} /> {typeCfg.label}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${statusCfg.bg} ${statusCfg.color}`}>
                                                {complaint.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                                                <User size={11} /> {complaint.retailer?.shop_name || complaint.retailer?.name || 'Retailer'}
                                            </span>
                                            {complaint.order_id && (
                                                <span className="text-slate-400">Order: …{complaint.order_id.slice(-8).toUpperCase()}</span>
                                            )}
                                            <span className="text-slate-400">{new Date(complaint.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {complaint.items && complaint.items.length > 0 && (
                                    <div className="mt-3 border-t border-slate-50 pt-3">
                                        <button
                                            onClick={() => toggleExpandComplaint(complaint.id)}
                                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                                        >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {complaint.items.length} item{complaint.items.length > 1 ? 's' : ''} reported
                                        </button>
                                        {isExpanded && (
                                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="text-left p-2.5 font-bold text-slate-500">Medicine</th>
                                                            <th className="text-center p-2.5 font-bold text-slate-500">Ordered</th>
                                                            <th className="text-center p-2.5 font-bold text-slate-500">Received</th>
                                                            <th className="text-center p-2.5 font-bold text-slate-500">Diff</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {complaint.items.map(item => (
                                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                                <td className="p-2.5 text-slate-700 font-medium">{item.medicine_name}</td>
                                                                <td className="p-2.5 text-center text-slate-600">{item.ordered_qty}</td>
                                                                <td className={`p-2.5 text-center font-bold ${item.received_qty < item.ordered_qty ? 'text-rose-600' : 'text-emerald-600'}`}>{item.received_qty}</td>
                                                                <td className={`p-2.5 text-center font-bold ${item.received_qty < item.ordered_qty ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    {item.received_qty - item.ordered_qty}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {complaint.notes && (
                                    <p className="text-xs text-slate-500 italic mt-3 bg-slate-50 px-3 py-2 rounded-lg">💬 {complaint.notes}</p>
                                )}
                                {complaint.resolution_note && complaint.status === 'RESOLVED' && (
                                    <p className="text-xs text-emerald-700 font-medium mt-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">✅ Resolution: {complaint.resolution_note}</p>
                                )}

                                {complaint.status !== 'RESOLVED' && (
                                    <div className="pt-3 mt-3 border-t border-slate-100 flex gap-2">
                                        {complaint.status === 'OPEN' && (
                                            <button
                                                onClick={() => handleAcknowledge(complaint.id)}
                                                disabled={processingComplaintId === complaint.id}
                                                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl border border-amber-200 transition-all disabled:opacity-50"
                                            >
                                                {processingComplaintId === complaint.id ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                                                Acknowledge
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setShowResolveModal(complaint.id); setResolutionNote(''); }}
                                            disabled={processingComplaintId === complaint.id}
                                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle size={13} /> Mark Resolved
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredComplaints.length === 0 && (
                        <div className="p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <ShieldAlert size={40} className="mx-auto mb-3 text-slate-200" />
                            <p className="font-bold text-slate-500">No stock complaints</p>
                            <p className="text-sm mt-1">Complaints from retailers will appear here.</p>
                        </div>
                    )}
                </div>
            </>)}

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

            {/* Resolve Complaint Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <CheckCircle size={20} className="text-emerald-500" /> Resolve Complaint
                        </h3>
                        <p className="text-sm text-slate-500">Add an optional note to inform the retailer how it was resolved.</p>
                        <textarea
                            value={resolutionNote}
                            onChange={e => setResolutionNote(e.target.value)}
                            placeholder="e.g. Replacement dispatched, credit note issued..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-300 resize-none h-24"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowResolveModal(null)}
                                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResolveConfirm}
                                disabled={processingComplaintId !== null}
                                className="flex items-center gap-2 bg-emerald-500 text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                                {processingComplaintId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Mark as Resolved
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
