import React, { useState, useEffect } from 'react';
import {
    Plus, Tag, Trash2, ArrowLeft,
    Info, Percent, Gift, Landmark, CheckCircle2,
    AlertTriangle, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SchemeType, MainWholesalerMedicine, MainWholesalerScheme } from '../../types';
import api from '../../utils/api';

export const MainWholesalerSchemesPage = () => {
    const navigate = useNavigate();

    const [schemes, setSchemes] = useState<MainWholesalerScheme[]>([]);
    const [medicines, setMedicines] = useState<MainWholesalerMedicine[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [type, setType] = useState<SchemeType>('BOGO');
    const [name, setName] = useState('');
    const [minQty, setMinQty] = useState('');
    const [freeQty, setFreeQty] = useState('');
    const [discountPct, setDiscountPct] = useState('');
    const [medicineId, setMedicineId] = useState('');
    const [searchMed, setSearchMed] = useState('');
    const [showMedDropdown, setShowMedDropdown] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schemesRes, medsRes] = await Promise.all([
                api.get('/main-wholesalers/schemes'),
                api.get('/main-wholesalers/medicines')
            ]);
            setSchemes(schemesRes.data);
            setMedicines(medsRes.data);
        } catch (err) {
            console.error('Failed to fetch schemes data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredMeds = medicines.filter(m =>
        m.is_active && m.medicine_name.toLowerCase().includes(searchMed.toLowerCase())
    ).slice(0, 10);

    const selectedMed = medicines.find(m => m.id === medicineId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/main-wholesalers/schemes', {
                name,
                type,
                min_qty: minQty ? parseInt(minQty) : null,
                free_qty: freeQty ? parseFloat(freeQty) : null,
                discount_pct: discountPct ? parseFloat(discountPct) : null,
                medicine_id: medicineId || null,
            });
            setShowAdd(false);
            resetForm();
            await fetchData(); // Refresh the list
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create scheme');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, schemeName: string) => {
        if (confirm(`Are you sure you want to delete scheme: ${schemeName}?`)) {
            try {
                await api.delete(`/main-wholesalers/schemes/${id}`);
                await fetchData(); // Refresh the list
            } catch (err: any) {
                alert('Failed to delete scheme');
            }
        }
    };

    const resetForm = () => {
        setName('');
        setMinQty('');
        setFreeQty('');
        setDiscountPct('');
        setMedicineId('');
        setSearchMed('');
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/wholesaler/main-dashboard')} className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all shadow-sm">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Tag className="text-indigo-600" /> Scheme & Discount Engine
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage B2B incentive rules for sub-wholesalers.</p>
                    </div>
                </div>
                {!showAdd && (
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">
                        <Plus size={18} /> Create Scheme
                    </button>
                )}
            </div>

            {showAdd && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center gap-3">
                        <Tag size={20} className="text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">New Discount Rule</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left Col - Basics */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Rule Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { val: 'BOGO', label: 'BOGO (10+1)', icon: Gift },
                                            { val: 'HALF_SCHEME', label: 'Half Scheme', icon: Percent },
                                            { val: 'CASH_DISCOUNT', label: 'Cash Disc.', icon: Landmark }
                                        ].map(t => (
                                            <button key={t.val} type="button" onClick={() => setType(t.val as SchemeType)}
                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border ${type === t.val ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} transition-all`}>
                                                <t.icon size={18} />
                                                <span className="text-[10px] font-bold">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Internal Name</label>
                                    <input type="text" required placeholder="e.g. Bulk Dolo Discount"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        value={name} onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Right Col - Configuration */}
                            <div className="space-y-5 p-5 bg-slate-50 rounded-xl border border-slate-100">

                                {(type === 'BOGO' || type === 'HALF_SCHEME') && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Medicine from your Catalog</label>
                                            <input type="text" placeholder="Search your catalog medicines..." required={!medicineId}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                                value={medicineId ? selectedMed?.medicine_name || '' : searchMed}
                                                onChange={e => { setSearchMed(e.target.value); setMedicineId(''); setShowMedDropdown(true); }}
                                                onFocus={() => setShowMedDropdown(true)}
                                            />
                                            {showMedDropdown && searchMed && !medicineId && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredMeds.map(m => (
                                                        <button key={m.id} type="button" onClick={() => { setMedicineId(m.id); setSearchMed(''); setShowMedDropdown(false); }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50">
                                                            {m.medicine_name} <span className="text-xs text-slate-400 ml-1">{m.brand}</span>
                                                        </button>
                                                    ))}
                                                    {filteredMeds.length === 0 && (
                                                        <div className="px-4 py-3 text-sm text-slate-500">No matching medicines found in your catalog.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Min. Purchase Qty (X)</label>
                                                <input type="number" required min="1" placeholder="e.g. 10"
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                                    value={minQty} onChange={e => setMinQty(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{type === 'BOGO' ? 'Free Qty (Y)' : 'Discount Qty Equivalent'}</label>
                                                <input type="number" required min="0.1" step="0.1" placeholder={type === 'BOGO' ? "e.g. 1" : "e.g. 0.5"}
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                                    value={freeQty} onChange={e => setFreeQty(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                            <Info size={14} className="shrink-0 mt-0.5" />
                                            <p><strong>Example:</strong> For every <span className="font-bold">{minQty || 'X'}</span> units bought by sub-wholesalers, they receive a discount equivalent to the price of <span className="font-bold">{freeQty || 'Y'}</span> units.</p>
                                        </div>
                                    </div>
                                )}

                                {type === 'CASH_DISCOUNT' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Flat Discount Percentage</label>
                                            <div className="relative">
                                                <input type="number" required min="0.1" max="100" step="0.1" placeholder="e.g. 2.0"
                                                    className="w-full px-4 py-2.5 pl-8 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-emerald-600"
                                                    value={discountPct} onChange={e => setDiscountPct(e.target.value)}
                                                />
                                                <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                            <p><strong>Note:</strong> Cash discounts apply universally to the entire order subtotal during B2B ordering.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2">
                                {submitting ? 'Saving...' : <><CheckCircle2 size={16} /> Save Rule</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800">Active Schemes</h2>
                </div>
                {loading ? (
                    <div className="flex justify-center items-center p-12 text-indigo-500">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : schemes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Gift size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">No active schemes.</p>
                        <p className="text-xs mt-1">Create a scheme to incentivize sub-wholesaler orders.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {schemes.map(s => (
                            <div key={s.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.type === 'CASH_DISCOUNT' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {s.type === 'CASH_DISCOUNT' ? <Landmark size={20} /> : <Gift size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{s.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {s.type === 'BOGO' ? `Buy ${s.min_qty} Get ${s.free_qty} Free` :
                                                s.type === 'HALF_SCHEME' ? `Buy ${s.min_qty} Get ${s.free_qty} Half-Scheme` :
                                                    `Flat ${s.discount_pct}% Cash Discount`}
                                            {s.medicine && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">{s.medicine.medicine_name}</span>}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
