import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, CheckCircle2, Store, Star, ArrowRight, Loader2, Building2, Phone, Clock } from 'lucide-react';
import api from '../../utils/api';
import { RetailerAgency, WholesalerBasic } from '../../types';
import { useAuthStore } from '../../store/authStore';

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

  // Load existing agencies
  useEffect(() => {
    fetchAgencies();
  }, []);

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

  // Debounced search
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/retailer/agencies/search?q=${encodeURIComponent(search.trim())}`);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddAgency = async (wholesaler: WholesalerBasic, isPrimary = false) => {
    setAdding(wholesaler.id);
    try {
      const { data } = await api.post('/retailer/agencies', {
        wholesaler_id: wholesaler.id,
        is_primary: isPrimary || agencies.length === 0, // first added = primary
      });
      setAgencies((prev) => [...prev, data]);
      setSearchResults((prev) => prev.filter((w) => w.id !== wholesaler.id));
      setSearch('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add agency');
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveAgency = async (wholesaler_id: string) => {
    setRemoving(wholesaler_id);
    try {
      await api.delete(`/retailer/agencies/${wholesaler_id}`);
      setAgencies((prev) => prev.filter((a) => a.wholesaler_id !== wholesaler_id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove agency');
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (wholesaler_id: string) => {
    try {
      await api.patch(`/retailer/agencies/${wholesaler_id}/primary`);
      setAgencies((prev) =>
        prev.map((a) => ({ ...a, is_primary: a.wholesaler_id === wholesaler_id }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 flex items-start justify-center p-6 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/20">
            <Store size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            Select Your Agencies
          </h1>
          <p className="text-emerald-100/60 text-sm font-medium max-w-md mx-auto">
            Search for the wholesale agencies you work with. You can order from them after linking.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4">
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Search Wholesalers</h2>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            {searching && (
              <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agency name or phone number..."
              className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/25 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 transition-all"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 mt-2">
              {searchResults.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/20">
                      <Building2 size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{ws.name}</p>
                      <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                        <Phone size={10} />
                        <span>{ws.phone}</span>
                        {ws.address && <span className="ml-1 text-white/30">· {ws.address.slice(0, 30)}{ws.address.length > 30 ? '...' : ''}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddAgency(ws)}
                    disabled={adding === ws.id}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {adding === ws.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-center text-white/30 text-xs py-3 font-medium">
              No wholesalers found for "{search}". Try a different name or phone number.
            </p>
          )}
        </div>

        {/* Linked Agencies */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black text-sm uppercase tracking-widest">Your Agencies</h2>
            <span className="text-emerald-400 font-black text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-400/20">
              {agencies.length} linked
            </span>
          </div>

          {loadingAgencies ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="text-emerald-400 animate-spin" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Store size={32} className="text-white/20 mx-auto" />
              <p className="text-white/30 text-sm font-medium">No agencies linked yet.</p>
              <p className="text-white/20 text-xs">Search and add agencies above to start ordering.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => (
                <div key={agency.wholesaler_id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      agency.status === 'PENDING'
                        ? 'bg-amber-500/20 border-amber-400/30'
                        : agency.is_primary
                        ? 'bg-amber-500/20 border-amber-400/30'
                        : 'bg-slate-500/20 border-white/10'
                    }`}>
                      {agency.status === 'PENDING' ? (
                        <Clock size={18} className="text-amber-400" />
                      ) : agency.is_primary ? (
                        <Star size={18} className="text-amber-400 fill-amber-400" />
                      ) : (
                        <Building2 size={18} className="text-white/40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold text-sm">{agency.wholesaler.name}</p>
                        {agency.status === 'PENDING' ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                            Awaiting Approval
                          </span>
                        ) : agency.is_primary ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                            Primary
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                        <Phone size={10} />
                        <span>{agency.wholesaler.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {agency.status === 'ACTIVE' && !agency.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(agency.wholesaler_id)}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 transition-colors"
                        title="Set as Primary"
                      >
                        <Star size={14} className="text-amber-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveAgency(agency.wholesaler_id)}
                      disabled={removing === agency.wholesaler_id}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 transition-colors"
                    >
                      {removing === agency.wholesaler_id
                        ? <Loader2 size={14} className="text-red-400 animate-spin" />
                        : <X size={14} className="text-red-400" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/shop')}
            disabled={!agencies.some(a => a.status === 'ACTIVE')}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all group disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-900/30 active:scale-95"
          >
            <CheckCircle2 size={18} />
            Start Shopping
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {agencies.length > 0 && (
            <button
              onClick={() => navigate('/shop')}
              className="text-center text-white/40 text-xs font-medium hover:text-white/60 transition-colors py-2"
            >
              You can add more agencies later from your profile settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
