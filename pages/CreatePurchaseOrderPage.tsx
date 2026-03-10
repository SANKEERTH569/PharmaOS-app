import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileText, Plus, Trash2, Building,
    LinkIcon, Loader2, Save
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import api from '../utils/api';
import { MainWholesalerMedicine } from '../types';

interface NewPOItem {
    medicine_id: string;
    medicine_name: string;
    qty_ordered: number;
    unit_cost: number;
}

const emptyPOLine = (): NewPOItem => ({
    medicine_id: '',
    medicine_name: '',
    qty_ordered: 0,
    unit_cost: 0,
});

export const CreatePurchaseOrderPage = () => {
    const navigate = useNavigate();
    const { medicines, createPurchaseOrder } = useDataStore();
    const activeMedicines = medicines.filter((m) => m.is_active && m.wholesaler_id);

    const [supplierName, setSupplierName] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierGstin, setSupplierGstin] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<NewPOItem[]>([emptyPOLine()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [medSearch, setMedSearch] = useState<Record<number, string>>({});

    // MainWholesaler linking
    const [linkToMW, setLinkToMW] = useState(false);
    const [mwSearch, setMwSearch] = useState('');
    const [mwResults, setMwResults] = useState<{ id: string; name: string; phone: string; address?: string | null }[]>([]);
    const [selectedMW, setSelectedMW] = useState<{ id: string; name: string; phone: string } | null>(null);
    const [mwSearching, setMwSearching] = useState(false);

    const searchMW = async (q: string) => {
        if (!q || q.length < 2) { setMwResults([]); return; }
        setMwSearching(true);
        try {
            const { data } = await api.get('/main-wholesalers/list', { params: { q } });
            setMwResults(data);
        } catch (err) {
            console.error('Failed to search wholesalers', err);
        } finally {
            setMwSearching(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => searchMW(mwSearch), 300);
        return () => clearTimeout(t);
    }, [mwSearch]);

    // Fetch catalog when MW selected
    const [mwCatalog, setMwCatalog] = useState<MainWholesalerMedicine[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);

    useEffect(() => {
        const fetchCatalog = async () => {
            if (!selectedMW) {
                setMwCatalog([]);
                return;
            }
            setLoadingCatalog(true);
            try {
                const { data } = await api.get(`/main-wholesalers/${selectedMW.id}/medicines`);
                setMwCatalog(data);
            } catch (err) {
                console.error('Failed to fetch MW catalog', err);
            } finally {
                setLoadingCatalog(false);
            }
        };
        fetchCatalog();
    }, [selectedMW]);

    const updateItem = <K extends keyof NewPOItem>(
        idx: number,
        key: K,
        value: NewPOItem[K]
    ) => {
        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
    };

    const selectMed = (idx: number, med: any) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === idx
                    ? {
                        ...item,
                        medicine_id: med.id,
                        // use medicine_name specifically if available for MainWholesalerMedicine
                        medicine_name: med.medicine_name || med.name,
                        unit_cost: med.price
                    }
                    : item
            )
        );
        setMedSearch((prev) => ({ ...prev, [idx]: '' }));
    };

    const handleSubmit = async () => {
        setError('');
        const effectiveSupplierName = linkToMW && selectedMW ? selectedMW.name : supplierName.trim();
        if (!effectiveSupplierName) return setError(linkToMW ? 'Please select a wholesaler from the platform.' : 'Supplier name is required.');
        for (const [i, item] of items.entries()) {
            if (!item.medicine_name.trim()) return setError(`Row ${i + 1}: medicine name is required.`);
            if (item.qty_ordered <= 0) return setError(`Row ${i + 1}: quantity must be > 0.`);
        }

        if (items.length === 0) return setError('Please add at least one item to the order.');

        setSaving(true);
        try {
            await createPurchaseOrder({
                supplier_name: effectiveSupplierName,
                supplier_phone: (linkToMW && selectedMW ? selectedMW.phone : supplierPhone.trim()) || undefined,
                supplier_gstin: supplierGstin.trim() || undefined,
                notes: notes.trim() || undefined,
                main_wholesaler_id: linkToMW && selectedMW ? selectedMW.id : undefined,
                items,
            });
            navigate('/purchase-orders');
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Failed to create PO.');
            setSaving(false);
        }
    };

    const totalValue = items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" />
                        Create Purchase Order
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Order inventory from suppliers or other wholesalers on PharmaOS
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Supplier Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Building size={18} className="text-slate-400" />
                            Supplier Details
                        </h2>

                        {/* Link to PharmaOS Wholesaler (optional) */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 mb-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <Building size={15} className="text-blue-600" />
                                    <span className="text-sm font-semibold text-slate-700">PharmaOS Network</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setLinkToMW(!linkToMW); setSelectedMW(null); setMwSearch(''); setMwResults([]); }}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${linkToMW ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${linkToMW ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {linkToMW ? (
                                <div className="relative">
                                    {selectedMW ? (
                                        <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{selectedMW.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{selectedMW.phone}</div>
                                            </div>
                                            <button onClick={() => setSelectedMW(null)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={mwSearch}
                                                onChange={(e) => setMwSearch(e.target.value)}
                                                placeholder="Search wholesaler name or phone..."
                                                className="w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                                            />
                                            {mwSearching && <div className="text-xs text-slate-500 mt-2 px-1">Searching network...</div>}
                                            {mwResults.length > 0 && (
                                                <ul className="absolute z-30 left-0 top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                    {mwResults.map((mw) => (
                                                        <li
                                                            key={mw.id}
                                                            onClick={() => {
                                                                setSelectedMW(mw);
                                                                setMwSearch('');
                                                                setMwResults([]);
                                                                if (!supplierName) setSupplierName(mw.name);
                                                                // clear items to prevent accidental ordering of non-catalog stuff
                                                                setItems([emptyPOLine()]);
                                                            }}
                                                            className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
                                                        >
                                                            <div className="font-bold text-slate-800">{mw.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{mw.phone}{mw.address ? ` · ${mw.address}` : ''}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {mwSearch.length >= 2 && !mwSearching && mwResults.length === 0 && (
                                                <div className="text-xs text-slate-500 mt-2 px-1">No wholesalers found. Enter manual details below.</div>
                                            )}
                                        </>
                                    )}
                                    {selectedMW && (
                                        <div className="text-xs flex gap-1.5 mt-3 text-blue-700 bg-blue-100/50 p-2 rounded-lg items-start">
                                            <LinkIcon size={14} className="shrink-0 mt-0.5" />
                                            <p>Order will be sent directly to their dashboard when marked as "Sent". Order items are restricted to their catalog.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Toggle on to order directly from other wholesalers on the PharmaOS platform for automatic order syncing.
                                </p>
                            )}
                        </div>

                        {/* Manual Supplier Info */}
                        <div className={`space-y-4 ${linkToMW && selectedMW ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Supplier Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    placeholder="e.g. Apollo Pharmacy Dist."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    value={supplierPhone}
                                    onChange={(e) => setSupplierPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                                <input
                                    type="text"
                                    value={supplierGstin}
                                    onChange={(e) => setSupplierGstin(e.target.value)}
                                    placeholder="e.g. 27AAPFU0939F1ZV"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Delivery instructions, expected dates..."
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Items */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-slate-800">Order Items</h2>
                            <button
                                onClick={() => setItems((prev) => [...prev, emptyPOLine()])}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                <Plus size={16} /> Add Item Row
                            </button>
                        </div>

                        <div className="overflow-x-auto flex-1 bg-white rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                        <th className="text-left font-semibold px-4 py-3 w-64">Medicine Name</th>
                                        <th className="text-right font-semibold px-4 py-3 w-28">Quantity</th>
                                        <th className="text-right font-semibold px-4 py-3 w-32">Unit Price (₹)</th>
                                        <th className="text-right font-semibold px-4 py-3 w-32">Total (₹)</th>
                                        <th className="w-12 px-2 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => {
                                        const search = medSearch[idx] ?? '';

                                        let suggestions: any[] = [];
                                        if (search.length >= 2) {
                                            if (linkToMW && selectedMW) {
                                                // Specific Wholesaler Catalog mode
                                                suggestions = mwCatalog
                                                    .filter(m =>
                                                        m.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
                                                        (m.brand ?? '').toLowerCase().includes(search.toLowerCase())
                                                    )
                                                    .slice(0, 8);
                                            } else {
                                                // Generic mode
                                                suggestions = activeMedicines
                                                    .filter((m) =>
                                                        m.name.toLowerCase().includes(search.toLowerCase()) ||
                                                        (m.brand ?? '').toLowerCase().includes(search.toLowerCase())
                                                    )
                                                    .slice(0, 8);
                                            }
                                        }

                                        return (
                                            <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 relative align-top">
                                                    {item.medicine_id ? (
                                                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg group-hover:bg-white transition-colors">
                                                            <span className="text-sm font-medium text-slate-800 truncate pr-2">
                                                                {item.medicine_name}
                                                            </span>
                                                            <button
                                                                onClick={() => updateItem(idx, 'medicine_id', '')}
                                                                className="text-slate-400 hover:text-rose-500 rounded p-0.5 shrink-0"
                                                                title="Change item"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={search}
                                                                placeholder="Search inventory or type name…"
                                                                onChange={(e) => {
                                                                    setMedSearch((prev) => ({ ...prev, [idx]: e.target.value }));
                                                                    if (!item.medicine_id) {
                                                                        updateItem(idx, 'medicine_name', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-white"
                                                            />
                                                            {suggestions.length > 0 && (
                                                                <ul className="absolute z-30 left-0 top-full mt-1.5 w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                                    {suggestions.map((m) => (
                                                                        <li
                                                                            key={m.id}
                                                                            onClick={() => selectMed(idx, m)}
                                                                            className="px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                                                                        >
                                                                            <div className="font-semibold text-slate-800">{m.medicine_name || m.name}</div>
                                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                                {m.brand} • MRP: ₹{m.mrp} • Cost: ₹{m.price}
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                            {search.length >= 2 && suggestions.length === 0 && (
                                                                <ul className="absolute z-30 left-0 top-full mt-1.5 w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl p-3">
                                                                    <li className="text-xs text-slate-500">
                                                                        {linkToMW && selectedMW
                                                                            ? `No matching items found in ${selectedMW.name}'s catalog.`
                                                                            : 'No matching items found in your inventory.'
                                                                        }
                                                                    </li>
                                                                </ul>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty_ordered || ''}
                                                        onChange={(e) => updateItem(idx, 'qty_ordered', parseInt(e.target.value) || 0)}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unit_cost || ''}
                                                        onChange={(e) => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right align-top pt-5">
                                                    <span className="font-medium text-slate-800">
                                                        {(item.qty_ordered * item.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 text-center align-top pt-4">
                                                    {items.length > 1 && (
                                                        <button
                                                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remove row"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Add row button at the bottom of the table data */}
                            <div className="p-3 border-t border-slate-200 bg-slate-50/50">
                                <button
                                    onClick={() => setItems((prev) => [...prev, emptyPOLine()])}
                                    className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add Another Item
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-slate-600">
                        Total Order Value:{' '}
                        <span className="text-2xl font-bold text-slate-800 ml-2">
                            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex w-full sm:w-auto items-center gap-3">
                        <button
                            onClick={() => navigate('/purchase-orders')}
                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || items.length === 0}
                            className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Draft PO
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
