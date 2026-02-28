import React, { useEffect, useState } from 'react';
import {
    Search, Users, Filter, ChevronDown, ToggleLeft, ToggleRight,
    Store, ShoppingCart, IndianRupee,
} from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../utils/cn';

function fmtCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

export const RetailerManagement = () => {
    const [retailers, setRetailers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchData = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        api.get(`/admin/retailers?${params}`)
            .then(r => setRetailers(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [search, statusFilter]);

    const toggleActive = async (id: string, current: boolean) => {
        setUpdatingId(id);
        try {
            await api.patch(`/admin/retailers/${id}`, { is_active: !current });
            setRetailers(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
        } catch (err) { console.error(err); }
        finally { setUpdatingId(null); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Retailer Management</h2>
                <p className="text-sm text-slate-400 font-medium mt-0.5">{retailers.length} retailers across all sub-wholesalers</p>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, shop name, or phone…"
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all',
                            showFilters ? 'bg-rose-50 border-rose-200 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        <Filter size={14} />
                        Filters
                        <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
                    </button>
                </div>
                {showFilters && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-5">Retailer</th>
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Sub-Wholesaler</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">
                                    <span className="flex items-center gap-1 justify-center"><ShoppingCart size={11} /> Orders</span>
                                </th>
                                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">
                                    <span className="flex items-center gap-1 justify-end"><IndianRupee size={11} /> Balance</span>
                                </th>
                                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Credit Limit</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {retailers.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                                                {r.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{r.shop_name || r.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{r.name} · {r.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {r.wholesaler ? (
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-700 truncate">{r.wholesaler.name}</p>
                                                <p className="text-[10px] text-slate-400">{r.wholesaler.phone}</p>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] font-medium text-slate-400 italic">
                                                {r.is_self_registered ? 'Self-registered' : 'No wholesaler'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center px-4 py-3.5">
                                        <span className="text-sm font-bold text-slate-700">{r._count?.orders || 0}</span>
                                    </td>
                                    <td className="text-right px-4 py-3.5">
                                        <span className={cn(
                                            'text-sm font-extrabold',
                                            r.current_balance > r.credit_limit * 0.8 ? 'text-rose-600' : 'text-slate-800'
                                        )}>
                                            {fmtCurrency(r.current_balance || 0)}
                                        </span>
                                    </td>
                                    <td className="text-right px-4 py-3.5">
                                        <span className="text-sm font-medium text-slate-500">{fmtCurrency(r.credit_limit || 0)}</span>
                                    </td>
                                    <td className="text-center px-4 py-3.5">
                                        <span className={cn(
                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                                            r.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                                        )}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', r.is_active ? 'bg-emerald-500' : 'bg-red-500')} />
                                            {r.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="text-center px-4 py-3.5">
                                        <button
                                            disabled={updatingId === r.id}
                                            onClick={() => toggleActive(r.id, r.is_active)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                                            title={r.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {r.is_active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {retailers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <Users size={28} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm font-bold text-slate-500">No retailers found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
