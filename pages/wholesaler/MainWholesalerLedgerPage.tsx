import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Download, X, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';

interface LedgerEntry {
    id: string;
    wholesaler_id: string;
    wholesaler: {
        id: string;
        name: string;
        phone: string;
    };
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    balance_after: number;
    reference_id: string | null;
    description: string;
    created_at: string;
}

export const MainWholesalerLedgerPage = () => {
    const { mainWholesaler } = useAuthStore();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterWholesaler, setFilterWholesaler] = useState<string>('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const res = await api.get('/main-wholesalers/ledger');
                setEntries(res.data);
            } catch (err) {
                console.error('Failed to fetch main wholesaler ledger', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, []);

    // Unique wholesalers from the ledger itself for the dropdown
    const uniqueWholesalers = Array.from(new Map(entries.map(e => [e.wholesaler.id, e.wholesaler])).values()) as { id: string, name: string, phone: string }[];

    const sortedEntries = useMemo(() => {
        return [...entries]
            .filter(e => {
                if (filterWholesaler !== 'ALL' && e.wholesaler_id !== filterWholesaler) return false;
                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (new Date(e.created_at) < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (new Date(e.created_at) > to) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [entries, filterWholesaler, dateFrom, dateTo]);

    return (
        <div className="space-y-5 animate-slide-up">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">General Ledger</h1>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">Full transaction history for {mainWholesaler?.name}.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
                    <div className="relative">
                        <select
                            className="pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500/30 appearance-none font-bold text-slate-700 shadow-sm w-full"
                            value={filterWholesaler}
                            onChange={(e) => setFilterWholesaler(e.target.value)}
                        >
                            <option value="ALL">All Sub Wholesalers</option>
                            {uniqueWholesalers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="outline-none text-sm text-slate-700 font-medium bg-transparent w-[130px]"
                            title="From date"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="outline-none text-sm text-slate-700 font-medium bg-transparent w-[130px]"
                            title="To date"
                        />
                    </div>

                    {(filterWholesaler !== 'ALL' || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setFilterWholesaler('ALL'); setDateFrom(''); setDateTo(''); }}
                            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-2 bg-rose-50 rounded-xl border border-rose-100 transition-colors"
                        >
                            <X size={13} /> Clear
                        </button>
                    )}

                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors">
                        <Download size={15} /> Export
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Transaction Time</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Sub Wholesaler</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Description</th>
                                <th className="px-6 py-4 text-center font-bold tracking-wider">Type</th>
                                <th className="px-6 py-4 text-right font-bold tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-right font-bold tracking-wider">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                                        Loading ledger...
                                    </td>
                                </tr>
                            )}
                            {!loading && sortedEntries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500 text-sm">
                                        No ledger entries found for your account.
                                    </td>
                                </tr>
                            )}
                            {sortedEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-slate-900 font-medium">{new Date(entry.created_at).toLocaleDateString('en-IN')}</p>
                                        <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleTimeString()}</p>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{entry.wholesaler.name}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-slate-700 font-medium">{entry.description}</p>
                                        {entry.reference_id && <span className="text-xs text-slate-400 font-mono mt-0.5 block">Ref: {entry.reference_id}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${entry.type === 'DEBIT' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${entry.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {entry.type === 'DEBIT' ? '+' : '-'} ₹{entry.amount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                                        ₹{entry.balance_after.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
