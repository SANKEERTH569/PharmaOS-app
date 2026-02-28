import React, { useEffect, useState } from 'react';
import {
    Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Copy, Check,
    Percent, IndianRupee, Clock, Users, Tag, Shield, X,
} from 'lucide-react';
import api from '../../utils/api';

interface Coupon {
    id: string; code: string; discount_type: string; discount_value: number;
    max_uses: number; used_count: number; is_active: boolean;
    valid_plans: string | null; expires_at: string | null; created_at: string;
}

interface PlanRequest {
    id: string; wholesaler_id: string; current_plan: string; requested_plan: string;
    status: string; coupon_code: string | null; discount_amount: number; final_amount: number;
    admin_note: string | null; created_at: string; updated_at: string;
    wholesaler: { id: string; name: string; phone: string; plan: string };
}

export const CouponManagement = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [requests, setRequests] = useState<PlanRequest[]>([]);
    const [tab, setTab] = useState<'REQUESTS' | 'COUPONS'>('REQUESTS');
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [copied, setCopied] = useState('');
    const [actionLoading, setActionLoading] = useState('');
    const [noteModal, setNoteModal] = useState<{ id: string; action: string } | null>(null);
    const [adminNote, setAdminNote] = useState('');

    const [form, setForm] = useState({
        code: '', discount_type: 'PERCENTAGE', discount_value: '',
        max_uses: '', valid_plans: '', expires_at: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, rRes] = await Promise.all([api.get('/admin/coupons'), api.get('/admin/plan-requests')]);
            setCoupons(cRes.data);
            setRequests(rRes.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
        try {
            await api.post('/admin/coupons', {
                code: form.code.toUpperCase(),
                discount_type: form.discount_type,
                discount_value: parseFloat(form.discount_value),
                max_uses: form.max_uses ? parseInt(form.max_uses) : 0,
                valid_plans: form.valid_plans || null,
                expires_at: form.expires_at || null,
            });
            setShowCreate(false);
            setForm({ code: '', discount_type: 'PERCENTAGE', discount_value: '', max_uses: '', valid_plans: '', expires_at: '' });
            fetchData();
        } catch { }
    };

    const toggleCoupon = async (id: string, active: boolean) => {
        try { await api.patch(`/admin/coupons/${id}`, { is_active: !active }); fetchData(); } catch { }
    };

    const deleteCoupon = async (id: string) => {
        try { await api.delete(`/admin/coupons/${id}`); fetchData(); } catch { }
    };

    const handleRequestAction = async (id: string, action: string) => {
        setActionLoading(id);
        try {
            await api.patch(`/admin/plan-requests/${id}`, { action, admin_note: adminNote || null });
            setNoteModal(null);
            setAdminNote('');
            fetchData();
        } catch { }
        setActionLoading('');
    };

    const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 2000); };
    const planPrices: Record<string, number> = { starter: 0, growth: 999, pro: 2499, enterprise: 4999 };
    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 size={28} className="animate-spin text-rose-400" />
        </div>
    );

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Plans & Coupons</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Manage plan requests and discount coupons</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-1">
                <button onClick={() => setTab('REQUESTS')}
                    className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all ${tab === 'REQUESTS' ? 'bg-white text-rose-600 border border-b-0 border-slate-200 -mb-[1px]' : 'text-slate-400 hover:text-slate-600'}`}>
                    Plan Requests {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px]">{pendingCount}</span>}
                </button>
                <button onClick={() => setTab('COUPONS')}
                    className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all ${tab === 'COUPONS' ? 'bg-white text-rose-600 border border-b-0 border-slate-200 -mb-[1px]' : 'text-slate-400 hover:text-slate-600'}`}>
                    Coupons ({coupons.length})
                </button>
            </div>

            {/* PLAN REQUESTS TAB */}
            {tab === 'REQUESTS' && (
                <div className="space-y-3">
                    {requests.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                            <Shield size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">No plan requests yet</p>
                        </div>
                    ) : requests.map(r => (
                        <div key={r.id} className={`bg-white rounded-xl border p-4 transition-all ${r.status === 'PENDING' ? 'border-amber-200 shadow-sm' : 'border-slate-100'}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm text-slate-800">{r.wholesaler.name}</span>
                                        <span className="text-[10px] text-slate-400">{r.wholesaler.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-500 capitalize">{r.current_plan}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="px-2 py-0.5 bg-blue-50 rounded-full font-bold text-blue-600 capitalize">{r.requested_plan}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                                        <span>₹{planPrices[r.requested_plan]}/mo</span>
                                        {r.coupon_code && (
                                            <span className="flex items-center gap-1 text-emerald-600">
                                                <Tag size={10} /> {r.coupon_code} (−₹{r.discount_amount})
                                            </span>
                                        )}
                                        <span className="font-bold text-slate-700">Final: ₹{r.final_amount}/mo</span>
                                        <span className="text-slate-300">|</span>
                                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {r.admin_note && <p className="text-xs text-slate-500 mt-1.5 italic">Note: {r.admin_note}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {r.status === 'PENDING' ? (
                                        <>
                                            <button
                                                disabled={actionLoading === r.id}
                                                onClick={() => { setNoteModal({ id: r.id, action: 'APPROVED' }); setAdminNote(''); }}
                                                className="px-3 py-1.5 bg-emerald-500 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
                                            >
                                                {actionLoading === r.id ? <Loader2 size={12} className="animate-spin" /> : '✓ Approve'}
                                            </button>
                                            <button
                                                disabled={actionLoading === r.id}
                                                onClick={() => { setNoteModal({ id: r.id, action: 'REJECTED' }); setAdminNote(''); }}
                                                className="px-3 py-1.5 bg-red-500 text-white text-[11px] font-bold rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                                            >
                                                ✗ Reject
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                            {r.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note modal */}
            {noteModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">
                            {noteModal.action === 'APPROVED' ? '✓ Approve' : '✗ Reject'} Plan Request
                        </h3>
                        <textarea
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="Add a note (optional)..."
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setNoteModal(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl">
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRequestAction(noteModal.id, noteModal.action)}
                                disabled={actionLoading === noteModal.id}
                                className={`flex-1 py-2 text-xs font-bold text-white rounded-xl ${noteModal.action === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'
                                    }`}
                            >
                                {actionLoading === noteModal.id ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COUPONS TAB */}
            {tab === 'COUPONS' && (
                <div className="space-y-4">
                    <button onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/20 transition-all">
                        <Plus size={14} /> Create Coupon
                    </button>

                    {showCreate && (
                        <div className="bg-white rounded-xl border border-rose-100 p-5 shadow-sm space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Code</label>
                                    <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                        placeholder="PHARMA20" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                                    <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium mt-1 focus:ring-2 focus:ring-rose-500 outline-none">
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FLAT">Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount Value</label>
                                    <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })}
                                        placeholder={form.discount_type === 'PERCENTAGE' ? '20' : '500'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Uses (0=∞)</label>
                                    <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                                        placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Plans (comma-sep)</label>
                                    <input value={form.valid_plans} onChange={e => setForm({ ...form, valid_plans: e.target.value })}
                                        placeholder="growth,pro" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expires At</label>
                                    <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Cancel</button>
                                <button onClick={handleCreate} disabled={!form.code || !form.discount_value}
                                    className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-all disabled:opacity-50">
                                    Create Coupon
                                </button>
                            </div>
                        </div>
                    )}

                    {coupons.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                            <Ticket size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">No coupons created yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {coupons.map(c => (
                                <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between transition-all ${c.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
                                            <Ticket size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-sm text-slate-800 tracking-wider">{c.code}</span>
                                                <button onClick={() => copyCode(c.code)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                                    {copied === c.code ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                <span className="flex items-center gap-0.5">
                                                    {c.discount_type === 'PERCENTAGE' ? <Percent size={10} /> : <IndianRupee size={10} />}
                                                    {c.discount_value}{c.discount_type === 'PERCENTAGE' ? '% off' : ' off'}
                                                </span>
                                                {c.valid_plans && <span className="text-blue-400">• {c.valid_plans}</span>}
                                                <span className="flex items-center gap-0.5"><Users size={10} /> {c.used_count}/{c.max_uses || '∞'}</span>
                                                {c.expires_at && <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(c.expires_at).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleCoupon(c.id, c.is_active)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                            {c.is_active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} />}
                                        </button>
                                        <button onClick={() => deleteCoupon(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
