import React, { useState, useEffect, useCallback } from 'react';
import { Phone, MapPin, AlertCircle, Package, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface TodayBeat {
  beat: { id: string; name: string };
  retailers: {
    retailer: { id: string; name: string; shop_name: string; phone: string; address?: string; current_balance: number };
    visit: { outcome: string; payment_amount?: number } | null;
  }[];
}

const OUTCOME_STYLE: Record<string, { label: string; bg: string; text: string; dot: string; border?: string }> = {
  ORDER_TAKEN: { label: 'Order Taken', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  PAYMENT_COLLECTED: { label: 'Payment Collected', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  NO_ORDER: { label: 'No Order', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  NOT_VISITED: { label: 'Pending', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300', border: 'border-slate-200' },
};

const R = 36;
const C = 2 * Math.PI * R;

function ProgressRing({ pct }: { pct: number }) {
  const offset = C * (1 - pct / 100);
  return (
    <svg width="86" height="86" className="-rotate-90 filter drop-shadow-md">
      <circle cx="43" cy="43" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
      <circle
        cx="43" cy="43" r={R} fill="none"
        stroke="#ffffff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
}

export const SalesmanDashboard = () => {
  const { salesman } = useAuthStore();
  const [beats, setBeats] = useState<TodayBeat[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const fetchBeats = useCallback(async () => {
    try {
      const { data } = await api.get('/call-reports/today');
      setBeats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBeats(); }, [fetchBeats]);

  const totalRetailers = beats.reduce((s, b) => s + b.retailers.length, 0);
  const visited = beats.reduce((s, b) => s + b.retailers.filter(r => r.visit).length, 0);
  const ordersToday = beats.reduce((s, b) => s + b.retailers.filter(r => r.visit?.outcome === 'ORDER_TAKEN').length, 0);
  const pending = totalRetailers - visited;
  const pct = totalRetailers > 0 ? Math.round((visited / totalRetailers) * 100) : 0;

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 max-w-md mx-auto min-h-screen">
      
      {/* Premium Hero Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl shadow-xl shadow-indigo-500/20 p-6 relative overflow-hidden">
        {/* Abstract glowing shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative flex items-center justify-between z-10">
          <div className="flex-1 pr-4">
            <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest mb-1.5 opacity-90">{today}</p>
            <h2 className="text-2xl font-black text-white leading-tight mb-4 tracking-tight">
              {pct === 100 ? 'Beat complete! 🎉' : `${pending} shop${pending !== 1 ? 's' : ''} left`}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Visited</span>
                <span className="text-xl font-black text-white">{visited}<span className="text-indigo-200 text-sm">/{totalRetailers}</span></span>
              </div>
              <div className="w-px h-8 bg-white/20 rounded-full"></div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Orders</span>
                <span className="text-xl font-black text-white">{ordersToday}</span>
              </div>
            </div>
          </div>
          <div className="relative shrink-0 flex items-center justify-center bg-white/10 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-inner">
            <ProgressRing pct={pct} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white tracking-tighter">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Quick Action */}
      <Link
        to="/salesman/order"
        className="group relative overflow-hidden flex items-center gap-4 bg-white rounded-3xl p-4 transition-all duration-300 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-500/10 border border-slate-100 hover:border-indigo-100 active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
          <Package size={24} className="text-white" />
        </div>
        <div className="relative z-10 flex-1">
          <p className="font-bold text-base text-slate-900 leading-tight">Create New Order</p>
          <p className="text-slate-500 text-xs font-medium mt-1">Select shop & add medicines</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
          <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      </Link>

      {/* Beat-wise retailer list */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg" />
          </div>
        ) : beats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <AlertCircle size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-lg">No territory assigned</p>
            <p className="text-sm text-slate-500 mt-1 text-center px-8 font-medium">Ask your manager to assign you a beat route.</p>
          </div>
        ) : (
        beats.map(b => (
          <div key={b.beat.id} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{b.beat.name}</span>
              </div>
              <span className="text-xs text-slate-500 font-bold bg-white shadow-sm border border-slate-200 px-3 py-1 rounded-full">
                {b.retailers.filter(r => r.visit).length}/{b.retailers.length} visited
              </span>
            </div>

            <div className="space-y-3">
              {b.retailers.map(({ retailer, visit }) => {
                const status = visit ? (OUTCOME_STYLE[visit.outcome] ?? OUTCOME_STYLE.NOT_VISITED) : null;
                const avatarLetter = retailer.shop_name[0]?.toUpperCase() || '?';
                return (
                  <div
                    key={retailer.id}
                    className={`bg-white rounded-3xl border shadow-sm p-4 transition-all duration-300 ${
                      visit ? 'border-slate-100 opacity-80' : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg shadow-sm ${
                          visit ? 'bg-slate-50 text-slate-400' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
                        }`}
                      >
                        {visit ? <CheckCircle2 size={22} className="text-slate-400" /> : avatarLetter}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-bold text-slate-900 text-[15px] leading-tight truncate tracking-tight">{retailer.shop_name}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">{retailer.name}</p>
                        {retailer.address && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <p className="text-[11px] font-medium text-slate-400 truncate">{retailer.address}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {status ? (
                      <div className={`mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border ${status.bg} ${status.border}`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${status.dot} shadow-sm`} />
                          <span className={`text-[11px] font-bold tracking-wide uppercase ${status.text}`}>{status.label}</span>
                        </div>
                        {visit?.payment_amount && (
                          <span className={`text-xs font-black ${status.text}`}>₹{visit.payment_amount.toLocaleString()}</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2.5">
                        <a
                          href={`tel:${retailer.phone}`}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200 active:scale-95"
                        >
                          <Phone size={14} /> Call
                        </a>
                        <Link
                          to={`/salesman/order?retailer=${retailer.id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                        >
                          <Package size={14} /> Take Order
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
};
