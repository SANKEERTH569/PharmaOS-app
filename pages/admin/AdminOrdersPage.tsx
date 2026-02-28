import React, { useEffect, useState } from 'react';
import {
    Search, Filter, ChevronDown, ShoppingCart, Package,
    Clock, CheckCircle2, XCircle, Truck, IndianRupee,
} from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../utils/cn';

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    PENDING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
    ACCEPTED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: CheckCircle2 },
    DISPATCHED: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: Truck },
    DELIVERED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: Package },
    REJECTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', icon: XCircle },
    CANCELLED: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', icon: XCircle },
};

function fmtCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

export const AdminOrdersPage = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('limit', '200');
        api.get(`/admin/orders?${params}`)
            .then(r => setOrders(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [statusFilter]);

    const totalRevenue = orders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.total_amount, 0);
    const totalOrders = orders.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">All Orders</h2>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">{totalOrders} orders · Revenue: {fmtCurrency(totalRevenue)}</p>
                </div>
                {/* Summary pills */}
                <div className="flex gap-2 flex-wrap">
                    {['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'].map(s => {
                        const count = orders.filter(o => o.status === s).length;
                        const cfg = statusConfig[s];
                        return (
                            <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text}`}>
                                <cfg.icon size={10} /> {count} {s.toLowerCase()}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all',
                            showFilters ? 'bg-rose-50 border-rose-200 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        <Filter size={14} />
                        Filter by Status
                        <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
                    </button>
                </div>
                {showFilters && (
                    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-slate-100">
                        <button
                            onClick={() => setStatusFilter('')}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', !statusFilter ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100')}
                        >
                            All
                        </button>
                        {Object.keys(statusConfig).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize', statusFilter === s ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100')}
                            >
                                {s.toLowerCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Orders list */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-5">Order</th>
                                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Wholesaler → Retailer</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Items</th>
                                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Amount</th>
                                <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orders.map(o => {
                                const cfg = statusConfig[o.status] || statusConfig.PENDING;
                                const StatusIcon = cfg.icon;
                                return (
                                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs font-bold text-slate-800">
                                                {o.invoice_no || o.id.slice(0, 8)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{o.wholesaler?.name || '–'}</p>
                                            <p className="text-[10px] text-slate-400 truncate">→ {o.retailer?.shop_name || o.retailer?.name || '–'}</p>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className="text-xs font-bold text-slate-700">{o.items?.length || 0}</span>
                                        </td>
                                        <td className="text-right px-4 py-3.5">
                                            <span className="text-sm font-extrabold text-slate-800">₹{o.total_amount?.toLocaleString('en-IN')}</span>
                                        </td>
                                        <td className="text-center px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text}`}>
                                                <StatusIcon size={10} /> {o.status}
                                            </span>
                                        </td>
                                        <td className="text-right px-4 py-3.5">
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <ShoppingCart size={28} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm font-bold text-slate-500">No orders found</p>
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
