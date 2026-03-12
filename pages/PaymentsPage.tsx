
import React, { useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  CheckCircle, XCircle, Clock, Download,
  IndianRupee, TrendingUp, Wallet, Plus, X,
  Search, Filter, Calendar, CreditCard, Banknote,
  Smartphone, Building2, ArrowUpRight,
} from 'lucide-react';
import { PaymentMethod } from '../types';

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={14} className="text-emerald-600" />,
  UPI: <Smartphone size={14} className="text-violet-600" />,
  CHEQUE: <CreditCard size={14} className="text-blue-600" />,
  BANK_TRANSFER: <Building2 size={14} className="text-indigo-600" />,
};
const METHOD_BG: Record<PaymentMethod, string> = {
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  UPI: 'bg-violet-50 text-violet-700 border-violet-100',
  CHEQUE: 'bg-blue-50 text-blue-700 border-blue-100',
  BANK_TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

export const PaymentsPage = () => {
  const { payments, retailers, recordPayment } = useDataStore();
  const { wholesaler } = useAuthStore();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterRetailer, setFilterRetailer] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Record Payment Modal ─────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [formRetailer, setFormRetailer] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('CASH');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Computed stats ───────────────────────────────────────────────────────
  const myPayments = useMemo(
    () => payments.filter(p => p.wholesaler_id === wholesaler?.id),
    [payments, wholesaler?.id]
  );

  const totalCollected = myPayments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
  const thisMonth = myPayments.filter(p => p.status === 'COMPLETED' && new Date(p.created_at) >= startOfMonth()).reduce((s, p) => s + p.amount, 0);
  const today = myPayments.filter(p => p.status === 'COMPLETED' && new Date(p.created_at) >= startOfToday()).reduce((s, p) => s + p.amount, 0);
  const pending = myPayments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);

  const filtered = useMemo(() => {
    return [...myPayments]
      .filter(p => {
        if (filterRetailer !== 'ALL' && p.retailer_id !== filterRetailer) return false;
        if (filterMethod !== 'ALL' && p.method !== filterMethod) return false;
        if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
        if (search && !p.retailer_name.toLowerCase().includes(search.toLowerCase()) &&
          !p.id.toLowerCase().includes(search.toLowerCase()) &&
          !(p.notes?.toLowerCase().includes(search.toLowerCase()))) return false;
        if (dateFrom) {
          const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
          if (new Date(p.created_at) < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
          if (new Date(p.created_at) > to) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [myPayments, filterRetailer, filterMethod, filterStatus, search, dateFrom, dateTo]);

  const handleExport = () => {
    const header = 'Payment ID,Retailer,Date,Method,Amount,Status,Notes';
    const rows = filtered.map(p =>
      `${p.id},"${p.retailer_name}",${new Date(p.created_at).toLocaleDateString()},${p.method},${p.amount},${p.status},"${p.notes || ''}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRetailer || !formAmount || !wholesaler) return;
    setSubmitting(true);
    try {
      await recordPayment(formRetailer, parseFloat(formAmount), formMethod, wholesaler.id, formNotes || undefined);
      setShowAdd(false);
      setFormRetailer(''); setFormAmount(''); setFormMethod('CASH'); setFormNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (d: string) => {
    const dt = new Date(d);
    return {
      date: dt.toLocaleDateString('en-IN'),
      time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const activeRetailers = retailers.filter(r => r.is_active);

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Track all received payments for <span className="font-bold text-slate-700">{wholesaler?.name}</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all"
          >
            <Plus size={15} /> Record Payment
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: totalCollected, icon: <Wallet size={18} />, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'This Month', value: thisMonth, icon: <Calendar size={18} />, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Today', value: today, icon: <ArrowUpRight size={18} />, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Pending Clearance', value: pending, icon: <TrendingUp size={18} />, gradient: 'from-amber-500 to-orange-600' },
        ].map(({ label, value, icon, gradient }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search retailer, ID, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 w-full font-medium"
          />
        </div>

        {[
          {
            value: filterRetailer, onChange: setFilterRetailer,
            options: [{ v: 'ALL', l: 'All Retailers' }, ...activeRetailers.map(r => ({ v: r.id, l: r.shop_name }))],
          },
          {
            value: filterMethod, onChange: setFilterMethod,
            options: [{ v: 'ALL', l: 'All Methods' }, { v: 'CASH', l: 'Cash' }, { v: 'UPI', l: 'UPI' }, { v: 'CHEQUE', l: 'Cheque' }, { v: 'BANK_TRANSFER', l: 'Bank Transfer' }],
          },
          {
            value: filterStatus, onChange: setFilterStatus,
            options: [{ v: 'ALL', l: 'All Status' }, { v: 'COMPLETED', l: 'Completed' }, { v: 'PENDING', l: 'Pending' }, { v: 'FAILED', l: 'Failed' }],
          },
        ].map((sel, i) => (
          <div key={i} className="relative">
            <select
              value={sel.value}
              onChange={e => sel.onChange(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200/80 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 appearance-none font-bold text-slate-700 shadow-sm transition-all"
            >
              {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <Filter className="absolute right-2 top-2.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        ))}

        <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 font-medium w-[130px]"
            title="From date"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 font-medium w-[130px]"
            title="To date"
          />
        </div>

        {(search || filterRetailer !== 'ALL' || filterMethod !== 'ALL' || filterStatus !== 'ALL' || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setFilterRetailer('ALL'); setFilterMethod('ALL'); setFilterStatus('ALL'); setDateFrom(''); setDateTo(''); }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-2 bg-rose-50 rounded-xl border border-rose-100 transition-colors"
          >
            <X size={13} /> Clear filters
          </button>
        )}

        <span className="ml-auto text-xs font-bold text-slate-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Payment ID</th>
                <th className="px-6 py-4 font-bold tracking-wider">Retailer</th>
                <th className="px-6 py-4 font-bold tracking-wider">Date & Time</th>
                <th className="px-6 py-4 font-bold tracking-wider">Method</th>
                <th className="px-6 py-4 font-bold tracking-wider">Notes</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((payment) => {
                const { date, time } = fmt(payment.created_at);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400 text-xs tracking-wide">
                      #{payment.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{payment.retailer_name}</td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 font-medium">{date}</p>
                      <p className="text-xs text-slate-400">{time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${METHOD_BG[payment.method]}`}>
                        {METHOD_ICONS[payment.method]}
                        {payment.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-[160px] truncate">
                      {payment.notes || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                        ${payment.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          payment.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {payment.status === 'COMPLETED' ? <CheckCircle size={12} /> :
                          payment.status === 'FAILED' ? <XCircle size={12} /> : <Clock size={12} />}
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <IndianRupee size={28} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-lg">No payments found</p>
              <p className="text-slate-400 text-sm mt-1">
                {myPayments.length === 0
                  ? 'Use "Record Payment" above to log a collected payment.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Record Payment Modal ── */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0D2B5E] flex items-center justify-center">
                  <IndianRupee size={16} className="text-white" />
                </div>
                <span className="font-bold text-slate-800">Record Payment</span>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Retailer *</label>
                <select
                  required
                  value={formRetailer}
                  onChange={e => setFormRetailer(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  <option value="">Select retailer…</option>
                  {activeRetailers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.shop_name}{r.current_balance > 0 ? ` (Due: ₹${r.current_balance.toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${formMethod === m
                        ? 'bg-[#0D2B5E] text-white border-[#0D2B5E] shadow'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {METHOD_ICONS[m]}
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cheque no., UTR, remarks…"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[#0D2B5E] text-white rounded-xl text-sm font-bold hover:bg-[#0a2147] disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
