import React, { useEffect, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import api from '../../utils/api';

export const CollectionsControlPage = () => {
  const [summary, setSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [risk, setRisk] = useState('all');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ wholesaler_id: '', retailer_id: '', amount: '', action: 'CREDIT', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/admin/control/collections/summary'),
        api.get(`/admin/control/collections/accounts?risk=${risk}`),
      ]);
      setSummary(sRes.data);
      setAccounts(aRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [risk]);

  const submitAdjustment = async () => {
    await api.post('/admin/control/collections/ledger-adjustment', {
      ...form,
      amount: parseFloat(form.amount),
    });
    setForm({ wholesaler_id: '', retailer_id: '', amount: '', action: 'CREDIT', reason: '' });
    await load();
  };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Collections Control</h2>
        <p className="text-sm text-slate-500">Track dues, credit risk and intervene with controlled ledger adjustments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Outstanding</p><p className="text-lg font-extrabold">Rs{(summary?.totalOutstanding || 0).toLocaleString('en-IN')}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Risky Accounts</p><p className="text-lg font-extrabold text-rose-600">{summary?.riskyAccounts || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Overdue Accounts</p><p className="text-lg font-extrabold text-amber-600">{summary?.overdueAccounts || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Collection Rate</p><p className="text-lg font-extrabold text-emerald-600">{Math.round(summary?.collectionRate || 0)}%</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">This Month</p><p className="text-lg font-extrabold text-indigo-600">Rs{(summary?.thisMonthCollection || 0).toLocaleString('en-IN')}</p></div>
      </div>

      <div className="flex gap-2">
        {['all', 'critical', 'high', 'medium', 'low'].map(r => (
          <button key={r} onClick={() => setRisk(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${risk === r ? 'bg-rose-100 text-rose-700' : 'bg-white border text-slate-500'}`}>{r.toUpperCase()}</button>
        ))}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="text-sm font-bold">Account Risk Table ({accounts.length})</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Retailer</th><th className="text-left p-3">Wholesaler</th><th className="text-right p-3">Balance</th><th className="text-right p-3">Credit Limit</th><th className="text-right p-3">Utilization</th><th className="text-center p-3">Risk</th></tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.shop_name || a.name}</td>
                  <td className="p-3">{a.wholesaler?.name || 'N/A'}</td>
                  <td className="p-3 text-right">Rs{(a.current_balance || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right">Rs{(a.credit_limit || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right">{Math.round(a.utilization || 0)}%</td>
                  <td className="p-3 text-center"><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100">{a.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-sm font-bold mb-3">Admin Ledger Adjustment (Hybrid override)</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input placeholder="Wholesaler ID" value={form.wholesaler_id} onChange={e => setForm({ ...form, wholesaler_id: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Retailer ID" value={form.retailer_id} onChange={e => setForm({ ...form, retailer_id: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="border rounded px-3 py-2 text-sm">
            <option value="CREDIT">CREDIT</option>
            <option value="DEBIT">DEBIT</option>
          </select>
          <input placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={submitAdjustment} className="mt-3 px-4 py-2 rounded bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2"><Wallet size={13} /> Apply Adjustment</button>
      </div>
    </div>
  );
};
