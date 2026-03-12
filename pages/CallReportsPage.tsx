import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, X, MapPin, CheckCircle, XCircle, DollarSign, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { DailyCallReport, Salesman, CallOutcome } from '../types';

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; color: string }> = {
  ORDER_TAKEN: { label: 'Order Taken', color: 'emerald' },
  PAYMENT_COLLECTED: { label: 'Payment Collected', color: 'blue' },
  NO_ORDER: { label: 'No Order', color: 'amber' },
  NOT_VISITED: { label: 'Not Visited', color: 'slate' },
};

export const CallReportsPage = () => {
  const [reports, setReports] = useState<DailyCallReport[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSalesman, setFilterSalesman] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterSalesman) params.salesman_id = filterSalesman;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const { data } = await api.get('/call-reports', { params });
      setReports(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSalesmen = async () => {
    try {
      const { data } = await api.get('/salesmen');
      setSalesmen(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchSalesmen(); }, []);
  useEffect(() => { fetchReports(); }, [filterSalesman, filterFrom, filterTo]);

  const filtered = reports.filter(r =>
    !search ||
    r.salesman?.name.toLowerCase().includes(search.toLowerCase()) ||
    r.retailer?.name.toLowerCase().includes(search.toLowerCase()) ||
    r.retailer?.shop_name.toLowerCase().includes(search.toLowerCase())
  );

  const outcomeCount = (outcome: CallOutcome) => reports.filter(r => r.outcome === outcome).length;

  const badgeClass = (color: string) => {
    if (color === 'emerald') return 'bg-emerald-100 text-emerald-700';
    if (color === 'blue') return 'bg-blue-100 text-blue-700';
    if (color === 'amber') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Call Reports</h1>
          <p className="text-slate-600 font-medium text-lg">Daily field activity log from your sales team.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {(Object.entries(OUTCOME_CONFIG) as [CallOutcome, { label: string; color: string }][]).map(([key, cfg]) => (
          <div key={key} className={`rounded-2xl p-4 border-2 bg-${cfg.color}-50 border-${cfg.color}-200`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-1 text-${cfg.color}-600`}>{cfg.label}</p>
            <p className={`text-3xl font-black text-${cfg.color}-800`}>{outcomeCount(key)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Salesman</label>
            <select className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500 transition-all" value={filterSalesman} onChange={e => setFilterSalesman(e.target.value)}>
              <option value="">All Salesmen</option>
              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">From</label>
            <input type="date" className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500 transition-all" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">To</label>
            <input type="date" className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500 transition-all" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          {(filterSalesman || filterFrom || filterTo) && (
            <button onClick={() => { setFilterSalesman(''); setFilterFrom(''); setFilterTo(''); }} className="px-4 py-3 text-sm font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 border-2 border-slate-200">
              <X size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input type="text" placeholder="Search by salesman or retailer..." className="w-full pl-14 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <ClipboardList size={56} className="text-slate-300 mb-4" strokeWidth={1.5} />
          <p className="text-2xl font-black text-slate-700 mb-2">No call reports yet</p>
          <p className="text-slate-500">Reports logged by salesmen will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50">
                  {['Salesman', 'Retailer', 'Date', 'Outcome', 'Payment', 'GPS'].map(h => (
                    <th key={h} className="text-left text-xs font-black text-slate-500 uppercase tracking-widest px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => {
                  const cfg = OUTCOME_CONFIG[r.outcome];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm shrink-0">{r.salesman?.name[0] || '?'}</div>
                          <span className="font-bold text-slate-800">{r.salesman?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{r.retailer?.shop_name || '—'}</p>
                        <p className="text-xs text-slate-500">{r.retailer?.name}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-600 text-sm">
                          {new Date(r.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badgeClass(cfg.color)}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.payment_amount ? <span className="font-bold text-blue-700">₹{r.payment_amount.toLocaleString()}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {r.lat && r.lng ? (
                          <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors">
                            <MapPin size={12} /> View
                          </a>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-sm font-semibold text-slate-500">
            Showing {filtered.length} of {reports.length} reports
          </div>
        </div>
      )}
    </div>
  );
};
