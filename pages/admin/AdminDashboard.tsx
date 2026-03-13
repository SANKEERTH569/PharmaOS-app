import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Briefcase,
    CreditCard,
    IndianRupee,
    Package,
    RefreshCw,
    ShoppingCart,
    TrendingUp,
    UserPlus,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

type Stats = {
    totalWholesalers: number;
    activeWholesalers: number;
    totalRetailers: number;
    activeRetailers: number;
    totalOrders: number;
    deliveredOrders: number;
    totalRevenue: number;
    totalPayments: number;
    ordersThisMonth: number;
    newWholesalersThisMonth: number;
    newRetailersThisMonth: number;
    planDistribution: Record<string, number>;
};

type ActivityItem = {
    id: string;
    type: string;
    description: string;
    detail: string;
    timestamp: string;
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

function fmtPercent(n: number) {
    if (!Number.isFinite(n)) return '0%';
    return `${Math.round(n)}%`;
}

function monthLabel(key: string) {
    const [year, month] = key.split('-').map(Number);
    if (!year || !month) return key;
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

const planColors: Record<string, string> = {
    starter: 'from-slate-500 to-slate-600',
    growth: 'from-blue-500 to-indigo-600',
    pro: 'from-amber-500 to-orange-600',
    enterprise: 'from-fuchsia-500 to-rose-600',
};

const planBorder: Record<string, string> = {
    starter: 'border-slate-200',
    growth: 'border-blue-200',
    pro: 'border-amber-200',
    enterprise: 'border-fuchsia-200',
};

export const AdminDashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
    const [pendingPlanRequests, setPendingPlanRequests] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadDashboard = async (isRefresh = false) => {
        setError('');
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [statsRes, activityRes, revenueRes, pendingRes] = await Promise.allSettled([
                api.get('/admin/stats'),
                api.get('/admin/activity?limit=8'),
                api.get('/admin/revenue'),
                api.get('/admin/plan-requests?status=PENDING'),
            ]);

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
            } else {
                setError('Unable to load platform statistics.');
            }

            if (activityRes.status === 'fulfilled') {
                setActivity(activityRes.value.data || []);
            }

            if (revenueRes.status === 'fulfilled') {
                setRevenue(revenueRes.value.data || null);
            }

            if (pendingRes.status === 'fulfilled') {
                setPendingPlanRequests((pendingRes.value.data || []).length);
            }
        } catch {
            setError('Unable to load dashboard data. Please retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

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

    if (!stats) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-sm font-semibold text-slate-600 mb-3">{error || 'Failed to load dashboard'}</p>
                <button
                    onClick={() => loadDashboard()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                    <RefreshCw size={12} /> Retry
                </button>
            </div>
        );
    }

    const planDist = stats.planDistribution || {};
    const totalSubs = (planDist.starter || 0) + (planDist.growth || 0) + (planDist.pro || 0) + (planDist.enterprise || 0);

    const deliveryRate = stats.totalOrders > 0 ? (stats.deliveredOrders / stats.totalOrders) * 100 : 0;
    const collectionRate = stats.totalRevenue > 0 ? Math.min(100, (stats.totalPayments / stats.totalRevenue) * 100) : 0;
    const activeWholesalerRate = stats.totalWholesalers > 0 ? (stats.activeWholesalers / stats.totalWholesalers) * 100 : 0;
    const activeRetailerRate = stats.totalRetailers > 0 ? (stats.activeRetailers / stats.totalRetailers) * 100 : 0;

    const latestMonth = monthlySeries[monthlySeries.length - 1]?.amount || 0;
    const previousMonth = monthlySeries[monthlySeries.length - 2]?.amount || 0;
    const growthRate = previousMonth > 0 ? ((latestMonth - previousMonth) / previousMonth) * 100 : 0;

    const attentionItems = [
        { label: 'Pending plan requests', value: pendingPlanRequests, link: '/admin/coupons', highlight: pendingPlanRequests > 0 },
        { label: 'Undelivered orders', value: Math.max(stats.totalOrders - stats.deliveredOrders, 0), link: '/admin/orders', highlight: deliveryRate < 80 },
        { label: 'Collection gap', value: fmtPercent(100 - collectionRate), link: '/admin/revenue', highlight: collectionRate < 85 },
    ];

    const statCards = [
        {
            label: 'Sub-Wholesalers',
            value: stats.totalWholesalers.toLocaleString('en-IN'),
            sub: `${stats.activeWholesalers} active · ${stats.newWholesalersThisMonth} new this month`,
            icon: Briefcase,
            gradient: 'from-indigo-600 to-blue-700',
            glow: 'shadow-indigo-600/20',
            link: '/admin/wholesalers',
        },
        {
            label: 'Retailers',
            value: stats.totalRetailers.toLocaleString('en-IN'),
            sub: `${stats.activeRetailers} active · ${stats.newRetailersThisMonth} new this month`,
            icon: Users,
            gradient: 'from-violet-600 to-purple-700',
            glow: 'shadow-violet-600/20',
            link: '/admin/retailers',
        },
        {
            label: 'Total Orders',
            value: stats.totalOrders.toLocaleString('en-IN'),
            sub: `${stats.deliveredOrders} delivered · ${stats.ordersThisMonth} this month`,
            icon: ShoppingCart,
            gradient: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/20',
            link: '/admin/orders',
        },
        {
            label: 'Total Revenue',
            value: fmtCurrency(stats.totalRevenue),
            sub: `Collected: ${fmtCurrency(stats.totalPayments)} · ${fmtPercent(growthRate)} MoM`,
            icon: IndianRupee,
            gradient: 'from-amber-500 to-orange-600',
            glow: 'shadow-amber-500/20',
            link: '/admin/revenue',
        },
    ];

    const topWholesalers = (revenue?.revenueByWholesaler || []).slice(0, 5);
    const maxSeries = Math.max(1, ...monthlySeries.map(m => m.amount));

    const adminApps = [
        { label: 'Wholesalers', desc: 'Manage sub-wholesalers and plans', link: '/admin/wholesalers', icon: Briefcase },
        { label: 'Retailers', desc: 'Control retailers and activation', link: '/admin/retailers', icon: Users },
        { label: 'Orders', desc: 'Monitor platform order pipeline', link: '/admin/orders', icon: ShoppingCart },
        { label: 'Revenue', desc: 'Revenue and collection analytics', link: '/admin/revenue', icon: IndianRupee },
        { label: 'Plans', desc: 'Subscription plans and conversion', link: '/admin/plans', icon: TrendingUp },
        { label: 'Coupons', desc: 'Coupons and plan requests', link: '/admin/coupons', icon: CreditCard },
        { label: 'Activity Log', desc: 'Platform event timeline', link: '/admin/activity', icon: Activity },
        { label: 'Issues', desc: 'Complaints, returns, and tickets', link: '/admin/issues', icon: AlertTriangle },
        { label: 'Collections', desc: 'Dues, risk, and adjustments', link: '/admin/collections', icon: BarChart3 },
        { label: 'Salesforce', desc: 'MR/salesman controls and performance', link: '/admin/salesforce', icon: UserPlus },
        { label: 'Inventory', desc: 'Expiry and stock risk tracking', link: '/admin/inventory', icon: Package },
        { label: 'Compliance', desc: 'Policy and control overview', link: '/admin/compliance', icon: Activity },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h2>
                    <p className="text-sm text-slate-400 mt-0.5 font-medium">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={() => loadDashboard(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, sub, icon: Icon, gradient, glow, link }) => (
                    <Link
                        key={label}
                        to={link}
                        className={`group relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg ${glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
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
                            <p className="text-[11px] text-white/55 mt-0.5">{sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Delivery Rate', value: fmtPercent(deliveryRate) },
                    { label: 'Collection Rate', value: fmtPercent(collectionRate) },
                    { label: 'Wholesaler Activation', value: fmtPercent(activeWholesalerRate) },
                    { label: 'Retailer Activation', value: fmtPercent(activeRetailerRate) },
                ].map(item => (
                    <div key={item.label} className="bg-white border border-slate-200/70 rounded-xl p-4 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="text-lg font-extrabold text-slate-800 mt-1">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-base font-extrabold text-slate-900">Admin Apps</p>
                        <p className="text-xs text-slate-500">All admin modules in one place</p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{adminApps.length} modules</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {adminApps.map(app => {
                        const Icon = app.icon;
                        return (
                            <Link
                                key={app.link}
                                to={app.link}
                                className="group rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 text-white flex items-center justify-center shrink-0">
                                        <Icon size={15} />
                                    </div>
                                    <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
                                </div>
                                <p className="mt-3 text-sm font-bold text-slate-800 leading-tight">{app.label}</p>
                                <p className="mt-1 text-[11px] text-slate-500 leading-snug">{app.desc}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                                    <TrendingUp size={13} className="text-white" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">Monthly Revenue Trend</p>
                            </div>
                            <Link to="/admin/revenue" className="text-xs font-semibold text-rose-600 hover:underline">Deep dive</Link>
                        </div>

                        {monthlySeries.length > 0 ? (
                            <div className="space-y-2">
                                {monthlySeries.map(item => (
                                    <div key={item.key} className="flex items-center gap-3">
                                        <span className="text-[11px] font-medium text-slate-500 w-16 shrink-0">{item.label}</span>
                                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${Math.max((item.amount / maxSeries) * 100, 8)}%` }}
                                            >
                                                <span className="text-[9px] font-bold text-white">{fmtCurrency(item.amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Revenue trend is not available yet.</p>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-rose-400 to-orange-500 rounded-xl shadow-sm">
                                    <Activity size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Recent Activity</p>
                                    <p className="text-[11px] text-slate-400">Latest platform events</p>
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

                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                                <BarChart3 size={13} className="text-white" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">Plan Distribution</p>
                            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{totalSubs}</span>
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
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <p className="text-sm font-bold text-slate-800 mb-3">Top Wholesalers by Revenue</p>
                        {topWholesalers.length > 0 ? (
                            <div className="space-y-2">
                                {topWholesalers.map((w, idx) => (
                                    <div key={w.wholesaler_id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className="text-[11px] font-black text-slate-400 w-4 text-center">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{w.wholesaler_name}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{w.order_count} orders · {w.plan}</p>
                                        </div>
                                        <span className="text-xs font-extrabold text-slate-800">{fmtCurrency(w.total_revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">No delivered-order revenue found.</p>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg shadow-slate-900/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Needs Attention</p>
                        <div className="space-y-2.5">
                            {attentionItems.map(item => (
                                <Link
                                    key={item.label}
                                    to={item.link}
                                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs ${item.highlight ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <span className="flex items-center gap-1.5 text-slate-200">
                                        {item.highlight && <AlertTriangle size={12} className="text-amber-300" />}
                                        {item.label}
                                    </span>
                                    <span className="font-bold text-white">{item.value}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <p className="text-sm font-bold text-slate-800 mb-3">Control Center</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Issues', link: '/admin/issues' },
                                { label: 'Collections', link: '/admin/collections' },
                                { label: 'Salesforce', link: '/admin/salesforce' },
                                { label: 'Inventory', link: '/admin/inventory' },
                                { label: 'Compliance', link: '/admin/compliance' },
                            ].map(item => (
                                <Link
                                    key={item.link}
                                    to={item.link}
                                    className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
