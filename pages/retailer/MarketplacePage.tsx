
import React, { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Minus, ShoppingCart, Tag, Pill, Store,
  AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, Building2,
  FlaskConical, Syringe, Droplets, Wind, Package2,
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
    // tablet/capsule — extract count
    const n = s.match(/\b(\d+)\b/);
    return n ? `${n[1]} tabs/strip` : packSize || '';
  }
}

const MED_ICON: Record<MedType, { Icon: React.ElementType; bg: string; color: string; label: string }> = {
  tablet:    { Icon: Pill,          bg: 'bg-blue-50',   color: 'text-blue-400',   label: 'Tablet' },
  syrup:     { Icon: FlaskConical,  bg: 'bg-amber-50',  color: 'text-amber-400',  label: 'Syrup' },
  injection: { Icon: Syringe,       bg: 'bg-red-50',    color: 'text-red-400',    label: 'Injection' },
  cream:     { Icon: Droplets,      bg: 'bg-emerald-50',color: 'text-emerald-400',label: 'Cream/Gel' },
  inhaler:   { Icon: Wind,          bg: 'bg-purple-50', color: 'text-purple-400', label: 'Inhaler' },
  powder:    { Icon: Package2,      bg: 'bg-slate-50',  color: 'text-slate-400',  label: 'Powder' },
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

  // Debounced search
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
      <div className={`bg-white rounded-[20px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative group ${isAlternative ? 'p-4' : 'p-5'}`}>
        {isHighMargin && !isAlternative && (
          <div className="absolute top-4 left-4 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-rose-100 z-10">
            <Tag size={10} /> {margin}% Margin
          </div>
        )}
        {!isAlternative && (
          <div className="flex justify-center my-4 group-hover:scale-105 transition-transform duration-300">
            <div className={`w-16 h-16 rounded-2xl ${bg} border border-slate-100 flex flex-col items-center justify-center gap-1`}>
              <Icon size={28} className={color} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{label}</span>
            </div>
          </div>
        )}
        {isAlternative && (
          <div className={`inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${bg} ${color} w-fit`}>
            <Icon size={9} /> {label}
          </div>
        )}
        <div className={isAlternative ? 'mb-3' : 'mt-2 mb-1 text-center'}>
          <h3 className={`font-bold text-slate-900 leading-tight mb-0.5 ${isAlternative ? 'text-sm' : 'text-lg text-center'}`}>{med.name}</h3>
          <p className={`text-slate-400 font-bold uppercase tracking-wide ${isAlternative ? 'text-[10px]' : 'text-xs text-center'}`}>{med.brand}</p>
          {salt && (
            <p className={`text-slate-500 font-medium ${isAlternative ? 'text-[10px] mt-1' : 'text-[11px] text-center mt-1'}`} title={salt}>
              {salt.length > 40 ? salt.slice(0, 38) + '…' : salt}
            </p>
          )}
          {packLabel && (
            <div className={`flex items-center gap-1 mt-1.5 ${isAlternative ? '' : 'justify-center'}`}>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${color} border border-current/10`}>
                <Icon size={9} /> {packLabel}
              </span>
            </div>
          )}
        </div>
        <div className="mt-auto pt-3 space-y-3">
          <div className={`flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-50 py-1 rounded-md px-2 ${isAlternative ? '' : 'justify-center'}`}>
            <Store size={10} /> Sold by: <span className="font-bold text-slate-700 ml-1">{supplierName}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
            <div className="text-center flex-1 border-r border-slate-200">
              <p className="text-[10px] text-slate-400 font-bold uppercase">MRP</p>
              <p className="text-slate-400 line-through font-medium text-sm">₹{med.mrp}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Rate</p>
              <p className="text-slate-900 font-black text-lg">₹{med.price}</p>
            </div>
          </div>
          {qty === 0 ? (
            <button onClick={() => addItem(med, 1)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95">
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 p-1.5 rounded-xl border border-emerald-100">
              <button onClick={() => updateQty(med.id, qty - 1)} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"><Minus size={14} /></button>
              <span className="text-sm font-black w-8 text-center">{qty}</span>
              <button onClick={() => updateQty(med.id, qty + 1)} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"><Plus size={14} /></button>
            </div>
          )}
          {hasAlts && (
            <button onClick={() => toggleAlternatives(med.id)}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl py-2 transition-colors"
            >
              <Building2 size={11} />
              {alts!.length} other supplier{alts!.length > 1 ? 's' : ''}
              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
        {hasAlts && isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Also available from:</p>
            {alts!.map((alt) => (
              <MedicineCard key={alt.id} med={alt as MedicineWithAlternatives} isAlternative={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl lg:text-4xl font-black mb-3 tracking-tight leading-tight">Order from Your<br />Trusted Agencies</h2>
          <p className="text-emerald-100 font-medium text-lg mb-8">Browse medicines from your linked suppliers & compare prices.</p>
          <div className="relative w-full">
            <Search className="absolute left-5 top-4 text-emerald-900/40 w-5 h-5" />
            <input type="text" placeholder="Search medicines, brands or salts..."
              className="w-full pl-14 pr-4 py-4 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/30 outline-none shadow-xl border-none"
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
        {totalCartItems > 0 && (
          <button onClick={() => navigate('/shop/cart')}
            className="absolute bottom-6 right-6 flex items-center gap-2 bg-white text-emerald-900 font-black text-sm px-5 py-3 rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95"
          >
            <ShoppingCart size={18} /> {totalCartItems} item{totalCartItems > 1 ? 's' : ''} in cart
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Store size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-800">My Agencies</h3>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setActiveAgency('ALL')}
                className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeAgency === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >All Agencies</button>
              {agencies.map((ag) => (
                <button key={ag.wholesaler_id} onClick={() => setActiveAgency(ag.wholesaler_id)}
                  className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeAgency === ag.wholesaler_id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {ag.is_primary && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                  <span className="truncate">{ag.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => navigate('/shop/setup-agencies')}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 font-black text-xs uppercase tracking-widest rounded-xl py-3 transition-all"
          >
            <Plus size={14} /> Manage Agencies
          </button>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={32} className="text-emerald-500 animate-spin" />
              <p className="text-slate-400 font-medium text-sm">Loading medicines from your agencies...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <AlertCircle size={40} className="text-red-400" />
              <p className="text-slate-600 font-bold">{error}</p>
              <button onClick={() => fetchMedicines(search, activeAgency)} className="flex items-center gap-2 bg-slate-900 text-white font-black text-xs px-6 py-3 rounded-xl">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : agencies.length === 0 ? (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto">
                <Store size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800">No Agencies Linked Yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Add the wholesale agencies you buy from to start seeing their medicines here.</p>
              <button onClick={() => navigate('/shop/setup-agencies')}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-black text-sm px-8 py-4 rounded-2xl hover:bg-emerald-500 transition-colors mt-2"
              >
                <Plus size={16} /> Add Your First Agency
              </button>
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <Pill size={40} className="text-slate-300" />
              <p className="text-slate-500 font-bold">No medicines found</p>
              {search && <p className="text-slate-400 text-sm">No results for "{search}" from your agencies.</p>}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{medicines.length} products</span>
                <span className="text-xs text-slate-400 font-medium">{agencies.length} agenc{agencies.length === 1 ? 'y' : 'ies'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {medicines.slice(0, 200).map((med) => <MedicineCard key={med.id} med={med} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


