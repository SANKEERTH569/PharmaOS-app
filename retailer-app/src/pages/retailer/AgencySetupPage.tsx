import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, CheckCircle, Store, Star, Loader2, Building2,
  Phone, ArrowRight,
} from 'lucide-react';
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
      setAgencies(prev => [...prev, data]);
      setSearchResults(prev => prev.filter(w => w.id !== wholesaler.id));
      setSearch('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add agency');
    } finally { setAdding(null); }
  };

  const handleRemoveAgency = async (wholesaler_id: string) => {
    setRemoving(wholesaler_id);
    try {
      await api.delete(`/retailer/agencies/${wholesaler_id}`);
      setAgencies(prev => prev.filter(a => a.wholesaler_id !== wholesaler_id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove agency');
    } finally { setRemoving(null); }
  };

  const handleSetPrimary = async (wholesaler_id: string) => {
    try {
      await api.patch(`/retailer/agencies/${wholesaler_id}/primary`);
      setAgencies(prev => prev.map(a => ({ ...a, is_primary: a.wholesaler_id === wholesaler_id })));
    } catch (err) { console.error(err); }
  };

  const hasActive = agencies.some(a => a.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-8 sm:py-14">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Connect Agencies</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Search and link wholesale agencies to start ordering</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search wholesalers by name or phone..."
              className="w-full pl-8 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                {searchResults.map(w => {
                  const alreadyAdded = agencies.some(a => a.wholesaler_id === w.id);
                  return (
                    <div key={w.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{w.business_name || w.name}</p>
                        {w.phone && <p className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={9} />{w.phone}</p>}
                      </div>
                      {alreadyAdded ? (
                        <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Added</span>
                      ) : (
                        <button onClick={() => handleAddAgency(w)} disabled={adding === w.id}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {adding === w.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No wholesalers found for "{search}"</p>
          )}
        </motion.div>

        {/* Connected Agencies */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Connected Agencies ({agencies.length})
          </h3>

          {loadingAgencies ? (
            <div className="text-center py-8"><Loader2 size={20} className="text-blue-500 animate-spin mx-auto" /></div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
              <Building2 size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No agencies connected yet</p>
              <p className="text-xs text-slate-400 mt-1">Search above to find and add wholesalers</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agencies.map(agency => (
                <motion.div key={agency.wholesaler_id} layout className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{agency.wholesaler_name || 'Agency'}</p>
                        {agency.is_primary && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Star size={8} fill="currentColor" /> Primary
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[10px] font-medium mt-0.5",
                        agency.status === 'ACTIVE' ? 'text-emerald-600' : agency.status === 'PENDING' ? 'text-amber-600' : 'text-slate-400')}>
                        {agency.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!agency.is_primary && agency.status === 'ACTIVE' && (
                        <button onClick={() => handleSetPrimary(agency.wholesaler_id)} title="Set as primary"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                          <Star size={14} />
                        </button>
                      )}
                      <button onClick={() => handleRemoveAgency(agency.wholesaler_id)} disabled={removing === agency.wholesaler_id}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50">
                        {removing === agency.wholesaler_id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Continue Button */}
        {hasActive && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <button onClick={() => navigate('/shop')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
              Continue to Marketplace <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
