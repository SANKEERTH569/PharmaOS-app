import React, { useState, useMemo, useCallback } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
    MapPin, Search, Crown, Edit3, Check, X,
    ArrowRight, AlertTriangle, Save, Pill, Layers,
} from 'lucide-react';
import { Medicine } from '../types';

/* ═══════════════════════════════════════════════════════════════════════════
   RACK MANAGER — Clean Premium Design (Pro Feature)
   ═══════════════════════════════════════════════════════════════════════════ */
export const RackManagerPage = () => {
    const { medicines, updateMedicine } = useDataStore();
    const { wholesaler } = useAuthStore();
    const isPro = wholesaler?.plan === 'pro' || (wholesaler?.plan as string) === 'enterprise';

    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Data ─────────────────────────────────────────────────────────────────
    const myMeds = useMemo(() => medicines.filter(m => m.wholesaler_id === wholesaler?.id), [medicines, wholesaler?.id]);
    const mapped = useMemo(() => myMeds.filter(m => m.rack_location), [myMeds]);
    const unmapped = useMemo(() => myMeds.filter(m => !m.rack_location), [myMeds]);

    // Unique racks with medicines
    const racks = useMemo(() => {
        const map = new Map<string, Medicine[]>();
        mapped.forEach(m => {
            const key = m.rack_location!;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(m);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, meds]) => ({ name, meds }));
    }, [mapped]);

    // Search results
    const results = useMemo(() => {
        if (!search || search.length < 2) return null;
        const q = search.toLowerCase();
        return myMeds.filter(m =>
            m.name.toLowerCase().includes(q) || (m.salt || '').toLowerCase().includes(q) ||
            (m.brand || '').toLowerCase().includes(q) || (m.rack_location || '').toLowerCase().includes(q)
        ).slice(0, 12);
    }, [myMeds, search]);

    // Edit
    const startEdit = (m: Medicine) => { setEditingId(m.id); setEditValue(m.rack_location || ''); };
    const cancelEdit = () => { setEditingId(null); setEditValue(''); };
    const saveEdit = async (id: string) => {
        setSaving(true);
        try { await updateMedicine(id, { rack_location: editValue || null }); cancelEdit(); }
        catch { alert('Failed to update'); }
        setSaving(false);
    };

    // Batch assign
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchRack, setBatchRack] = useState('');
    const toggleSel = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const batchAssign = async () => {
        if (!batchRack.trim() || selectedIds.size === 0) return;
        setSaving(true);
        try {
            await Promise.all(Array.from(selectedIds).map(id => updateMedicine(id, { rack_location: batchRack.trim() })));
            setSelectedIds(new Set()); setBatchRack('');
        } catch { alert('Failed'); }
        setSaving(false);
    };

    const rackGradients = [
        'from-orange-500 to-amber-600', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
        'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600', 'from-cyan-500 to-sky-600',
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // NON-PRO
    // ═══════════════════════════════════════════════════════════════════════
    if (!isPro) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25">
                        <Crown size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Medicine Rack Locator</h1>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                        Assign rack locations to your medicines and search to instantly find where any medicine is stored.
                    </p>
                    <a href="#/settings"
                        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-xl hover:shadow-lg shadow-md shadow-amber-500/20 transition-all group">
                        Upgrade to Pro <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRO DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Rack Manager
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5 font-medium">
                        {myMeds.length} medicines · {racks.length} racks · {unmapped.length} unmapped
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">PRO</span>
                </div>
            </div>

            {/* ── Stat Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Racks', value: racks.length, sub: `${mapped.length} medicines placed`, gradient: 'from-orange-500 to-amber-600', glow: 'shadow-orange-500/20' },
                    { label: 'Mapped', value: mapped.length, sub: `${myMeds.length > 0 ? Math.round(mapped.length / myMeds.length * 100) : 0}% coverage`, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20' },
                    { label: 'Unmapped', value: unmapped.length, sub: 'Need rack assignment', gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20' },
                    { label: 'Total Stock', value: myMeds.length, sub: `${new Set(myMeds.map(m => m.brand)).size} brands`, gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/20' },
                ].map(({ label, value, sub, gradient, glow }) => (
                    <div key={label}
                        className={`group relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg ${glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
                        <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/[0.04]" />
                        <div className="relative z-10">
                            <p className="text-[22px] font-extrabold text-white tracking-tight leading-none">{value}</p>
                            <p className="text-xs font-semibold text-white/80 mt-1.5">{label}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Search Section ─────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg shadow-slate-900/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">🔍 Find Medicine Rack</p>
                <div className="relative max-w-xl">
                    <Search className="absolute left-4 top-3.5 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Type medicine name to find its rack..."
                        className="w-full pl-11 pr-10 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white text-sm font-medium placeholder-slate-500 focus:ring-2 focus:ring-amber-500/40 focus:bg-white/10 outline-none transition-all"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-3.5 text-slate-500 hover:text-white"><X size={16} /></button>
                    )}
                </div>

                {/* Results */}
                {results && results.length > 0 && (
                    <div className="mt-4 space-y-1.5 max-w-xl">
                        {results.map(m => (
                            <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white truncate">{m.name}</p>
                                    <p className="text-[10px] text-slate-500">{m.brand}</p>
                                </div>
                                {m.rack_location ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg shrink-0 ml-3">
                                        <MapPin size={12} className="text-amber-400" />
                                        <span className="text-xs font-bold text-amber-300">{m.rack_location}</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-slate-600 italic ml-3">No rack</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {results && results.length === 0 && (
                    <p className="mt-3 text-xs text-slate-500">No results for "{search}"</p>
                )}
            </div>

            {/* ── Main Grid: Racks + Unmapped ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left — Rack Cards */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl shadow-sm">
                                    <Layers size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Your Racks</p>
                                    <p className="text-[11px] text-slate-400">{racks.length} rack{racks.length !== 1 ? 's' : ''} with {mapped.length} medicines</p>
                                </div>
                            </div>
                        </div>

                        {racks.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {racks.map((rack, idx) => (
                                    <div key={rack.name} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rackGradients[idx % rackGradients.length]} flex items-center justify-center shadow-sm`}>
                                                <MapPin size={14} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800">{rack.name}</p>
                                                <p className="text-[10px] text-slate-400">{rack.meds.length} medicine{rack.meds.length !== 1 ? 's' : ''}</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {rack.meds.length}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {rack.meds.slice(0, 6).map(m => (
                                                <span key={m.id} className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600 border border-slate-200/60 truncate max-w-[160px]">
                                                    {m.name}
                                                </span>
                                            ))}
                                            {rack.meds.length > 6 && (
                                                <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">
                                                    +{rack.meds.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <MapPin size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-sm font-bold text-slate-600">No racks yet</p>
                                <p className="text-xs text-slate-400 mt-0.5">Assign rack locations to your medicines below</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — Summary + Unmapped */}
                <div className="space-y-5">

                    {/* Progress */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <p className="text-xs font-bold text-slate-800 mb-3">Mapping Progress</p>
                        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700"
                                style={{ width: `${myMeds.length ? (mapped.length / myMeds.length * 100) : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>{mapped.length} mapped</span>
                            <span>{unmapped.length} remaining</span>
                        </div>
                    </div>

                    {/* Unmapped medicines quick list */}
                    {unmapped.length > 0 && (
                        <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                                    <AlertTriangle size={13} className="text-white" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">Unmapped</p>
                                <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                    {unmapped.length}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {unmapped.slice(0, 5).map(m => (
                                    <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-rose-50/60 hover:bg-rose-100/60 rounded-xl transition-colors border border-rose-100/40">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{m.name}</p>
                                            <p className="text-[10px] text-slate-400">{m.brand}</p>
                                        </div>
                                        <button onClick={() => startEdit(m)} className="text-orange-500 hover:text-orange-700 p-1">
                                            <Edit3 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {unmapped.length > 5 && (
                                <p className="mt-2 text-[10px] text-rose-400 font-bold text-center">+{unmapped.length - 5} more below</p>
                            )}
                        </div>
                    )}

                    {/* Dark summary */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg shadow-slate-900/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Rack Summary</p>
                        <div className="space-y-3">
                            {[
                                { l: 'Active Racks', v: racks.length },
                                { l: 'Mapped', v: mapped.length },
                                { l: 'Unmapped', v: unmapped.length },
                                { l: 'Coverage', v: `${myMeds.length ? Math.round(mapped.length / myMeds.length * 100) : 0}%` },
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

            {/* ── Full Medicine Table with Rack Assignment ────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-sm">
                            <Pill size={15} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">All Medicines</p>
                            <p className="text-[11px] text-slate-400">Assign or edit rack locations</p>
                        </div>
                    </div>
                    {/* Batch bar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-orange-600">{selectedIds.size} selected</span>
                            <input type="text" placeholder="Rack name" value={batchRack} onChange={e => setBatchRack(e.target.value)}
                                className="w-32 px-3 py-1.5 border border-orange-200 rounded-lg text-xs font-bold text-orange-800 bg-orange-50 focus:ring-2 focus:ring-orange-400/40 outline-none" />
                            <button onClick={batchAssign} disabled={!batchRack.trim() || saving}
                                className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold rounded-lg hover:shadow-md disabled:opacity-50">
                                <Save size={10} className="inline mr-1" />Assign
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                        </div>
                    )}
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 w-10">
                                <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    checked={myMeds.length > 0 && selectedIds.size === myMeds.length}
                                    onChange={e => setSelectedIds(e.target.checked ? new Set(myMeds.map(m => m.id)) : new Set())} />
                            </th>
                            <th className="px-4 py-3 font-bold tracking-wider">Medicine</th>
                            <th className="px-4 py-3 font-bold tracking-wider hidden md:table-cell">Brand</th>
                            <th className="px-4 py-3 font-bold tracking-wider">Rack Location</th>
                            <th className="px-4 py-3 font-bold tracking-wider text-right">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {myMeds.slice(0, 80).map(med => (
                            <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                        checked={selectedIds.has(med.id)} onChange={() => toggleSel(med.id)} />
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-bold text-slate-900 text-[13px]">{med.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{med.salt}</p>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-bold uppercase border border-slate-200">
                                        {med.brand}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {editingId === med.id ? (
                                        <div className="flex items-center gap-2">
                                            <input autoFocus type="text" value={editValue} placeholder="e.g. Rack A - Shelf 3"
                                                className="w-44 px-3 py-1.5 border border-orange-300 rounded-lg text-xs font-bold text-orange-800 bg-orange-50 focus:ring-2 focus:ring-orange-400/40 outline-none"
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(med.id); if (e.key === 'Escape') cancelEdit(); }} />
                                            <button onClick={() => saveEdit(med.id)} disabled={saving} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Check size={14} /></button>
                                            <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
                                        </div>
                                    ) : med.rack_location ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200/80 rounded-lg">
                                            <MapPin size={12} className="text-orange-500" />
                                            <span className="text-xs font-bold text-orange-700">{med.rack_location}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 italic">Not set</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(med)}
                                        className="p-2 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors">
                                        <Edit3 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {myMeds.length === 0 && (
                    <div className="py-16 text-center">
                        <Pill size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-sm font-bold text-slate-600">No medicines yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Add medicines to your inventory first</p>
                    </div>
                )}
                {myMeds.length > 80 && (
                    <div className="px-5 py-3 bg-slate-50 border-t text-center text-xs text-slate-400 font-medium">
                        Showing first 80 of {myMeds.length}
                    </div>
                )}
            </div>
        </div>
    );
};
