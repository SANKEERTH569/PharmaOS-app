import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee, CheckCircle, Send, ChevronDown, MapPin, Banknote, Smartphone, FileText, CreditCard, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  current_balance: number;
}

const METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'BANK_TRANSFER', label: 'Bank', icon: CreditCard },
];

export const SalesmanCollectPage = () => {
  const [searchParams] = useSearchParams();
  const prefilledRetailerId = searchParams.get('retailer') || '';

  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState(prefilledRetailerId);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const selected = retailers.find(r => r.id === selectedRetailer);

  const fetchData = useCallback(async () => {
    try {
      const [beatRes, reportRes] = await Promise.all([
        api.get('/beat-routes'),
        api.get('/call-reports', { params: { outcome: 'PAYMENT_COLLECTED' } }),
      ]);
      const all: Retailer[] = [];
      const seen = new Set<string>();
      for (const beat of beatRes.data) {
        for (const br of beat.retailers) {
          if (!seen.has(br.retailer.id)) {
            seen.add(br.retailer.id);
            all.push(br.retailer);
          }
        }
      }
      setRetailers(all);
      setRecentCollections(reportRes.data.filter((r: any) => r.outcome === 'PAYMENT_COLLECTED').slice(0, 5));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsLoading(false); },
      () => { alert('Location denied'); setGpsLoading(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailer || !amount || parseFloat(amount) <= 0) return alert('Fill all required fields');
    setSubmitting(true);
    try {
      await api.post('/call-reports', {
        retailer_id: selectedRetailer,
        outcome: 'PAYMENT_COLLECTED',
        payment_amount: parseFloat(amount),
        payment_method: method,
        notes: notes || null,
        lat,
        lng,
      });
      setSubmitted(true);
      setAmount('');
      setNotes('');
      setLat(null);
      setLng(null);
      setTimeout(() => setSubmitted(false), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to log collection');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 max-w-md mx-auto min-h-screen bg-slate-50/50">

      {/* Success toast */}
      {submitted && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl shadow-emerald-500/30 flex items-center gap-2.5 font-bold text-sm transform transition-all duration-300">
          <CheckCircle size={18} /> Collection recorded!
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Collect Payment</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Log cash or UPI collected from a shop.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Retailer selector */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Medical Shop</label>
          <div className="relative">
            <select
              required
              className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100/50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all pr-12 text-sm shadow-sm"
              value={selectedRetailer}
              onChange={e => setSelectedRetailer(e.target.value)}
            >
              <option value="">Select shop...</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.shop_name}{r.current_balance > 0 ? ` — ₹${r.current_balance} due` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center pointer-events-none">
              <ChevronDown className="text-slate-500 w-4 h-4" />
            </div>
          </div>

          {/* Balance preview */}
          {selected && (
            <div className={`mt-4 rounded-2xl p-4 flex items-center justify-between border ${selected.current_balance > 0 ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <div>
                <p className="font-bold text-slate-900 text-[15px] tracking-tight">{selected.shop_name}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{selected.name}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black tracking-tight ${selected.current_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ₹{selected.current_balance.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mt-0.5">
                  {selected.current_balance > 0 ? 'outstanding' : 'no dues'}
                </p>
              </div>
            </div>
          )}
          {selected && selected.current_balance > 0 && (
            <button
              type="button"
              onClick={() => setAmount(selected.current_balance.toFixed(0))}
              className="mt-3 w-full py-2.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all border border-red-200 shadow-sm active:scale-[0.98]"
            >
              Use full amount (₹{selected.current_balance.toLocaleString()}) →
            </button>
          )}
        </div>

        {/* Amount input */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Amount Collected</label>
          <div className="relative bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-inner">
            <span className="pl-5 text-3xl font-black text-indigo-300 shrink-0">₹</span>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              className="flex-1 pl-2 pr-5 py-5 bg-transparent font-black text-slate-900 text-4xl focus:outline-none tracking-tighter"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Method</label>
          <div className="grid grid-cols-4 gap-3">
            {METHODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
                  method === m.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                }`}
              >
                <m.icon size={22} className={method === m.value ? 'text-white' : ''} />
                <span className="text-[10px] font-bold tracking-wide uppercase">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes & GPS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes & Location</label>
            <p className="text-[10px] font-medium text-slate-400 mb-3">(optional)</p>
          </div>
          <textarea
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none text-slate-800 shadow-sm"
            rows={2}
            placeholder="Cheque no., transaction ID, remarks..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            type="button"
            onClick={getGps}
            disabled={gpsLoading}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              lat ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
            }`}
          >
            <MapPin size={16} />
            {gpsLoading ? 'Getting location...' : lat ? '✓ Location captured' : 'Capture GPS location'}
          </button>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white font-black text-lg transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <Send size={20} />
            {submitting ? 'Recording...' : amount ? `Record ₹${parseFloat(amount || '0').toLocaleString()} via ${method}` : 'Record Collection'}
          </button>
        </div>
      </form>

      {/* Recent collections */}
      {recentCollections.length > 0 && (
        <div className="pt-4">
          <h3 className="font-bold text-slate-400 text-[11px] mb-3 uppercase tracking-widest px-1">Recent Collections</h3>
          <div className="space-y-3">
            {recentCollections.map((c: any, i) => (
              <div key={c.id || i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <IndianRupee size={20} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[15px] tracking-tight truncate">{c.retailer?.shop_name || '—'}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {new Date(c.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    {c.payment_method ? ` • ${c.payment_method}` : ''}
                  </p>
                </div>
                <p className="font-black text-lg text-slate-900 tracking-tight shrink-0">₹{c.payment_amount?.toLocaleString() || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
