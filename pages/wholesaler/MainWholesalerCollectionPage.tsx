import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
    IndianRupee, Wallet, CheckCircle, X,
    Banknote, Smartphone, CreditCard, Building2,
    ChevronDown, ChevronUp, Clock, TrendingDown,
    Users, ArrowDownCircle,
} from 'lucide-react';
import api from '../../utils/api';

type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';

interface SubWholesaler {
    id: string; name: string; phone: string; address?: string; gstin?: string; is_active: boolean; created_at: string;
}

interface LedgerEntry {
    id: string; wholesaler_id: string; type: 'DEBIT' | 'CREDIT'; amount: number; balance_after: number; description: string; created_at: string;
    wholesaler?: { id: string; name: string };
}

interface Payment {
    id: string; wholesaler_id: string; wholesaler_name: string; amount: number; method: PaymentMethod; status: string; notes?: string; created_at: string;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
    CASH: <Banknote size={13} className="text-emerald-600" />,
    UPI: <Smartphone size={13} className="text-violet-600" />,
    CHEQUE: <CreditCard size={13} className="text-blue-600" />,
    BANK_TRANSFER: <Building2 size={13} className="text-indigo-600" />,
};
const METHOD_BG: Record<PaymentMethod, string> = {
    CASH: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    UPI: 'bg-violet-50 text-violet-700 border-violet-100',
    CHEQUE: 'bg-blue-50 text-blue-700 border-blue-100',
    BANK_TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

function daysSince(dateStr?: string) {
    if (!dateStr) return null;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

type Tab = 'outstanding' | 'cleared' | 'all';

export const MainWholesalerCollectionPage = () => {
    const { mainWholesaler } = useAuthStore();

    const [subWholesalers, setSubWholesalers] = useState<SubWholesaler[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    const [tab, setTab] = useState<Tab>('outstanding');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('CASH');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [justPaid, setJustPaid] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            api.get('/main-wholesalers/sub-wholesalers'),
            api.get('/main-wholesalers/ledger'),
            api.get('/main-wholesalers/payments'),
        ]).then(([sw, led, pay]) => {
            setSubWholesalers(sw.data);
            setLedger(led.data);
            setPayments(pay.data);
        }).catch(() => {});
    }, []);

    // Calculate balance per sub-wholesaler from ledger entries
    const balanceMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const entry of ledger) {
            const wId = entry.wholesaler_id || entry.wholesaler?.id;
            if (!wId) continue;
            // Find the latest balance_after for each wholesaler
            if (!map.has(wId) || new Date(entry.created_at) > new Date()) {
                map.set(wId, entry.balance_after);
            }
        }
        // Get latest balance per wholesaler (entries are ordered newest first)
        const latestMap = new Map<string, number>();
        for (const entry of ledger) {
            const wId = entry.wholesaler_id || entry.wholesaler?.id;
            if (!wId) continue;
            if (!latestMap.has(wId)) {
                latestMap.set(wId, entry.balance_after);
            }
        }
        return latestMap;
    }, [ledger]);

    const paymentsByWholesaler = useMemo(() => {
        const map = new Map<string, Payment[]>();
        for (const p of payments.filter(p => p.status === 'COMPLETED')) {
            const list = map.get(p.wholesaler_id) || [];
            map.set(p.wholesaler_id, [...list, p]);
        }
        return map;
    }, [payments]);

    // Build display list with computed balances
    const enrichedList = useMemo(() => {
        return subWholesalers.map(sw => ({
            ...sw,
            balance: balanceMap.get(sw.id) || 0,
        }));
    }, [subWholesalers, balanceMap]);

    const outstanding = enrichedList.filter(s => s.balance > 0);
    const cleared = enrichedList.filter(s => s.balance <= 0);
    const totalOutstanding = outstanding.reduce((s, r) => s + r.balance, 0);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const completedPayments = payments.filter(p => p.status === 'COMPLETED');
    const collectedToday = completedPayments
        .filter(p => new Date(p.created_at) >= today)
        .reduce((s, p) => s + p.amount, 0);

    const displayList = useMemo(() => {
        const list = tab === 'outstanding' ? outstanding : tab === 'cleared' ? cleared : [...enrichedList];
        return [...list].sort((a, b) => b.balance - a.balance);
    }, [tab, outstanding, cleared, enrichedList]);

    const selectedWholesaler = selectedId ? enrichedList.find(s => s.id === selectedId) : null;

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId || !amount || !mainWholesaler) return;
        setSubmitting(true);
        try {
            await api.post('/main-wholesalers/payments', {
                wholesaler_id: selectedId,
                amount: parseFloat(amount),
                method,
                notes: notes || 'Collection Entry',
                status: 'COMPLETED',
            });
            // Refresh data
            const [led, pay] = await Promise.all([
                api.get('/main-wholesalers/ledger'),
                api.get('/main-wholesalers/payments'),
            ]);
            setLedger(led.data);
            setPayments(pay.data);
            setJustPaid(selectedId);
            setSelectedId(null);
            setAmount('');
            setMethod('CASH');
            setNotes('');
            setTimeout(() => setJustPaid(null), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

    return (
        <div className="space-y-5 animate-slide-up">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Collection Management</h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5">Track outstanding dues and record payments from sub-wholesalers.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Outstanding', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, icon: <Wallet size={16} />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                    { label: 'Collected Today', value: `₹${collectedToday.toLocaleString('en-IN')}`, icon: <ArrowDownCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Pending', value: `${outstanding.length} sub-wholesalers`, icon: <TrendingDown size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Cleared', value: `${cleared.length} sub-wholesalers`, icon: <Users size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                ].map(({ label, value, icon, color, bg, border }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center mb-2.5`}>
                            <span className={color}>{icon}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-fit">
                {([
                    { key: 'outstanding', label: `Outstanding (${outstanding.length})` },
                    { key: 'cleared', label: `Cleared (${cleared.length})` },
                    { key: 'all', label: `All (${enrichedList.length})` },
                ] as { key: Tab; label: string }[]).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${tab === t.key
                            ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Sub Wholesaler</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Outstanding Balance</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Last Payment</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Total Paid</th>
                                <th className="px-6 py-4 text-right font-bold tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayList.map(sw => {
                                const swPayments = (paymentsByWholesaler.get(sw.id) || [])
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                                const lastPmt = swPayments[0];
                                const totalPaid = swPayments.reduce((s, p) => s + p.amount, 0);
                                const isCleared = sw.balance <= 0;
                                const isExpanded = expandedId === sw.id;
                                const wasJustPaid = justPaid === sw.id;

                                return (
                                    <React.Fragment key={sw.id}>
                                        <tr className={`border-t border-slate-50 transition-colors ${wasJustPaid ? 'bg-emerald-50' : 'hover:bg-slate-50/50'}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                                                        {sw.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900">{sw.name}</p>
                                                            {isCleared && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full"><CheckCircle size={9} /> Cleared</span>}
                                                            {wasJustPaid && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">✓ Recorded</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-400">{sw.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-black text-base ${isCleared ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    ₹{sw.balance.toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {lastPmt ? (
                                                    <div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${METHOD_BG[lastPmt.method]}`}>
                                                            {METHOD_ICONS[lastPmt.method]} {lastPmt.method.replace('_', ' ')}
                                                        </span>
                                                        <p className="text-xs text-slate-500 mt-1 font-medium">
                                                            ₹{lastPmt.amount.toLocaleString('en-IN')} · <span className="text-slate-400">{daysSince(lastPmt.created_at)}</span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold"><Clock size={12} /> Never paid</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-slate-900">₹{totalPaid.toLocaleString('en-IN')}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{swPayments.length} payment{swPayments.length !== 1 ? 's' : ''}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {swPayments.length > 0 && (
                                                        <button onClick={() => setExpandedId(isExpanded ? null : sw.id)}
                                                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-violet-700 px-2.5 py-2 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                                                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} History
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setSelectedId(sw.id); setAmount(sw.balance > 0 ? String(sw.balance) : ''); }}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${isCleared
                                                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                            : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                                                        {isCleared ? 'Advance' : 'Collect'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && swPayments.length > 0 && (
                                            <tr className="border-t border-slate-100 bg-slate-50/60">
                                                <td colSpan={5} className="px-6 py-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                        Payment History — {sw.name}
                                                    </p>
                                                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                                                        {swPayments.map(p => (
                                                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${METHOD_BG[p.method]}`}>
                                                                        {METHOD_ICONS[p.method]} {p.method.replace('_', ' ')}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">{fmtDate(p.created_at)}</span>
                                                                    {p.notes && p.notes !== 'Collection Entry' && (
                                                                        <span className="text-xs text-slate-400 italic truncate max-w-[180px]">{p.notes}</span>
                                                                    )}
                                                                </div>
                                                                <span className="font-black text-emerald-600 text-sm">+₹{p.amount.toLocaleString('en-IN')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {displayList.length === 0 && (
                        <div className="py-16 text-center">
                            <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
                            <p className="font-bold text-slate-700 text-base">
                                {tab === 'outstanding' ? 'All cleared! No outstanding dues.' : 'No sub-wholesalers found.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Collect Payment Modal */}
            {selectedId && selectedWholesaler && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedId(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <p className="font-bold text-slate-900">Collect Payment</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedWholesaler.name}
                                    {selectedWholesaler.balance > 0 && <span className="ml-1.5 text-rose-600 font-bold">· Due: ₹{selectedWholesaler.balance.toLocaleString('en-IN')}</span>}
                                </p>
                            </div>
                            <button onClick={() => setSelectedId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handlePayment} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Collected (₹) *</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="number" min="1" step="0.01" value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none font-bold text-base text-slate-900"
                                        placeholder="0.00" required autoFocus />
                                </div>
                                {selectedWholesaler.balance > 0 && (
                                    <button type="button" onClick={() => setAmount(String(selectedWholesaler.balance))}
                                        className="mt-1.5 text-xs font-bold text-violet-600 hover:underline">
                                        Use full due amount (₹{selectedWholesaler.balance.toLocaleString('en-IN')})
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                                        <button key={m} type="button" onClick={() => setMethod(m)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${method === m
                                                ? 'bg-violet-50 text-violet-700 border-violet-400 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                            {METHOD_ICONS[m]} {m.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reference / Notes</label>
                                <input type="text" placeholder="Cheque no., UPI ref, UTR, remarks…"
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30 text-slate-700" />
                            </div>

                            <div className="pt-1 flex gap-3">
                                <button type="button" onClick={() => setSelectedId(null)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 bg-violet-600 text-white font-bold hover:bg-violet-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors text-sm">
                                    {submitting ? 'Recording…' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
