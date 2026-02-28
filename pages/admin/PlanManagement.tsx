import React, { useEffect, useState } from 'react';
import {
    CreditCard, Crown, Zap, Rocket, Users, Check,
    IndianRupee, TrendingUp, ArrowRight,
} from 'lucide-react';
import api from '../../utils/api';

function fmtCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

const plans = [
    {
        key: 'starter',
        label: 'Starter',
        icon: Zap,
        gradient: 'from-slate-600 to-slate-800',
        border: 'border-slate-200',
        bg: 'bg-slate-50',
        price: 'Free',
        features: ['Up to 10 retailers', 'Basic order management', 'Manual invoicing', 'Email support'],
    },
    {
        key: 'growth',
        label: 'Growth',
        icon: TrendingUp,
        gradient: 'from-blue-500 to-indigo-600',
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        price: '₹999/mo',
        features: ['Up to 50 retailers', 'Auto invoicing & PDF', 'Ledger & payment tracking', 'Real-time notifications', 'Priority support'],
        popular: true,
    },
    {
        key: 'pro',
        label: 'Pro',
        icon: Crown,
        gradient: 'from-amber-500 to-orange-600',
        border: 'border-amber-200',
        bg: 'bg-amber-50',
        price: '₹2,499/mo',
        features: ['Up to 100 retailers', 'Everything in Growth', 'Multi-user access', 'Advanced analytics', 'Returns management', 'Custom invoice branding'],
    },
    {
        key: 'enterprise',
        label: 'Enterprise',
        icon: Rocket,
        gradient: 'from-purple-500 to-violet-700',
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        price: '₹4,999/mo',
        features: ['Unlimited retailers', 'Everything in Pro', 'API integrations', 'Dedicated account manager', 'Priority onboarding', 'Custom reports & analytics'],
    },
];

export const PlanManagement = () => {
    const [stats, setStats] = useState<any>(null);
    const [revenue, setRevenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/stats'),
            api.get('/admin/revenue'),
        ]).then(([s, r]) => {
            setStats(s.data);
            setRevenue(r.data);
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

    const planDist = stats?.planDistribution || {};
    const totalSubs = (planDist.starter || 0) + (planDist.growth || 0) + (planDist.pro || 0) + (planDist.enterprise || 0);

    // Calculate theoretical MRR
    const mrr = (planDist.growth || 0) * 999 + (planDist.pro || 0) * 2499 + (planDist.enterprise || 0) * 4999;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Plans & Billing</h2>
                <p className="text-sm text-slate-400 font-medium mt-0.5">Manage subscription plans and view revenue metrics</p>
            </div>

            {/* Revenue cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
                    <div className="relative z-10">
                        <div className="p-2 rounded-xl bg-white/[0.15] w-fit mb-3">
                            <IndianRupee size={17} className="text-white" />
                        </div>
                        <p className="text-[22px] font-extrabold tracking-tight">{fmtCurrency(mrr)}</p>
                        <p className="text-xs font-semibold text-white/80 mt-1">Monthly Recurring Revenue</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-600/20 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
                    <div className="relative z-10">
                        <div className="p-2 rounded-xl bg-white/[0.15] w-fit mb-3">
                            <Users size={17} className="text-white" />
                        </div>
                        <p className="text-[22px] font-extrabold tracking-tight">{totalSubs}</p>
                        <p className="text-xs font-semibold text-white/80 mt-1">Total Subscribers</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
                    <div className="relative z-10">
                        <div className="p-2 rounded-xl bg-white/[0.15] w-fit mb-3">
                            <TrendingUp size={17} className="text-white" />
                        </div>
                        <p className="text-[22px] font-extrabold tracking-tight">
                            {totalSubs > 0 ? Math.round(((planDist.growth || 0) + (planDist.pro || 0) + (planDist.enterprise || 0)) / totalSubs * 100) : 0}%
                        </p>
                        <p className="text-xs font-semibold text-white/80 mt-1">Paid Plan Conversion</p>
                    </div>
                </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {plans.map(plan => {
                    const count = planDist[plan.key] || 0;
                    const Icon = plan.icon;
                    return (
                        <div key={plan.key} className={`relative bg-white rounded-2xl border ${plan.border} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                            {plan.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-blue-500/25">
                                    Popular
                                </span>
                            )}
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg mb-4`}>
                                <Icon size={20} className="text-white" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{plan.label}</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">{plan.price}</p>
                            <div className="mt-2 mb-5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                    <Users size={11} /> {count} active
                                </span>
                            </div>
                            <div className="space-y-2.5">
                                {plan.features.map(f => (
                                    <div key={f} className="flex items-start gap-2.5">
                                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                                            <Check size={9} className="text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-xs text-slate-600 font-medium leading-relaxed">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Monthly revenue chart (simple) */}
            {revenue?.monthlyRevenue && Object.keys(revenue.monthlyRevenue).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Platform Revenue (Delivered Orders)</h3>
                    <div className="space-y-2">
                        {Object.entries(revenue.monthlyRevenue)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([month, amount]) => {
                                const max = Math.max(...Object.values(revenue.monthlyRevenue).map(Number));
                                const pct = max > 0 ? ((amount as number) / max) * 100 : 0;
                                return (
                                    <div key={month} className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-slate-500 w-20 shrink-0">{month}</span>
                                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${Math.max(pct, 8)}%` }}
                                            >
                                                <span className="text-[9px] font-bold text-white">{fmtCurrency(amount as number)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Top wholesalers by revenue */}
            {revenue?.revenueByWholesaler && revenue.revenueByWholesaler.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Top Wholesalers by Revenue</h3>
                    <div className="space-y-2">
                        {revenue.revenueByWholesaler.slice(0, 10).map((w: any, idx: number) => (
                            <div key={w.wholesaler_id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="text-xs font-extrabold text-slate-400 w-5 text-center">{idx + 1}</span>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                    {w.wholesaler_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{w.wholesaler_name}</p>
                                    <p className="text-[10px] text-slate-400">{w.order_count} orders · <span className="capitalize">{w.plan}</span> plan</p>
                                </div>
                                <span className="text-sm font-extrabold text-slate-800 shrink-0">{fmtCurrency(w.total_revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
