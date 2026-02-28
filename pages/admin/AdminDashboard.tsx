import React, { useEffect, useState } from 'react';
import {
    Briefcase, Users, ShoppingCart, TrendingUp, IndianRupee,
    ArrowRight, Activity, UserPlus, Package, CreditCard,
    BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

function fmtCurrency(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

const planColors: Record<string, string> = {
    starter: 'from-slate-500 to-slate-600',
    growth: 'from-blue-500 to-indigo-600',
    pro: 'from-amber-500 to-orange-600',
};

const planBorder: Record<string, string> = {
    starter: 'border-slate-200',
    growth: 'border-blue-200',
    pro: 'border-amber-200',
};

export const AdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/activity?limit=10'),
        ]).then(([s, a]) => {
            setStats(s.data);
            setActivity(a.data);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats) return <p className="text-sm text-slate-500 text-center py-16">Failed to load stats</p>;

    const statCards = [
        {
            label: 'Sub-Wholesalers', value: stats.totalWholesalers,
            sub: `${stats.activeWholesalers} active · ${stats.newWholesalersThisMonth} this month`,
            icon: Briefcase, gradient: 'from-indigo-600 to-blue-700', glow: 'shadow-indigo-600/20', link: '/admin/wholesalers',
        },
        {
            label: 'Retailers', value: stats.totalRetailers,
            sub: `${stats.activeRetailers} active · ${stats.newRetailersThisMonth} this month`,
            icon: Users, gradient: 'from-violet-600 to-purple-700', glow: 'shadow-violet-600/20', link: '/admin/retailers',
        },
        {
            label: 'Total Orders', value: stats.totalOrders,
            sub: `${stats.deliveredOrders} delivered · ${stats.ordersThisMonth} this month`,
            icon: ShoppingCart, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20', link: '/admin/orders',
        },
        {
            label: 'Total Revenue', value: fmtCurrency(stats.totalRevenue),
            sub: `Collected: ${fmtCurrency(stats.totalPayments)}`,
            icon: IndianRupee, gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', link: '/admin/revenue',
        },
    ];

    const planDist = stats.planDistribution || {};
    const totalSubs = (planDist.starter || 0) + (planDist.growth || 0) + (planDist.pro || 0) + (planDist.enterprise || 0);

    const activityIcon = (type: string) => {
        switch (type) {
            case 'ORDER': return <Package size={14} className="text-blue-500" />;
            case 'PAYMENT': return <CreditCard size={14} className="text-emerald-500" />;
            case 'REGISTRATION': return <UserPlus size={14} className="text-violet-500" />;
            default: return <Activity size={14} className="text-slate-400" />;
        }
    };

    const activityBg = (type: string) => {
        switch (type) {
            case 'ORDER': return 'bg-blue-50 border-blue-100';
            case 'PAYMENT': return 'bg-emerald-50 border-emerald-100';
            case 'REGISTRATION': return 'bg-violet-50 border-violet-100';
            default: return 'bg-slate-50 border-slate-100';
        }
    };

    const timeAgo = (ts: string) => {
        const ms = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(ms / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-6">

            {/* Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Overview 🏢</h2>
                    <p className="text-sm text-slate-400 mt-0.5 font-medium">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, sub, icon: Icon, gradient, glow, link }, idx) => (
                    <Link
                        key={label}
                        to={link}
                        className={`group relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg ${glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
                        <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/[0.04]" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-xl bg-white/[0.15] backdrop-blur-sm">
                                    <Icon size={17} strokeWidth={2} className="text-white" />
                                </div>
                                <ArrowRight size={13} className="text-white/30 group-hover:text-white/60 mt-1 transition-colors" />
                            </div>
                            <p className="text-[22px] font-extrabold text-white tracking-tight leading-none">{value}</p>
                            <p className="text-xs font-semibold text-white/80 mt-1.5">{label}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left – Activity Feed */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-rose-400 to-orange-500 rounded-xl shadow-sm">
                                    <Activity size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Recent Activity</p>
                                    <p className="text-[11px] text-slate-400">Platform-wide events</p>
                                </div>
                            </div>
                            <Link to="/admin/activity" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline">
                                View all <ArrowRight size={11} />
                            </Link>
                        </div>
                        {activity.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {activity.map((a, idx) => (
                                    <div key={`${a.id}-${idx}`} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${activityBg(a.type)}`}>
                                            {activityIcon(a.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-800 leading-tight truncate">{a.description}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{a.detail}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">{timeAgo(a.timestamp)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Activity size={28} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-bold text-slate-500">No activity yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right – Plan Distribution & Quick Links */}
                <div className="space-y-5">

                    {/* Plan Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                                <BarChart3 size={13} className="text-white" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">Plan Distribution</p>
                            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{totalSubs} total</span>
                        </div>
                        <div className="space-y-3">
                            {['starter', 'growth', 'pro', 'enterprise'].map(plan => {
                                const count = planDist[plan] || 0;
                                const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                                return (
                                    <div key={plan} className={`p-3 rounded-xl border ${planBorder[plan]} bg-gradient-to-r ${planColors[plan]}/5`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700 capitalize">{plan}</span>
                                            <span className="text-xs font-extrabold text-slate-800">{count}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${planColors[plan]} transition-all duration-500`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{pct}% of subscribers</p>
                                    </div>
                                );
                            })}
                        </div>
                        <Link to="/admin/plans" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 hover:underline">
                            Manage Plans <ArrowRight size={12} />
                        </Link>
                    </div>

                    {/* Summary card */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg shadow-slate-900/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Platform Summary</p>
                        <div className="space-y-3">
                            {[
                                { l: 'Wholesalers', v: stats.totalWholesalers },
                                { l: 'Retailers', v: stats.totalRetailers },
                                { l: 'Total Orders', v: stats.totalOrders },
                                { l: 'Revenue', v: fmtCurrency(stats.totalRevenue) },
                                { l: 'Collected', v: fmtCurrency(stats.totalPayments) },
                            ].map(({ l, v }) => (
                                <div key={l} className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">{l}</span>
                                    <span className="text-sm font-bold text-white">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
