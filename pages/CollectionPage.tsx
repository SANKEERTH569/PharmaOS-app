
import React, { useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  IndianRupee, Calendar, Wallet, CheckCircle, X,
  Banknote, Smartphone, CreditCard, Building2,
  ChevronDown, ChevronUp, Clock, TrendingDown,
  AlertTriangle, Users, ArrowDownCircle,
} from 'lucide-react';
import { PaymentMethod } from '../types';

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={13} className="text-emerald-600" />,
  UPI: <Smartphone size={13} className="text-violet-600" />,
  CHEQUE: <CreditCard size={13} className="text-blue-600" />,
  BANK_TRANSFER: <Building2 size={13} className="text-indigo-600" />,
};
const METHOD_BG: Record<PaymentMethod, string> = {
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  UPI: 'bg-violet-50 text-violet-700 border-violet-100',
  CHEQUE: 'bg-blue-50 text-blue-700 border-blue-100',
  BANK_TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

function daysSince(dateStr?: string) {
  if (!dateStr) return null;
  const diff = new Date().getTime() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 3600 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

type Tab = 'outstanding' | 'cleared' | 'all';

export const CollectionPage = () => {
  const { retailers, payments, recordPayment } = useDataStore();
  const { wholesaler } = useAuthStore();

  const [tab, setTab] = useState<Tab>('outstanding');
  const [selectedRetailerId, setSelected] = useState<string | null>(null);
  const [expandedRetailerId, setExpanded] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justPaid, setJustPaid] = useState<string | null>(null);

  // ── Per-retailer payment history from store ────────────────────────────
  const myPayments = useMemo(
    () => payments.filter(p => p.wholesaler_id === wholesaler?.id && p.status === 'COMPLETED'),
    [payments, wholesaler?.id]
  );

  const paymentsByRetailer = useMemo(() => {
    const map = new Map<string, typeof myPayments>();
    for (const p of myPayments) {
      const list = map.get(p.retailer_id) || [];
      map.set(p.retailer_id, [...list, p]);
    }
    return map;
  }, [myPayments]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const activeRetailers = retailers.filter(r => r.is_active);
  const outstanding = activeRetailers.filter(r => r.current_balance > 0);
  const cleared = activeRetailers.filter(r => r.current_balance === 0);
  const totalOutstanding = outstanding.reduce((s, r) => s + r.current_balance, 0);
  const overdueRetailers = outstanding.filter(r => r.current_balance > r.credit_limit * 0.8);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const collectedToday = myPayments
    .filter(p => new Date(p.created_at) >= today)
    .reduce((s, p) => s + p.amount, 0);

  // ── Filtered list based on tab ────────────────────────────────────────
  const displayList = useMemo(() => {
    const list =
      tab === 'outstanding' ? outstanding :
        tab === 'cleared' ? cleared :
          [...activeRetailers];
    return [...list].sort((a, b) => b.current_balance - a.current_balance);
  }, [tab, outstanding, cleared, activeRetailers]);

  // ── Handle collect ────────────────────────────────────────────────────
  const selectedRetailer = selectedRetailerId
    ? retailers.find(r => r.id === selectedRetailerId)
    : null;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId || !amount || !wholesaler) return;
    setSubmitting(true);
    try {
      await recordPayment(
        selectedRetailerId,
        parseFloat(amount),
        method,
        wholesaler.id,
        notes || 'Collection Entry',
      );
      setJustPaid(selectedRetailerId);
      setSelected(null);
      setAmount('');
      setMethod('CASH');
      setNotes('');
      setTimeout(() => setJustPaid(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Collection Management</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Track outstanding dues and record payments from retailers.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Outstanding', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, icon: <Wallet size={18} />, gradient: 'from-rose-500 to-pink-600' },
          { label: 'Collected Today', value: `₹${collectedToday.toLocaleString('en-IN')}`, icon: <ArrowDownCircle size={18} />, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Pending Retailers', value: `${outstanding.length} retailers`, icon: <TrendingDown size={18} />, gradient: 'from-amber-500 to-orange-600' },
          { label: 'Cleared Retailers', value: `${cleared.length} retailers`, icon: <Users size={18} />, gradient: 'from-blue-500 to-indigo-600' },
        ].map(({ label, value, icon, gradient }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-fit">
        {([
          { key: 'outstanding', label: `Outstanding (${outstanding.length})` },
          { key: 'cleared', label: `Cleared (${cleared.length})` },
          { key: 'all', label: `All Retailers (${activeRetailers.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Retailer</th>
                <th className="px-6 py-4 font-bold tracking-wider">Credit Utilization</th>
                <th className="px-6 py-4 font-bold tracking-wider">Last Payment</th>
                <th className="px-6 py-4 font-bold tracking-wider">Total Paid</th>
                <th className="px-6 py-4 text-right font-bold tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((retailer) => {
                const retailerPayments = (paymentsByRetailer.get(retailer.id) || [])
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const lastPmt = retailerPayments[0];
                const totalPaid = retailerPayments.reduce((s, p) => s + p.amount, 0);
                const usePct = retailer.credit_limit > 0
                  ? Math.min((retailer.current_balance / retailer.credit_limit) * 100, 100)
                  : 0;
                const isOverdue = retailer.current_balance > retailer.credit_limit * 0.8;
                const isCleared = retailer.current_balance === 0;
                const isExpanded = expandedRetailerId === retailer.id;
                const wasJustPaid = justPaid === retailer.id;

                return (
                  <React.Fragment key={retailer.id}>
                    <tr
                      className={`border-t border-slate-50 transition-colors ${wasJustPaid ? 'bg-emerald-50' : 'hover:bg-slate-50/50'}`}
                    >
                      {/* Retailer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                            ${isCleared ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-[#0D2B5E]'}`}>
                            {retailer.shop_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{retailer.shop_name}</p>
                              {isOverdue && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full"><AlertTriangle size={9} /> Overdue</span>}
                              {isCleared && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full"><CheckCircle size={9} /> Cleared</span>}
                              {wasJustPaid && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">✓ Payment Recorded</span>}
                            </div>
                            <p className="text-xs text-slate-400">{retailer.name} · {retailer.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Credit utilization */}
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className={`font-black text-base ${isCleared ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                            ₹{retailer.current_balance.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            / ₹{retailer.credit_limit.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isCleared ? 'bg-emerald-400' : isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${usePct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{usePct.toFixed(0)}% utilized</p>
                      </td>

                      {/* Last payment */}
                      <td className="px-6 py-4">
                        {lastPmt ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${METHOD_BG[lastPmt.method]}`}>
                                {METHOD_ICONS[lastPmt.method]} {lastPmt.method.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                              ₹{lastPmt.amount.toLocaleString('en-IN')} · <span className="text-slate-400">{daysSince(lastPmt.created_at)}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                            <Clock size={12} /> Never paid
                          </span>
                        )}
                      </td>

                      {/* Total paid */}
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">₹{totalPaid.toLocaleString('en-IN')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{retailerPayments.length} payment{retailerPayments.length !== 1 ? 's' : ''}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {retailerPayments.length > 0 && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : retailer.id)}
                              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0D2B5E] px-2.5 py-2 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                              title="View payment history"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              History
                            </button>
                          )}
                          <button
                            onClick={() => { setSelected(retailer.id); setAmount(String(retailer.current_balance || '')); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${isCleared
                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                : 'bg-[#0D2B5E] text-white hover:bg-[#0a2147]'
                              }`}
                          >
                            {isCleared ? 'Advance' : 'Collect'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline payment history ── */}
                    {isExpanded && retailerPayments.length > 0 && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={5} className="px-6 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Payment History — {retailer.shop_name}
                          </p>
                          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                            {retailerPayments.map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${METHOD_BG[p.method]}`}>
                                    {METHOD_ICONS[p.method]} {p.method.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-slate-500">{fmtDate(p.created_at)}</span>
                                  {p.notes && p.notes !== 'Collection Entry' && (
                                    <span className="text-xs text-slate-400 italic truncate max-w-[180px]">{p.notes}</span>
                                  )}
                                </div>
                                <span className="font-black text-emerald-600 text-sm">
                                  +₹{p.amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {displayList.length === 0 && (
            <div className="py-20 text-center">
              <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-bold text-slate-700 text-lg">
                {tab === 'outstanding' ? 'All cleared! No outstanding dues.' : 'No retailers found.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Collect Payment Modal ── */}
      {selectedRetailerId && selectedRetailer && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <p className="font-black text-slate-900">Collect Payment</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRetailer.shop_name}
                  {selectedRetailer.current_balance > 0 &&
                    <span className="ml-1.5 text-rose-600 font-bold">· Due: ₹{selectedRetailer.current_balance.toLocaleString('en-IN')}</span>
                  }
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-6 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Collected (₹) *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-900"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
                {selectedRetailer.current_balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(selectedRetailer.current_balance))}
                    className="mt-1.5 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Use full due amount (₹{selectedRetailer.current_balance.toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${method === m
                          ? 'bg-[#0D2B5E] text-white border-[#0D2B5E] shadow'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {METHOD_ICONS[m]} {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reference / Notes</label>
                <input
                  type="text"
                  placeholder="Cheque no., UPI ref, UTR, remarks…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              <div className="pt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#0D2B5E] text-white font-bold hover:bg-[#0a2147] rounded-xl shadow-lg disabled:opacity-50 transition-colors text-sm"
                >
                  {submitting ? 'Recording…' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
