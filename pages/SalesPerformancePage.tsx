import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, X } from 'lucide-react';
import api from '../utils/api';
import { SalesmanPerformance } from '../types';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5 mt-1">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${color === 'blue' ? 'bg-blue-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export const SalesPerformancePage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<SalesmanPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetModal, setTargetModal] = useState<SalesmanPerformance | null>(null);
  const [targetForm, setTargetForm] = useState({ order_target: 0, collection_target: 0, new_retailers_target: 0 });
  const [savingTarget, setSavingTarget] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/performance', { params: { month, year } });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const openTargetModal = (row: SalesmanPerformance) => {
    setTargetModal(row);
    setTargetForm({
      order_target: row.target?.order_target || 0,
      collection_target: row.target?.collection_target || 0,
      new_retailers_target: row.target?.new_retailers_target || 0,
    });
  };

  const saveTarget = async () => {
    if (!targetModal) return;
    setSavingTarget(true);
    try {
      await api.post(`/performance/${targetModal.salesman.id}/targets`, { month, year, ...targetForm });
      await fetchData();
      setTargetModal(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save target');
    } finally { setSavingTarget(false); }
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Sales Performance</h1>
          <p className="text-slate-600 font-medium text-lg">Monthly scorecard — target vs achievement.</p>
        </div>
        {/* Month / Year picker */}
        <div className="flex gap-3">
          <select className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <TrendingUp size={56} className="text-slate-300 mb-4" strokeWidth={1.5} />
          <p className="text-2xl font-black text-slate-700 mb-2">No salesmen found</p>
          <p className="text-slate-500">Add salesmen first to track performance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map(row => {
            const visitPct = row.visits_total > 0 ? Math.round((row.visits_with_order / row.visits_total) * 100) : 0;
            return (
              <div key={row.salesman.id} className={`bg-white rounded-3xl border-2 p-6 shadow-sm ${row.salesman.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                      {row.salesman.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">{row.salesman.name}</h3>
                      <p className="text-sm text-slate-500 font-semibold">@{row.salesman.username}</p>
                    </div>
                  </div>
                  <button onClick={() => openTargetModal(row)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200">
                    <Target size={16} /> Set Target
                  </button>
                </div>

                {/* KPI rows */}
                <div className="space-y-4">
                  {/* Orders */}
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-slate-600">Orders Value</span>
                      <div className="text-right">
                        <span className="font-black text-blue-800 text-lg">₹{row.orders_value.toLocaleString()}</span>
                        {row.target && <span className="text-xs text-slate-400 font-semibold ml-2">/ ₹{row.target.order_target.toLocaleString()}</span>}
                      </div>
                    </div>
                    <ProgressBar value={row.orders_value} target={row.target?.order_target || 0} color="blue" />
                    {row.target && row.target.order_target > 0 && (
                      <p className="text-xs text-blue-600 font-bold mt-1">
                        {Math.round((row.orders_value / row.target.order_target) * 100)}% achieved
                      </p>
                    )}
                  </div>

                  {/* Collections */}
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-slate-600">Collections</span>
                      <div className="text-right">
                        <span className="font-black text-emerald-800 text-lg">₹{row.collections_value.toLocaleString()}</span>
                        {row.target && <span className="text-xs text-slate-400 font-semibold ml-2">/ ₹{row.target.collection_target.toLocaleString()}</span>}
                      </div>
                    </div>
                    <ProgressBar value={row.collections_value} target={row.target?.collection_target || 0} color="emerald" />
                  </div>

                  {/* Visits */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total Visits', value: row.visits_total, color: 'text-slate-700' },
                        { label: 'Orders', value: row.visits_with_order, color: 'text-emerald-700' },
                        { label: 'No Order', value: row.visits_no_order, color: 'text-amber-700' },
                      ].map(s => (
                        <div key={s.label} className="text-center bg-slate-50 rounded-2xl p-3">
                          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {row.visits_total > 0 && (
                      <p className="text-xs text-slate-500 font-semibold mt-2 text-center">
                        {visitPct}% visit-to-order conversion
                      </p>
                    )}
                  </div>

                  {/* New retailers */}
                  <div className="flex items-center justify-between bg-purple-50 rounded-2xl p-3 border border-purple-100">
                    <span className="text-sm font-bold text-purple-700">New Retailers Onboarded</span>
                    <div className="text-right">
                      <span className="font-black text-purple-800 text-lg">{row.new_retailers}</span>
                      {row.target && <span className="text-xs text-purple-400 font-semibold ml-1">/ {row.target.new_retailers_target}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Target modal */}
      {targetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border-2 border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Set Monthly Target</h2>
                <p className="text-sm text-slate-500 font-semibold">{targetModal.salesman.name} · {months[month - 1]} {year}</p>
              </div>
              <button onClick={() => setTargetModal(null)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5">
              {[
                { label: 'Order Target (₹)', key: 'order_target', prefix: '₹' },
                { label: 'Collection Target (₹)', key: 'collection_target', prefix: '₹' },
                { label: 'New Retailers Target', key: 'new_retailers_target', prefix: '#' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{f.prefix}</span>
                    <input type="number" min="0" className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition-all" value={(targetForm as any)[f.key]} onChange={e => setTargetForm(tf => ({ ...tf, [f.key]: Number(e.target.value) }))} />
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTargetModal(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={saveTarget} disabled={savingTarget} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-60">
                  {savingTarget ? 'Saving...' : 'Save Targets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
