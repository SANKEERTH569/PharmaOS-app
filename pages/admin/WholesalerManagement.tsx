import React, { useEffect, useState } from 'react';
import {
    Search, Briefcase, Filter, ChevronDown, ToggleLeft, ToggleRight,
    ArrowUpDown, IndianRupee, Users, ShoppingCart, Pill, Crown,
} from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../utils/cn';

function fmtCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

const planBadge: Record<string, { bg: string; text: string }> = {
    starter: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
    growth: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    pro: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
};

export const WholesalerManagement = () => {
    const [wholesalers, setWholesalers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'retailers'>('revenue');
    const [planModal, setPlanModal] = useState<{ id: string; current: string } | null>(null);

    const fetchData = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (planFilter) params.set('plan', planFilter);
        if (statusFilter) params.set('status', statusFilter);
        api.get(`/admin/wholesalers?${params}`)
            .then(r => setWholesalers(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [search, planFilter, statusFilter]);

    const toggleActive = async (id: string, current: boolean) => {
        setUpdatingId(id);
        try {
            await api.patch(`/admin/wholesalers/${id}`, { is_active: !current });
            setWholesalers(prev => prev.map(w => w.id === id ? { ...w, is_active: !current } : w));
        } catch (err) { console.error(err); }
        finally { setUpdatingId(null); }
    };

    const changePlan = async (id: string, plan: string) => {
        setUpdatingId(id);
        try {
            await api.patch(`/admin/wholesalers/${id}`, { plan });
            setWholesalers(prev => prev.map(w => w.id === id ? { ...w, plan } : w));
            setPlanModal(null);
        } catch (err) { console.error(err); }
        finally { setUpdatingId(null); }
    };

    const sorted = [...wholesalers].sort((a, b) => {
        if (sortBy === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
        if (sortBy === 'retailers') return (b._count?.retailers || 0) - (a._count?.retailers || 0);
        return a.name.localeCompare(b.name);
    });

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sub-Wholesaler Management</h2>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">{wholesalers.length} sub-wholesalers on platform</p>
                </div>
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
                            placeholder="Search by name, phone, or username…"
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
                            value={planFilter}
                            onChange={e => setPlanFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        >
                            <option value="">All Plans</option>
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="pro">Pro</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <div className="flex items-center gap-1 ml-auto">
                            <span className="text-[10px] text-slate-500 font-medium">Sort by:</span>
                            {(['revenue', 'retailers', 'name'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSortBy(s)}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all capitalize',
                                        sortBy === s ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100'
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-5">Wholesaler</th>
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Plan</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">
                                    <span className="flex items-center gap-1 justify-center"><Users size={11} /> Retailers</span>
                                </th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">
                                    <span className="flex items-center gap-1 justify-center"><ShoppingCart size={11} /> Orders</span>
                                </th>
                                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">
                                    <span className="flex items-center gap-1 justify-end"><IndianRupee size={11} /> Revenue</span>
                                </th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sorted.map(w => {
                                const pb = planBadge[w.plan] || planBadge.starter;
                                return (
                                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                                                    {w.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{w.name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">{w.phone} {w.username && `· @${w.username}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <button
                                                onClick={() => setPlanModal({ id: w.id, current: w.plan })}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${pb.bg} ${pb.text} hover:opacity-80 transition-opacity capitalize`}
                                            >
                                                {w.plan === 'pro' && <Crown size={10} />}
                                                {w.plan}
                                            </button>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className="text-sm font-bold text-slate-700">{w._count?.retailers || 0}</span>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className="text-sm font-bold text-slate-700">{w._count?.orders || 0}</span>
                                        </td>
                                        <td className="text-right px-4 py-3.5">
                                            <span className="text-sm font-extrabold text-slate-800">{fmtCurrency(w.revenue || 0)}</span>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                w.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                                            )}>
                                                <span className={cn('w-1.5 h-1.5 rounded-full', w.is_active ? 'bg-emerald-500' : 'bg-red-500')} />
                                                {w.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <button
                                                disabled={updatingId === w.id}
                                                onClick={() => toggleActive(w.id, w.is_active)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                                                title={w.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {w.is_active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sorted.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <Briefcase size={28} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm font-bold text-slate-500">No wholesalers found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Plan change modal */}
            {planModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPlanModal(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-extrabold text-slate-800 mb-1">Change Plan</h3>
                        <p className="text-xs text-slate-500 mb-5">Select a new subscription plan</p>
                        <div className="space-y-2">
                            {['starter', 'growth', 'pro', 'enterprise'].map(plan => (
                                <button
                                    key={plan}
                                    disabled={plan === planModal.current || updatingId === planModal.id}
                                    onClick={() => changePlan(planModal.id, plan)}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between',
                                        plan === planModal.current
                                            ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/30'
                                            : 'hover:bg-slate-50 border-slate-200'
                                    )}
                                >
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 capitalize">{plan}</span>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {plan === 'starter' && 'Basic features for small operations'}
                                            {plan === 'growth' && 'Advanced features for growing businesses'}
                                            {plan === 'pro' && 'Full suite for large-scale operations'}
                                        </p>
                                    </div>
                                    {plan === planModal.current && (
                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Current</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setPlanModal(null)}
                            className="w-full mt-4 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
