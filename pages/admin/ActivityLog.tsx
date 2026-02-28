import React, { useEffect, useState } from 'react';
import {
    Activity, Package, CreditCard, UserPlus, Filter,
    ChevronDown,
} from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../utils/cn';

type ActivityItem = {
    id: string;
    type: string;
    description: string;
    detail: string;
    timestamp: string;
    meta?: any;
};

const typeConfig: Record<string, { icon: any; bg: string; border: string; text: string }> = {
    ORDER: { icon: Package, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
    PAYMENT: { icon: CreditCard, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    REGISTRATION: { icon: UserPlus, bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600' },
};

const timeAgo = (ts: string) => {
    const ms = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const ActivityLog = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        api.get('/admin/activity?limit=100')
            .then(r => setActivities(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = typeFilter ? activities.filter(a => a.type === typeFilter) : activities;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Group by date
    const grouped: Record<string, ActivityItem[]> = {};
    filtered.forEach(a => {
        const dateKey = new Date(a.timestamp).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(a);
    });

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Activity Log</h2>
                <p className="text-sm text-slate-400 font-medium mt-0.5">{filtered.length} events across the platform</p>
            </div>

            {/* Summary pills */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(typeConfig).map(([type, cfg]) => {
                    const count = activities.filter(a => a.type === type).length;
                    const Icon = cfg.icon;
                    return (
                        <span key={type} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                            <Icon size={10} /> {count} {type.toLowerCase()}s
                        </span>
                    );
                })}
            </div>

            {/* Filter */}
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
                        Filter by Type
                        <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
                    </button>
                </div>
                {showFilters && (
                    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-slate-100">
                        <button
                            onClick={() => setTypeFilter('')}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', !typeFilter ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100')}
                        >
                            All
                        </button>
                        {Object.keys(typeConfig).map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize', typeFilter === t ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100')}
                            >
                                {t.toLowerCase()}s
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity feed grouped by date */}
            {Object.keys(grouped).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([date, items]) => (
                        <div key={date}>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{date}</p>
                            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm divide-y divide-slate-50">
                                {items.map((a, idx) => {
                                    const cfg = typeConfig[a.type] || { icon: Activity, bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600' };
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={`${a.id}-${idx}`} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${cfg.bg} ${cfg.border}`}>
                                                <Icon size={15} className={cfg.text} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-800 leading-tight">{a.description}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{a.detail}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] text-slate-400 font-medium">{timeAgo(a.timestamp)}</span>
                                                <p className={`text-[9px] font-bold mt-0.5 ${cfg.text} uppercase tracking-wider`}>{a.type}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/60 py-16 text-center shadow-sm">
                    <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-500">No activity found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Events will appear here as they happen</p>
                </div>
            )}
        </div>
    );
};
