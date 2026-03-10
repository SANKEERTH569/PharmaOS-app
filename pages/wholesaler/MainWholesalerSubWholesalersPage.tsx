import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Users, FileText, Package, Building2 } from 'lucide-react';
import api from '../../utils/api';

interface SubWholesaler {
    id: string;
    name: string;
    shop_name: string;
    phone: string;
    address?: string;
    gstin?: string;
    dl_number?: string;
    is_active: boolean;
    created_at: string;
}

export const MainWholesalerSubWholesalersPage = () => {
    const [subWholesalers, setSubWholesalers] = useState<SubWholesaler[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchSubWholesalers = async () => {
            try {
                const res = await api.get('/main-wholesalers/sub-wholesalers');
                setSubWholesalers(res.data);
            } catch (err) {
                console.error('Failed to fetch sub-wholesalers', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubWholesalers();
    }, []);

    const filtered = subWholesalers.filter(
        (w) =>
            w.name.toLowerCase().includes(search.toLowerCase()) ||
            w.phone.includes(search)
    );

    return (
        <div className="space-y-5 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Sub Wholesalers</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Your network of active wholesale partners</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 border border-violet-100 rounded-xl">
                    <Users size={12} /> {subWholesalers.length} partners
                </span>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/30 focus:border-violet-200 outline-none shadow-sm transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                    <p className="text-slate-500 font-medium">No partners found</p>
                    <p className="text-slate-400 text-sm mt-1">
                        {search ? 'Try a different search term.' : 'Sub-wholesalers appear here once they place orders with you.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((w) => (
                        <div key={w.id} className="group bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-200">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Building2 size={18} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-violet-700 transition-colors">{w.name}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Users size={10} /> Sub Wholesaler
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    w.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                    {w.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                                    <Phone size={12} className="text-violet-400 shrink-0" />
                                    <span className="font-medium">{w.phone}</span>
                                </div>
                                {w.address && (
                                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                                        <MapPin size={12} className="text-violet-400 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{w.address}</span>
                                    </div>
                                )}
                                {w.gstin && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                                        <FileText size={12} className="text-violet-400 shrink-0" />
                                        <span className="font-mono tracking-wide">GSTIN: {w.gstin}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                                Joined {new Date(w.created_at).toLocaleDateString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
