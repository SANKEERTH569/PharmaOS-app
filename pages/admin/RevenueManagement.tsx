import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    CreditCard,
    IndianRupee,
    ShoppingBag,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

type Stats = {
    totalRevenue: number;
    totalPayments: number;
    deliveredOrders: number;
    planDistribution: Record<string, number>;
};

type RevenueByWholesaler = {
    wholesaler_id: string;
    wholesaler_name: string;
    plan: string;
    total_revenue: number;
    order_count: number;
};

type RevenuePayload = {
    revenueByWholesaler: RevenueByWholesaler[];
    monthlyRevenue: Record<string, number>;
};

function fmtCurrency(n: number) {
    if (n >= 10000000) return `Rs${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `Rs${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `Rs${(n / 1000).toFixed(1)}K`;
    return `Rs${n.toFixed(0)}`;
}

function monthLabel(key: string) {
    const [year, month] = key.split('-').map(Number);
    if (!year || !month) return key;
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export const RevenueManagement = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/revenue'),
        ])
            .then(([sRes, rRes]) => {
                setStats(sRes.data);
                setRevenue(rRes.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const monthlySeries = useMemo(() => {
        const source = revenue?.monthlyRevenue || {};
        return Object.entries(source)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([key, amount]) => ({ key, label: monthLabel(key), amount: Number(amount) || 0 }));
    }, [revenue]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats || !revenue) {
        return <p className="text-sm text-slate-500 text-center py-16">Unable to load revenue analytics.</p>;
    }

    const maxMonthly = Math.max(1, ...monthlySeries.map(item => item.amount));
    const topWholesalers = (revenue.revenueByWholesaler || []).slice(0, 12);
    const avgOrderValue = stats.deliveredOrders > 0 ? stats.totalRevenue / stats.deliveredOrders : 0;

    const planDist = stats.planDistribution || {};
    const mrr = (planDist.growth || 0) * 999 + (planDist.pro || 0) * 2499 + (planDist.enterprise || 0) * 4999;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Revenue Analytics</h2>
                <p className="text-sm text-slate-400 font-medium mt-0.5">Monthly trends, collection efficiency, and wholesaler contribution</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
                    <IndianRupee size={18} className="mb-2" />
                    <p className="text-[22px] font-extrabold">{fmtCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs font-semibold text-white/80">Delivered Revenue</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
                    <CreditCard size={18} className="mb-2" />
                    <p className="text-[22px] font-extrabold">{fmtCurrency(stats.totalPayments)}</p>
                    <p className="text-xs font-semibold text-white/80">Payments Collected</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20">
                    <TrendingUp size={18} className="mb-2" />
                    <p className="text-[22px] font-extrabold">{fmtCurrency(mrr)}</p>
                    <p className="text-xs font-semibold text-white/80">Estimated MRR</p>
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-600/20">
                    <ShoppingBag size={18} className="mb-2" />
                    <p className="text-[22px] font-extrabold">{fmtCurrency(avgOrderValue)}</p>
                    <p className="text-xs font-semibold text-white/80">Average Delivered Order</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500">
                            <BarChart3 size={13} className="text-white" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Last 6 Months Revenue</p>
                    </div>

                    {monthlySeries.length > 0 ? (
                        <div className="space-y-2">
                            {monthlySeries.map(item => (
                                <div key={item.key} className="flex items-center gap-3">
                                    <span className="text-[11px] font-medium text-slate-500 w-16 shrink-0">{item.label}</span>
                                    <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                            style={{ width: `${Math.max((item.amount / maxMonthly) * 100, 8)}%` }}
                                        >
                                            <span className="text-[10px] font-bold text-white">{fmtCurrency(item.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">No monthly revenue data available yet.</p>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-800 mb-3">Collection Snapshot</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Collection ratio</span>
                            <span className="font-extrabold text-slate-800">
                                {stats.totalRevenue > 0 ? `${Math.min(100, Math.round((stats.totalPayments / stats.totalRevenue) * 100))}%` : '0%'}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                                style={{ width: `${stats.totalRevenue > 0 ? Math.min(100, (stats.totalPayments / stats.totalRevenue) * 100) : 0}%` }}
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Delivered revenue</span>
                                <span className="font-bold text-slate-700">{fmtCurrency(stats.totalRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Collected</span>
                                <span className="font-bold text-slate-700">{fmtCurrency(stats.totalPayments)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Gap</span>
                                <span className="font-bold text-rose-600">{fmtCurrency(Math.max(stats.totalRevenue - stats.totalPayments, 0))}</span>
                            </div>
                        </div>
                        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline">
                            Review orders <ArrowRight size={11} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={14} className="text-indigo-500" />
                    <p className="text-sm font-bold text-slate-800">Top Wholesalers by Delivered Revenue</p>
                </div>
                {topWholesalers.length > 0 ? (
                    <div className="space-y-2">
                        {topWholesalers.map((w, idx) => (
                            <div key={w.wholesaler_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="text-xs font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                    {w.wholesaler_name?.charAt(0) || 'W'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{w.wholesaler_name}</p>
                                    <p className="text-[10px] text-slate-400">{w.order_count} orders · {w.plan}</p>
                                </div>
                                <span className="text-xs font-extrabold text-slate-800">{fmtCurrency(w.total_revenue)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">No revenue contribution data available.</p>
                )}
            </div>
        </div>
    );
};
