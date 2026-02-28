
import React, { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Minus, ShoppingCart, Tag, Pill, Store,
  AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, Building2,
  FlaskConical, Syringe, Droplets, Wind, Package2, Sparkles
} from 'lucide-react';

// ── Medicine type helpers ────────────────────────────────────────────────────
type MedType = 'tablet' | 'syrup' | 'injection' | 'cream' | 'inhaler' | 'powder';

function getMedType(unit: string, packSize?: string | null): MedType {
  const s = ((packSize || '') + ' ' + (unit || '')).toLowerCase();
  if (s.includes('syrup') || s.includes('suspension') || s.includes('solution') || s.includes('drops') || s.includes('bottle')) return 'syrup';
  if (s.includes('injection') || s.includes('vial') || s.includes('ampoule') || s.includes('infusion')) return 'injection';
  if (s.includes('cream') || s.includes('gel') || s.includes('ointment') || s.includes('lotion') || s.includes('tube')) return 'cream';
  if (s.includes('inhaler') || s.includes('rotacap') || s.includes('respule')) return 'inhaler';
  if (s.includes('sachet') || s.includes('powder')) return 'powder';
  return 'tablet';
}

function getPackLabel(packSize?: string | null, unit?: string): string {
  const s = (packSize || '').toLowerCase();
  const type = getMedType(unit || '', packSize);
  if (type === 'syrup' || type === 'injection') {
    const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/);
    return ml ? `${ml[1]} ml` : packSize || '';
  } else if (type === 'cream') {
    const gm = s.match(/(\d+(?:\.\d+)?)\s*(?:gm|g\b|gram)/);
    return gm ? `${gm[1]} gm` : packSize || '';
  } else {
    const n = s.match(/\b(\d+)\b/);
    return n ? `${n[1]} tabs/strip` : packSize || '';
  }
}

const MED_ICON: Record<MedType, { Icon: React.ElementType; bg: string; color: string; label: string }> = {
  tablet: { Icon: Pill, bg: 'bg-blue-50/80', color: 'text-blue-500', label: 'Tablet' },
  syrup: { Icon: FlaskConical, bg: 'bg-amber-50/80', color: 'text-amber-500', label: 'Syrup' },
  injection: { Icon: Syringe, bg: 'bg-rose-50/80', color: 'text-rose-500', label: 'Injection' },
  cream: { Icon: Droplets, bg: 'bg-emerald-50/80', color: 'text-emerald-500', label: 'Cream/Gel' },
  inhaler: { Icon: Wind, bg: 'bg-purple-50/80', color: 'text-purple-500', label: 'Inhaler' },
  powder: { Icon: Package2, bg: 'bg-slate-50/80', color: 'text-slate-500', label: 'Powder' },
};

import api from '../../utils/api';
import { MedicineWithAlternatives, Medicine } from '../../types';

interface AgencyInfo {
  wholesaler_id: string;
  is_primary: boolean;
  name: string;
  phone: string;
}

export const MarketplacePage = () => {
  const { addItem, items, updateQty } = useCartStore();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeAgency, setActiveAgency] = useState<string>('ALL');
  const [medicines, setMedicines] = useState<MedicineWithAlternatives[]>([]);
  const [agencies, setAgencies] = useState<AgencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlts, setExpandedAlts] = useState<string | null>(null);

  const fetchMedicines = useCallback(async (searchTerm = '', agency = 'ALL') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (agency !== 'ALL') params.set('agency', agency);
      const { data } = await api.get(`/marketplace/medicines?${params.toString()}`);
      setMedicines(data.medicines || []);
      if (data.agencies) setAgencies(data.agencies);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to load medicines';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines('', 'ALL');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchMedicines(search, activeAgency);
  }, [search, activeAgency]);

  const getCartQty = (id: string) => items.find((i) => i.medicine.id === id)?.qty || 0;
  const totalCartItems = items.reduce((sum, i) => sum + i.qty, 0);
  const toggleAlternatives = (id: string) => setExpandedAlts((prev) => (prev === id ? null : id));

  const MedicineCard = ({ med, isAlternative = false }: { med: MedicineWithAlternatives | Medicine; isAlternative?: boolean }) => {
    const qty = getCartQty(med.id);
    const margin = ((med.mrp - med.price) / med.mrp * 100).toFixed(0);
    const isHighMargin = parseInt(margin) > 25;
    const supplierName = (med as any).wholesaler?.name || 'Unknown';
    const alts = !isAlternative ? (med as MedicineWithAlternatives).alternatives : undefined;
    const hasAlts = !!alts && alts.length > 0;
    const isExpanded = expandedAlts === med.id;

    const medType = getMedType(med.unit, med.pack_size);
    const { Icon, bg, color, label } = MED_ICON[medType];
    const packLabel = getPackLabel(med.pack_size, med.unit);
    const salt = (med as any).salt || '';

    return (
      <div className={`bg-white rounded-[24px] border border-slate-200/60 transition-all duration-300 flex flex-col relative group ${isAlternative ? 'p-4 hover:bg-slate-50' : 'p-5 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 hover:border-emerald-200/50'}`}>

        {/* Badges */}
        {isHighMargin && !isAlternative && (
          <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 z-10">
            <Tag size={10} /> {margin}% Margin
          </div>
        )}
        {(med as any).stock_qty <= 0 && (
          <div className="absolute top-4 right-4 bg-rose-500 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest z-10 shadow-sm border border-rose-600">
            Out of Stock
          </div>
        )}

        {/* Icon */}
        {!isAlternative && (
          <div className="flex justify-center mt-2 mb-4 group-hover:scale-105 transition-transform duration-300">
            <div className={`w-16 h-16 rounded-[20px] ${bg} border border-white/50 flex flex-col items-center justify-center gap-1 shadow-sm`}>
              <Icon size={26} className={color} strokeWidth={2} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{label}</span>
            </div>
          </div>
        )}

        {isAlternative && (
          <div className={`inline-flex items-center justify-center gap-1 mb-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${bg} ${color} w-fit`}>
            <Icon size={9} strokeWidth={2.5} /> {label}
          </div>
        )}

        {/* Info */}
        <div className={isAlternative ? 'mb-3' : 'mt-1 mb-1 text-center px-2'}>
          <h3 className={`font-extrabold text-slate-800 leading-tight mb-1 group-hover:text-emerald-700 transition-colors ${isAlternative ? 'text-sm' : 'text-[17px] text-center'}`}>{med.name}</h3>

          <div className={`flex flex-wrap items-center gap-1.5 ${isAlternative ? '' : 'justify-center'} mt-1`}>
            <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">{med.brand}</p>
            {packLabel && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${color} ${bg}`}>
                {packLabel}
              </span>
            )}
          </div>

          {salt && (
            <p className={`text-slate-500 font-medium ${isAlternative ? 'text-[10px] mt-2' : 'text-[11px] text-center mt-2 line-clamp-1'}`} title={salt}>
              {salt}
            </p>
          )}
        </div>

        {/* Bottom Section */}
        <div className="mt-auto pt-4 space-y-3">
          <div className={`flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-2 ${isAlternative ? '' : 'justify-center'}`}>
            <Building2 size={13} className="text-indigo-400" /> Sold by: <span className="font-bold text-slate-700 truncate">{supplierName}</span>
          </div>

          <div className="flex justify-between items-center bg-slate-50/80 border border-slate-100/80 rounded-[16px] p-3">
            <div className="text-center flex-1 border-r border-slate-200">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">MRP</p>
              <p className="text-slate-500 line-through font-semibold text-sm">₹{med.mrp}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">PTR</p>
              <p className="text-slate-900 font-black text-lg leading-none">₹{med.price}</p>
            </div>
          </div>

          {qty === 0 ? (
            <button
              onClick={() => addItem((med as any), 1)}
              disabled={(med as any).stock_qty <= 0}
              className="w-full bg-slate-900 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-md shadow-slate-900/10 hover:shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 group/btn"
            >
              <Plus size={14} className="group-hover/btn:rotate-90 transition-transform" /> Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 p-1.5 rounded-2xl border border-emerald-200/60 shadow-inner">
              <button onClick={() => updateQty(med.id, qty - 1)} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors shadow-sm text-emerald-700"><Minus size={16} strokeWidth={2.5} /></button>
              <span className="text-base font-black flex-1 text-center">{qty}</span>
              <button
                onClick={() => updateQty(med.id, qty + 1)}
                disabled={(med as any).stock_qty <= qty}
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-emerald-100 hover:text-emerald-700 rounded-xl transition-colors shadow-sm text-emerald-700 disabled:opacity-50"><Plus size={16} strokeWidth={2.5} /></button>
            </div>
          )}

          {hasAlts && (
            <button onClick={() => toggleAlternatives(med.id)}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 hover:border-indigo-200 rounded-2xl py-2.5 transition-all"
            >
              <Store size={12} />
              {alts!.length} other supplier{alts!.length > 1 ? 's' : ''}
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {hasAlts && isExpanded && (
          <div className="mt-3 pt-4 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 flex items-center gap-2">
              <span className="h-px bg-slate-200 flex-1"></span>
              Also available from
              <span className="h-px bg-slate-200 flex-1"></span>
            </p>
            {alts!.map((alt) => (
              <div key={alt.id}>
                <MedicineCard med={alt as MedicineWithAlternatives} isAlternative={true} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-24 animate-in fade-in zoom-in-95 duration-500">

      {/* Search Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#042F2E] via-[#064E3B] to-[#0D9488] shadow-2xl shadow-emerald-900/15">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-emerald-400/10 blur-[100px] rounded-full mix-blend-overlay" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[120%] bg-teal-300/10 blur-[80px] rounded-full mix-blend-overlay" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" />
        </div>

        <div className="relative z-10 px-6 py-10 lg:px-12 lg:py-14 max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 shadow-sm">
            <Sparkles size={12} className="text-emerald-300" />
            <span className="text-[10px] sm:text-xs font-bold text-emerald-50 tracking-widest uppercase">Browse over 2.5L+ medicines</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-sm">
            Search & Order Medicines<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-100">Instantly.</span>
          </h2>
          <p className="text-emerald-100/80 text-sm sm:text-base font-medium max-w-xl mx-auto mb-10 leading-relaxed">
            Search by brand, salt, or category. Connect directly with your approved wholesale agencies.
          </p>

          <div className="relative w-full shadow-2xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 group-focus-within:text-emerald-500 transition-colors" />
            <input type="text" placeholder="Search for Paracetamol, Amoxicillin..."
              className="w-full pl-16 pr-6 py-5 rounded-[24px] text-slate-900 font-bold placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/30 outline-none border-0 text-lg transition-all"
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-6 top-1/2 -translate-y-1/2 bg-slate-100 text-slate-500 hover:bg-slate-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar (Agencies filter) */}
        <div className="w-full lg:w-[260px] space-y-4 shrink-0">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Store size={18} className="text-slate-400" />
              <h3 className="font-extrabold text-slate-800 tracking-tight text-[15px]">My Agencies</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => setActiveAgency('ALL')}
                className={`text-left px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${activeAgency === 'ALL' ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
              >All Agencies</button>
              {agencies.map((ag) => (
                <button key={ag.wholesaler_id} onClick={() => setActiveAgency(ag.wholesaler_id)}
                  className={`text-left px-4 py-3 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-2.5 ${activeAgency === ag.wholesaler_id ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
                >
                  <Building2 size={14} className={activeAgency === ag.wholesaler_id ? 'text-emerald-200' : 'text-slate-400'} />
                  <span className="truncate">{ag.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/shop/setup-agencies')}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-300 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 font-black text-[11px] uppercase tracking-widest rounded-2xl py-3.5 transition-all"
            >
              <Plus size={14} /> Manage Agencies
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
              <Loader2 size={36} className="text-emerald-500 animate-spin" />
              <p className="text-slate-400 font-bold text-sm tracking-wide">Loading Catalogue...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-10 flex flex-col items-center text-center max-w-md mx-auto mt-10">
              <AlertCircle size={44} className="text-rose-500 mb-4" />
              <h3 className="text-xl font-bold text-rose-900 mb-2">Error Loading Data</h3>
              <p className="text-rose-600 font-medium mb-6">{error}</p>
              <button onClick={() => fetchMedicines(search, activeAgency)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-md shadow-rose-600/20">
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : agencies.length === 0 ? (
            <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border-2 border-dashed border-slate-300 rounded-[32px] p-12 lg:p-16 text-center space-y-6 max-w-2xl mx-auto mt-8">
              <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mx-auto border border-slate-100">
                <Store size={48} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">No Agencies Linked Yet</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Connect with wholesale agencies to browse their catalogue and start placing orders directly.</p>
              </div>
              <button onClick={() => navigate('/shop/setup-agencies')}
                className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-sm px-8 py-4 rounded-2xl hover:bg-slate-800 hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Plus size={18} /> Add Your First Agency
              </button>
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 px-4 text-center bg-white rounded-[32px] border border-slate-200/60 shadow-sm mt-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                <Search className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">No medicines found</h3>
              {search && <p className="text-slate-500 font-medium max-w-sm">We couldn't find any exact matches for "{search}".</p>}
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Available Medicines <span className="text-slate-400 font-bold ml-2 text-sm">({medicines.length})</span></h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                {medicines.map((med) => (
                  <div key={med.id}>
                    <MedicineCard med={med} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating View Cart */}
      {totalCartItems > 0 && (
        <div className="fixed lg:hidden bottom-[84px] left-6 right-6 z-40 animate-slide-up">
          <button onClick={() => navigate('/shop/cart')}
            className="w-full flex items-center justify-between bg-emerald-600 text-white p-4 rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center font-black">
                {totalCartItems}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Cart Total</p>
                <p className="text-base font-black leading-none mt-0.5">₹{items.reduce((sum, item) => sum + ((item as any).unit_price * item.qty), 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-sm bg-white/20 px-4 py-2 rounded-xl">
              View Cart <ShoppingCart size={16} />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};


