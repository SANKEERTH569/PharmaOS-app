import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertTriangle, Loader2, PackagePlus, Save, CalendarClock } from 'lucide-react';
import { Medicine } from '../types';
import api from '../utils/api';
import { useDataStore } from '../store/dataStore';

interface MedicineBatchesModalProps {
    isOpen: boolean;
    onClose: () => void;
    medicine: Medicine | null;
}

export const MedicineBatchesModal: React.FC<MedicineBatchesModalProps> = ({ isOpen, onClose, medicine }) => {
    const { updateMedicine } = useDataStore();
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [showAdd, setShowAdd] = useState(false);
    const [newBatch, setNewBatch] = useState({ batch_no: '', expiry_date: '', stock_qty: 0 });
    const [adding, setAdding] = useState(false);

    // Edit stock mode for existing batches
    const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
    const [editStockQty, setEditStockQty] = useState(0);

    useEffect(() => {
        if (isOpen && medicine) {
            loadBatches();
            setShowAdd(false);
            setEditingBatchId(null);
        }
    }, [isOpen, medicine]);

    const loadBatches = async () => {
        if (!medicine) return;
        setLoading(true);
        try {
            const res = await api.get(`/medicines/${medicine.id}/batches`);
            setBatches(res.data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medicine) return;
        setAdding(true);
        try {
            await api.post(`/medicines/${medicine.id}/batches`, {
                batch_no: newBatch.batch_no,
                expiry_date: new Date(newBatch.expiry_date + '-01').toISOString(),
                stock_qty: newBatch.stock_qty
            });
            setNewBatch({ batch_no: '', expiry_date: '', stock_qty: 0 });
            setShowAdd(false);
            await loadBatches();
            refreshMedicineInStore();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add batch');
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateStock = async (batchId: string) => {
        if (!medicine) return;
        try {
            await api.patch(`/medicines/${medicine.id}/batches/${batchId}`, { stock_qty: editStockQty });
            setEditingBatchId(null);
            await loadBatches();
            refreshMedicineInStore();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update stock');
        }
    };

    const refreshMedicineInStore = async () => {
        // To sync the frontend, calculate new totals locally and update the store softly
        if (!medicine) return;
        try {
            const res = await api.get(`/medicines/${medicine.id}/batches`);
            const updatedBatches = res.data;
            const totalStock = updatedBatches.reduce((sum: number, b: any) => sum + b.stock_qty, 0);
            const earliestExpiry = updatedBatches.length > 0 ? updatedBatches[0].expiry_date : null;
            updateMedicine(medicine.id, { stock_qty: totalStock, expiry_date: earliestExpiry });
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen || !medicine) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <PackagePlus size={22} className="text-indigo-600" />
                            Manage Batches
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">{medicine.name} — {medicine.brand}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">

                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Current Batches</h3>
                        {!showAdd && (
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg transition-colors border border-indigo-200 scale-95"
                            >
                                <Plus size={14} /> Add new batch
                            </button>
                        )}
                    </div>

                    {showAdd && (
                        <form onSubmit={handleAddBatch} className="mb-6 p-4 bg-white border border-indigo-100 rounded-xl shadow-sm">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Batch No.</label>
                                    <input type="text" required autoFocus
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 block"
                                        value={newBatch.batch_no} onChange={e => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Expiry (YYYY-MM)</label>
                                    <input type="month" required
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 block"
                                        value={newBatch.expiry_date} onChange={e => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stock Qty</label>
                                    <input type="number" required min="1"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 block"
                                        value={newBatch.stock_qty || ''} onChange={e => setNewBatch({ ...newBatch, stock_qty: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={adding} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                                    {adding ? 'Saving...' : 'Save Batch'}
                                </button>
                            </div>
                        </form>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                            <PackagePlus size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-500">No active batches found.</p>
                            <p className="text-xs text-slate-400 mt-1">Add a batch to increase stock.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Batch No</th>
                                        <th className="px-4 py-3">Expiry Date</th>
                                        <th className="px-4 py-3 text-right">Available Stock</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {batches.map(b => {
                                        const exp = new Date(b.expiry_date);
                                        const isExpiring = exp.getTime() < new Date().setDate(new Date().getDate() + 90);
                                        return (
                                            <tr key={b.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-bold text-slate-700 font-mono">{b.batch_no}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${isExpiring ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-600'}`}>
                                                        {isExpiring && <AlertTriangle size={12} />}
                                                        {exp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {editingBatchId === b.id ? (
                                                        <input
                                                            type="number" min="0" autoFocus
                                                            className="w-20 text-right px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold block ml-auto"
                                                            value={editStockQty} onChange={e => setEditStockQty(parseInt(e.target.value) || 0)}
                                                            onKeyDown={e => e.key === 'Enter' && handleUpdateStock(b.id)}
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-slate-900">{b.stock_qty}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingBatchId === b.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => setEditingBatchId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-100"><X size={14} /></button>
                                                            <button onClick={() => handleUpdateStock(b.id)} className="p-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded border border-emerald-200"><Save size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setEditingBatchId(b.id); setEditStockQty(b.stock_qty); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                                            Adjust
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5"><CalendarClock size={14} className="text-indigo-400" /> Batches are dispatched on Earliest-Expiry-First basis.</span>
                    <button onClick={onClose} className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors">
                        Done
                    </button>
                </div>

            </div>
        </div>
        , document.body);
};
