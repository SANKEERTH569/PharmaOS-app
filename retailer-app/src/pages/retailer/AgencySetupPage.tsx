import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, CheckCircle2, Store, Star, ArrowRight, Loader2, Building2, Phone, Clock, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { RetailerAgency, WholesalerBasic } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

export const AgencySetupPage = () => {
  const navigate = useNavigate();
  const { retailer } = useAuthStore();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<WholesalerBasic[]>([]);
  const [agencies, setAgencies] = useState<RetailerAgency[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [loadingAgencies, setLoadingAgencies] = useState(true);

  useEffect(() => { fetchAgencies(); }, []);

  const fetchAgencies = async () => {
    try {
      const { data } = await api.get('/retailer/agencies');
      setAgencies(data);
    } catch (err) {
      console.error('Failed to load agencies', err);
    } finally {
      setLoadingAgencies(false);
    }
  };

  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/retailer/agencies/search?q=${encodeURIComponent(search.trim())}`);
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddAgency = async (wholesaler: WholesalerBasic, isPrimary = false) => {
    setAdding(wholesaler.id);
    try {
      const { data } = await api.post('/retailer/agencies', {
        wholesaler_id: wholesaler.id,
        is_primary: isPrimary || agencies.length === 0,
      });
      setAgencies((prev) => [...prev, data]);
      setSearchResults((prev) => prev.filter((w) => w.id !== wholesaler.id));
      setSearch('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add agency');
    } finally { setAdding(null); }
  };

  const handleRemoveAgency = async (wholesaler_id: string) => {
    setRemoving(wholesaler_id);
    try {
      await api.delete(`/retailer/agencies/${wholesaler_id}`);
      setAgencies((prev) => prev.filter((a) => a.wholesaler_id !== wholesaler_id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove agency');
    } finally { setRemoving(null); }
  };

  const handleSetPrimary = async (wholesaler_id: string) => {
    try {
      await api.patch(`/retailer/agencies/${wholesaler_id}/primary`);
      setAgencies((prev) =>
        prev.map((a) => ({ ...a, is_primary: a.wholesaler_id === wholesaler_id }))
      );
    } catch (err) { console.error(err); }
  };

  const hasActive = agencies.some(a => a.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-start justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6 animate-slide-up">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Store size={28} className="text-white relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
            Connect Agencies
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1.5 max-w-sm mx-auto">
            Search and link wholesale agencies to start ordering medicines for your shop.
          </p>
        </div>

        {/* ── Search Card ── */}
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 p-6 sm:p-8 space-y-6 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Search size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Find Wholesalers</h2>
              <p className="text-[11px] font-bold text-slate-400">Search by name or phone</p>
            </div>
          </div>

          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            {searching && (
              <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Agency name or phone number..."
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 pt-2">
              {searchResults.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between bg-white border-2 border-slate-100 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors border border-slate-100 group-hover:border-emerald-100">
                      <Building2 size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 font-extrabold text-[15px] truncate tracking-tight">{ws.name}</p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-1 font-bold">
                        <Phone size={10} className="text-emerald-500/70" />
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">{ws.phone}</span>
                        {ws.address && <span className="text-slate-400 truncate hidden sm:inline-block border-l border-slate-200 pl-2 ml-1">{ws.address.slice(0, 30)}{ws.address.length > 30 ? '…' : ''}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddAgency(ws)}
                    disabled={adding === ws.id}
                    className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black uppercase tracking-widest text-[11px] px-5 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/20"
                  >
                    {adding === ws.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-center text-slate-300 text-xs py-2 font-medium">
              No wholesalers found for "{search}"
            </p>
          )}
        </div>

        {/* ── Linked Agencies ── */}
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 p-6 sm:p-8 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Linked Agencies</h2>
                <p className="text-[11px] font-bold text-slate-400">Manage connections</p>
              </div>
            </div>
            {agencies.length > 0 && (
              <span className="text-indigo-600 font-extrabold text-[11px] uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                {agencies.length} connected
              </span>
            )}
          </div>

          {loadingAgencies ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-indigo-500 animate-spin" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-[20px] border border-slate-200/60 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                <Store size={28} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-slate-600 text-[15px] font-black tracking-tight mb-1">No agencies connected yet</p>
              <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">Use the search above to find and link with wholesale suppliers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => {
                const isPending = agency.status === 'PENDING';
                const isPrimary = agency.is_primary && !isPending;

                return (
                  <div key={agency.wholesaler_id}
                    className={cn(
                      'flex items-center justify-between rounded-2xl p-4 sm:p-5 group transition-all border-2',
                      isPrimary
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-200 shadow-sm'
                        : isPending
                          ? 'bg-slate-50 border-slate-200/60'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        'w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105',
                        isPending ? 'bg-slate-50 border-slate-200' :
                          isPrimary ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-500/50 shadow-amber-500/20' :
                            'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 text-indigo-500'
                      )}>
                        {isPending ? (
                          <Clock size={20} className="text-slate-400" strokeWidth={2} />
                        ) : isPrimary ? (
                          <Star size={20} className="text-white fill-white" />
                        ) : (
                          <Building2 size={22} className="text-indigo-500" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-800 font-extrabold text-[15px] tracking-tight">{agency.wholesaler.name}</p>
                          {isPending && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Pending
                            </span>
                          )}
                          {!isPending && !isPrimary && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              Active
                            </span>
                          )}
                          {isPrimary && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold">
                          <Phone size={10} className={isPrimary ? "text-amber-500/70" : "text-indigo-500/70"} />
                          <span className={isPrimary ? "bg-amber-100/50 px-1.5 py-0.5 rounded" : "bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"}>{agency.wholesaler.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {agency.status === 'ACTIVE' && !agency.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(agency.wholesaler_id)}
                          className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors text-amber-600 hover:text-amber-700 font-bold"
                          title="Set as Primary"
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAgency(agency.wholesaler_id)}
                        disabled={removing === agency.wholesaler_id}
                        className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors text-rose-500 hover:text-rose-600"
                      >
                        {removing === agency.wholesaler_id
                          ? <Loader2 size={16} className="animate-spin" />
                          : <X size={16} strokeWidth={2.5} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Action ── */}
        <div className="space-y-3 pt-1">
          <button
            onClick={() => navigate('/shop')}
            disabled={!hasActive}
            className={cn(
              'w-full py-5 rounded-[20px] font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 transition-all group',
              hasActive
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            <CheckCircle2 size={18} strokeWidth={2.5} />
            Start Shopping
            <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" strokeWidth={2.5} />
          </button>

          {agencies.length > 0 && (
            <p className="text-center text-slate-300 text-[11px] font-medium">
              You can add more agencies later from profile settings
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
