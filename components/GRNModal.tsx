import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, PackageCheck } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { Medicine, PurchaseOrder } from '../types';

interface GRNLineItem {
  medicine_id: string;
  medicine_name: string;
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  unit_cost: number;
}

interface Props {
  onClose: () => void;
  linkedPO?: PurchaseOrder | null;
}

const emptyLine = (): GRNLineItem => ({
  medicine_id: '',
  medicine_name: '',
  batch_no: '',
  expiry_date: '',
  qty_received: 0,
  unit_cost: 0,
});

export const GRNModal = ({ onClose, linkedPO }: Props) => {
  const { medicines, createGRN } = useDataStore();
  const activeMedicines = medicines.filter((m) => m.is_active && m.wholesaler_id);

  const [supplierName, setSupplierName] = useState(linkedPO?.supplier_name ?? '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNLineItem[]>(
    linkedPO
      ? linkedPO.items
          .filter((pi) => pi.medicine_id)
          .map((pi) => ({
            medicine_id: pi.medicine_id ?? '',
            medicine_name: pi.medicine_name,
            batch_no: '',
            expiry_date: '',
            qty_received: pi.qty_ordered - pi.qty_received,
            unit_cost: pi.unit_cost,
          }))
      : [emptyLine()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [medicineSearch, setMedicineSearch] = useState<Record<number, string>>({});

  const updateItem = <K extends keyof GRNLineItem>(
    idx: number,
    key: K,
    value: GRNLineItem[K]
  ) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const selectMedicine = (idx: number, med: Medicine) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              medicine_id: med.id,
              medicine_name: med.name,
              unit_cost: med.price,
            }
          : item
      )
    );
    setMedicineSearch((prev) => ({ ...prev, [idx]: '' }));
  };

  const addLine = () => setItems((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError('');
    if (!supplierName.trim()) return setError('Supplier name is required.');
    for (const [i, item] of items.entries()) {
      if (!item.medicine_id) return setError(`Row ${i + 1}: select a medicine.`);
      if (!item.batch_no.trim()) return setError(`Row ${i + 1}: batch number is required.`);
      if (!item.expiry_date) return setError(`Row ${i + 1}: expiry date is required.`);
      if (item.qty_received <= 0) return setError(`Row ${i + 1}: quantity must be > 0.`);
      if (item.unit_cost < 0) return setError(`Row ${i + 1}: unit cost cannot be negative.`);
    }

    setSaving(true);
    try {
      await createGRN({
        po_id: linkedPO?.id,
        supplier_name: supplierName.trim(),
        notes: notes.trim() || undefined,
        items,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to save GRN.');
    } finally {
      setSaving(false);
    }
  };

  const totalValue = items.reduce(
    (sum, i) => sum + i.qty_received * i.unit_cost,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PackageCheck size={20} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Goods Receipt Note (GRN)
              </h2>
              {linkedPO && (
                <p className="text-xs text-slate-500">
                  Receiving against {linkedPO.po_number} — {linkedPO.supplier_name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Supplier + notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Supplier Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. ABC Pharma Distributors"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice no, delivery challan, remarks..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Items Received
              </span>
              <button
                onClick={addLine}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2 rounded-tl-lg w-48">
                      Medicine
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2 w-28">
                      Batch No.
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2 w-32">
                      Expiry
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 w-20">
                      Qty
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 w-24">
                      Unit Cost (₹)
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2 rounded-tr-lg w-24">
                      Total
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const search = medicineSearch[idx] ?? '';
                    const suggestions =
                      search.length >= 2
                        ? activeMedicines
                            .filter(
                              (m) =>
                                m.name.toLowerCase().includes(search.toLowerCase()) ||
                                (m.brand ?? '').toLowerCase().includes(search.toLowerCase())
                            )
                            .slice(0, 6)
                        : [];

                    return (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        {/* Medicine */}
                        <td className="px-2 py-2 relative">
                          {item.medicine_id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-700 font-medium truncate max-w-[140px]">
                                {item.medicine_name}
                              </span>
                              <button
                                onClick={() => {
                                  updateItem(idx, 'medicine_id', '');
                                  updateItem(idx, 'medicine_name', '');
                                }}
                                className="text-slate-400 hover:text-rose-500"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                value={search}
                                placeholder="Search medicine…"
                                onChange={(e) =>
                                  setMedicineSearch((prev) => ({
                                    ...prev,
                                    [idx]: e.target.value,
                                  }))
                                }
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                              {suggestions.length > 0 && (
                                <ul className="absolute z-30 left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                  {suggestions.map((m) => (
                                    <li
                                      key={m.id}
                                      onClick={() => selectMedicine(idx, m)}
                                      className="px-3 py-1.5 text-xs cursor-pointer hover:bg-emerald-50"
                                    >
                                      <span className="font-medium text-slate-700">{m.name}</span>
                                      <span className="text-slate-400 ml-1">({m.brand})</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Batch */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.batch_no}
                            onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                            placeholder="e.g. B2401"
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>

                        {/* Expiry */}
                        <td className="px-2 py-2">
                          <input
                            type="month"
                            value={item.expiry_date ? item.expiry_date.substring(0, 7) : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(
                                idx,
                                'expiry_date',
                                val ? `${val}-01` : ''
                              );
                            }}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>

                        {/* Qty */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.qty_received || ''}
                            onChange={(e) =>
                              updateItem(idx, 'qty_received', parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>

                        {/* Unit cost */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost || ''}
                            onChange={(e) =>
                              updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)
                            }
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>

                        {/* Total */}
                        <td className="px-3 py-2 text-right text-xs text-slate-700 font-medium">
                          ₹{(item.qty_received * item.unit_cost).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Remove */}
                        <td className="px-1 py-2">
                          {items.length > 1 && (
                            <button
                              onClick={() => removeLine(idx)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Total Value:{' '}
            <span className="font-semibold text-slate-800">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Receive & Add Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
