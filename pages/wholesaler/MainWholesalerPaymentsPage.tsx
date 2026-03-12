import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import {
    CheckCircle, XCircle, Clock, Download,
    IndianRupee, TrendingUp, Wallet, Plus, X,
    Search, Filter, Calendar, CreditCard, Banknote,
    Smartphone, Building2, ArrowUpRight,
} from 'lucide-react';
import { PaymentMethod } from '../../types';

interface Payment {
    id: string;
    wholesaler_id: string;
    wholesaler_name: string;
    amount: number;
    method: PaymentMethod;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    notes: string | null;
    created_at: string;
}

interface SubWholesaler {
    id: string;
    name: string;
    current_balance?: number;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
    CASH: <Banknote size={16} className="text-emerald-600" />,
    UPI: <Smartphone size={16} className="text-violet-600" />,
    CHEQUE: <CreditCard size={16} className="text-blue-600" />,
    BANK_TRANSFER: <Building2 size={16} className="text-indigo-600" />,
};
const METHOD_BG: Record<PaymentMethod, string> = {
    CASH: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    UPI: 'bg-violet-50 text-violet-700 border-violet-100',
    CHEQUE: 'bg-blue-50 text-blue-700 border-blue-100',
    BANK_TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

function startOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

export const MainWholesalerPaymentsPage = () => {
    const { mainWholesaler } = useAuthStore();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [subWholesalers, setSubWholesalers] = useState<SubWholesaler[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterWholesaler, setFilterWholesaler] = useState('ALL');
    const [filterMethod, setFilterMethod] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modal
    const [showAdd, setShowAdd] = useState(false);
    const [formWholesaler, setFormWholesaler] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formMethod, setFormMethod] = useState<PaymentMethod>('CASH');
    const [formNotes, setFormNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchPaymentsAndSubWholesalers = async () => {
            try {
                const [paymentsRes, subwRes] = await Promise.all([
                    api.get('/main-wholesalers/payments'),
                    api.get('/main-wholesalers/sub-wholesalers')
                ]);
                setPayments(paymentsRes.data);
                setSubWholesalers(subwRes.data);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPaymentsAndSubWholesalers();
    }, []);

    const totalCollected = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
    const thisMonth = payments.filter(p => p.status === 'COMPLETED' && new Date(p.created_at) >= startOfMonth()).reduce((s, p) => s + p.amount, 0);
    const today = payments.filter(p => p.status === 'COMPLETED' && new Date(p.created_at) >= startOfToday()).reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);

    const filtered = useMemo(() => {
        return [...payments]
            .filter(p => {
                if (filterWholesaler !== 'ALL' && p.wholesaler_id !== filterWholesaler) return false;
                if (filterMethod !== 'ALL' && p.method !== filterMethod) return false;
                if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
                if (search && !p.wholesaler_name.toLowerCase().includes(search.toLowerCase()) &&
                    !p.id.toLowerCase().includes(search.toLowerCase()) &&
                    !(p.notes?.toLowerCase().includes(search.toLowerCase()))) return false;
                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (new Date(p.created_at) < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (new Date(p.created_at) > to) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [payments, filterWholesaler, filterMethod, filterStatus, search, dateFrom, dateTo]);

    const handleRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formWholesaler || !formAmount || !mainWholesaler) return;
        setSubmitting(true);
        try {
            const res = await api.post('/main-wholesalers/payments', {
                wholesaler_id: formWholesaler,
                amount: parseFloat(formAmount),
                method: formMethod,
                notes: formNotes || undefined
            });
            setPayments([...payments, res.data]);
            setShowAdd(false);
            setFormWholesaler(''); setFormAmount(''); setFormMethod('CASH'); setFormNotes('');
        } catch (err) {
            console.error('Failed to submit payment', err);
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (d: string) => {
        const dt = new Date(d);
        return {
            date: dt.toLocaleDateString('en-IN'),
            time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    return (
        <div className="space-y-5 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Payments</h1>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                        Track all received payments for <span className="font-bold text-slate-700">{mainWholesaler?.name}</span>.
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors shrink-0"
                >
                    <Plus size={16} /> Record Payment
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Collected', value: totalCollected, icon: <Wallet size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'This Month', value: thisMonth, icon: <Calendar size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Today', value: today, icon: <ArrowUpRight size={16} />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                    { label: 'Pending', value: pending, icon: <TrendingUp size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                ].map(({ label, value, icon, color, bg, border }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center mb-2.5`}>
                            <span className={color}>{icon}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-xl font-black text-slate-900">
                            ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Search size={15} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search wholesaler, notes…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 w-full font-medium"
                    />
                </div>

                {[
                    {
                        value: filterWholesaler, onChange: setFilterWholesaler,
                        options: [{ v: 'ALL', l: 'All Sub Wholesalers' }, ...subWholesalers.map(r => ({ v: r.id, l: r.name }))],
                    },
                    {
                        value: filterMethod, onChange: setFilterMethod,
                        options: [{ v: 'ALL', l: 'All Methods' }, { v: 'CASH', l: 'Cash' }, { v: 'UPI', l: 'UPI' }, { v: 'CHEQUE', l: 'Cheque' }, { v: 'BANK_TRANSFER', l: 'Bank Transfer' }],
                    },
                    {
                        value: filterStatus, onChange: setFilterStatus,
                        options: [{ v: 'ALL', l: 'All Status' }, { v: 'COMPLETED', l: 'Completed' }, { v: 'PENDING', l: 'Pending' }, { v: 'FAILED', l: 'Failed' }],
                    },
                ].map((sel, i) => (
                    <div key={i} className="relative">
                        <select
                            value={sel.value}
                            onChange={e => sel.onChange(e.target.value)}
                            className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none font-medium text-slate-700 shadow-sm min-w-[140px]"
                        >
                            {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <Filter className="absolute right-2.5 top-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                    </div>
                ))}

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-700 font-medium w-[130px]"
                        title="From date"
                    />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-700 font-medium w-[130px]"
                        title="To date"
                    />
                </div>

                {(search || filterWholesaler !== 'ALL' || filterMethod !== 'ALL' || filterStatus !== 'ALL' || dateFrom || dateTo) && (
                    <button
                        onClick={() => { setSearch(''); setFilterWholesaler('ALL'); setFilterMethod('ALL'); setFilterStatus('ALL'); setDateFrom(''); setDateTo(''); }}
                        className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 bg-rose-50 rounded-xl border border-rose-100 transition-colors ml-auto"
                    >
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Payment ID</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Sub Wholesaler</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Method</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Notes</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">Loading payments...</td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <IndianRupee size={36} className="mx-auto text-slate-200 mb-3" />
                                        <p className="font-bold text-slate-500">No payments found</p>
                                        <p className="text-slate-400 text-xs mt-1">
                                            {payments.length === 0 ? 'Use "Record Payment" to log a collected payment.' : 'Try adjusting your filters.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {filtered.map((payment) => {
                                const { date, time } = fmt(payment.created_at);
                                return (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400 text-xs tracking-wide">
                                            #{payment.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{payment.wholesaler_name}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-900 font-medium">{date}</p>
                                            <p className="text-xs text-slate-400">{time}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${METHOD_BG[payment.method]}`}>
                                                {METHOD_ICONS[payment.method]}
                                                {payment.method.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs max-w-[180px] truncate">
                                            {payment.notes || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            ₹{payment.amount.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                payment.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                payment.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                                {payment.status === 'COMPLETED' ? <CheckCircle size={12} /> :
                                                    payment.status === 'FAILED' ? <XCircle size={12} /> : <Clock size={12} />}
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payment Modal */}
            {showAdd && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                    onClick={() => setShowAdd(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <IndianRupee size={17} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
                                    <p className="text-slate-400 text-xs">Log a payment from a sub wholesaler</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRecord} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sub Wholesaler *</label>
                                <select
                                    required
                                    value={formWholesaler}
                                    onChange={e => setFormWholesaler(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-slate-800"
                                >
                                    <option value="">Select sub wholesaler…</option>
                                    {subWholesalers.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₹) *</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        required type="number" min="1" step="0.01" placeholder="0.00"
                                        value={formAmount}
                                        onChange={e => setFormAmount(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Payment Method *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                                        <button
                                            key={m} type="button" onClick={() => setFormMethod(m)}
                                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                formMethod === m
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-400 shadow-sm'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            {METHOD_ICONS[m]} {m.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                                <input
                                    type="text" placeholder="e.g. Cheque no., UTR, remarks…"
                                    value={formNotes} onChange={e => setFormNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 font-medium"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button" onClick={() => setShowAdd(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={submitting}
                                    className="flex-2 flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Recording…' : <><CheckCircle size={15} /> Record Payment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
