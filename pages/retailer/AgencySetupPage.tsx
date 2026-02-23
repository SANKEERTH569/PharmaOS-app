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
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Connect Your Agencies
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1.5 max-w-sm mx-auto">
            Search and link wholesale agencies to start ordering medicines.
          </p>
        </div>

        {/* ── Search Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Find Wholesalers</h2>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            {searching && (
              <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Agency name or phone number..."
              className="w-full pl-11 pr-11 py-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 pt-1">
              {searchResults.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 hover:bg-emerald-50/50 hover:border-emerald-200/60 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-teal-100 transition-all">
                      <Building2 size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 font-bold text-sm truncate">{ws.name}</p>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                        <Phone size={9} />
                        <span>{ws.phone}</span>
                        {ws.address && <span className="text-slate-300 truncate">· {ws.address.slice(0, 25)}{ws.address.length > 25 ? '…' : ''}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddAgency(ws)}
                    disabled={adding === ws.id}
                    className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    {adding === ws.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add
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
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-slate-400" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Your Agencies</h2>
            </div>
            <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {agencies.length} linked
            </span>
          </div>

          {loadingAgencies ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="text-emerald-500 animate-spin" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Store size={20} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm font-semibold">No agencies linked yet</p>
              <p className="text-slate-300 text-xs">Search above to add your first agency</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agencies.map((agency) => {
                const isPending = agency.status === 'PENDING';
                const isPrimary = agency.is_primary && !isPending;

                return (
                  <div key={agency.wholesaler_id}
                    className={cn(
                      'flex items-center justify-between rounded-xl p-3.5 group transition-all border',
                      isPrimary
                        ? 'bg-amber-50/50 border-amber-200/60'
                        : isPending
                          ? 'bg-slate-50/50 border-slate-100'
                          : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center',
                        isPending ? 'bg-amber-100' :
                          isPrimary ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm' :
                            'bg-gradient-to-br from-emerald-100 to-teal-100'
                      )}>
                        {isPending ? (
                          <Clock size={15} className="text-amber-500" />
                        ) : isPrimary ? (
                          <Star size={14} className="text-white fill-white" />
                        ) : (
                          <Building2 size={15} className="text-emerald-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-800 font-bold text-sm">{agency.wholesaler.name}</p>
                          {isPending && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                              Pending
                            </span>
                          )}
                          {isPrimary && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              Primary
                            </span>
                          )}
                          {!isPending && !isPrimary && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                          <Phone size={9} />
                          <span>{agency.wholesaler.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {agency.status === 'ACTIVE' && !agency.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(agency.wholesaler_id)}
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors"
                          title="Set as Primary"
                        >
                          <Star size={12} className="text-amber-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAgency(agency.wholesaler_id)}
                        disabled={removing === agency.wholesaler_id}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors"
                      >
                        {removing === agency.wholesaler_id
                          ? <Loader2 size={12} className="text-rose-400 animate-spin" />
                          : <X size={12} className="text-rose-400" />
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
              'w-full py-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-3 transition-all group',
              hasActive
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            <CheckCircle2 size={16} />
            Start Shopping
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
