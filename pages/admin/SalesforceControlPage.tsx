import React, { useEffect, useState } from 'react';
import { Loader2, ToggleLeft, ToggleRight, Users2 } from 'lucide-react';
import api from '../../utils/api';

export const SalesforceControlPage = () => {
  const [summary, setSummary] = useState<any>(null);
  const [reps, setReps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        api.get('/admin/control/salesforce/summary'),
        api.get('/admin/control/salesforce/reps'),
      ]);
      setSummary(sRes.data);
      setReps(rRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, is_active: boolean) => {
    await api.patch(`/admin/control/salesforce/reps/${id}/toggle`, { is_active: !is_active });
    await load();
  };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Salesforce Control</h2>
        <p className="text-sm text-slate-500">Track MR/salesman performance and enforce activation governance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Total MRs</p><p className="text-lg font-extrabold">{summary?.totalSalesmen || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Active</p><p className="text-lg font-extrabold text-emerald-600">{summary?.activeSalesmen || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Pending Links</p><p className="text-lg font-extrabold text-amber-600">{summary?.pendingLinks || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Calls This Month</p><p className="text-lg font-extrabold text-indigo-600">{summary?.callsThisMonth || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Orders by MRs</p><p className="text-lg font-extrabold text-violet-600">{summary?.ordersBySalesmen || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Targets Configured</p><p className="text-lg font-extrabold text-slate-900">{summary?.targetsConfigured || 0}</p></div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="text-sm font-bold">MR Registry ({reps.length})</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Wholesaler</th><th className="p-3 text-right">Calls MTD</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Beat Routes</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Action</th></tr>
            </thead>
            <tbody>
              {reps.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.name}<div className="text-xs text-slate-400">{r.phone}</div></td>
                  <td className="p-3">{r.wholesaler?.name || 'Unassigned'}</td>
                  <td className="p-3 text-right">{r.callsThisMonth || 0}</td>
                  <td className="p-3 text-right">{r._count?.orders || 0}</td>
                  <td className="p-3 text-right">{r._count?.beat_routes || 0}</td>
                  <td className="p-3 text-center"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td className="p-3 text-center"><button onClick={() => toggle(r.id, r.is_active)} className="p-1 rounded hover:bg-slate-100">{r.is_active ? <ToggleRight className="text-emerald-500" /> : <ToggleLeft className="text-slate-400" />}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-4 text-sm inline-flex items-center gap-2"><Users2 size={14} /> Direct MR activation control is enabled for super-admin.</div>
    </div>
  );
};
