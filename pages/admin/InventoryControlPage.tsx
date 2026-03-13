import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, PackageSearch } from 'lucide-react';
import api from '../../utils/api';

export const InventoryControlPage = () => {
  const [days, setDays] = useState(45);
  const [data, setData] = useState<{ nearExpiry: any[]; expired: any[] }>({ nearExpiry: [], expired: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/control/inventory/expiry?days=${days}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const totalAtRiskQty = useMemo(() => [...data.nearExpiry, ...data.expired].reduce((s, b) => s + (b.stock_qty || 0), 0), [data]);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Inventory and Expiry Control</h2>
        <p className="text-sm text-slate-500">Platform-wide expiry risk tracking by batch and wholesaler.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Near Expiry</p><p className="text-lg font-extrabold text-amber-600">{data.nearExpiry.length}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Expired Batches</p><p className="text-lg font-extrabold text-rose-600">{data.expired.length}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">At-Risk Quantity</p><p className="text-lg font-extrabold text-slate-900">{totalAtRiskQty}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Threshold Days</p><div className="mt-1"><input type="number" min={1} value={days} onChange={e => setDays(parseInt(e.target.value || '45', 10))} className="w-20 border rounded px-2 py-1 text-sm" /></div></div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="text-sm font-bold">Near Expiry Batches</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Medicine</th><th className="p-3 text-left">Wholesaler</th><th className="p-3 text-left">Batch</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Expiry</th></tr></thead>
            <tbody>
              {data.nearExpiry.map(b => (
                <tr key={b.id} className="border-t"><td className="p-3">{b.medicine?.name}</td><td className="p-3">{b.medicine?.wholesaler?.name || 'Catalog'}</td><td className="p-3">{b.batch_no}</td><td className="p-3 text-right">{b.stock_qty}</td><td className="p-3 text-right text-amber-700 font-semibold">{new Date(b.expiry_date).toLocaleDateString('en-IN')}</td></tr>
              ))}
              {data.nearExpiry.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No near-expiry items in selected horizon.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="text-sm font-bold">Expired Batches</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Medicine</th><th className="p-3 text-left">Wholesaler</th><th className="p-3 text-left">Batch</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Expiry</th></tr></thead>
            <tbody>
              {data.expired.map(b => (
                <tr key={b.id} className="border-t"><td className="p-3">{b.medicine?.name}</td><td className="p-3">{b.medicine?.wholesaler?.name || 'Catalog'}</td><td className="p-3">{b.batch_no}</td><td className="p-3 text-right">{b.stock_qty}</td><td className="p-3 text-right text-rose-700 font-semibold">{new Date(b.expiry_date).toLocaleDateString('en-IN')}</td></tr>
              ))}
              {data.expired.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No expired batches detected.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-4 text-sm inline-flex items-center gap-2"><PackageSearch size={14} /> Centralized expiry surveillance is now active from admin.</div>
    </div>
  );
};
