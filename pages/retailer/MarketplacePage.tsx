import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Pill, ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Building2, Package, AlertTriangle, Sparkles, Clock, X, RefreshCw,
  TrendingUp, CreditCard, ClipboardList, ArrowRight, Zap,
} from 'lucide-react';
import api from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { Medicine, MedicineWithAlternatives, RetailerAgency, Scheme } from '../../types';
import { MedicineDetailSheet } from '../../components/MedicineDetailSheet';
import { SearchCommand } from '../../components/SearchCommand';

const CATEGORIES = ['All', 'Tablets', 'Syrups', 'Injections', 'Creams', 'Drops', 'Inhalers', 'Capsules'];

const getMedicineType = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('tab') || n.includes('cap')) return { label: 'Tablet', color: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (n.includes('syrup') || n.includes('suspension')) return { label: 'Syrup', color: 'bg-amber-50 text-amber-600 border-amber-200' };
  if (n.includes('injection') || n.includes('vial')) return { label: 'Injection', color: 'bg-rose-50 text-rose-600 border-rose-200' };
  if (n.includes('cream') || n.includes('ointment') || n.includes('gel')) return { label: 'Topical', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  if (n.includes('inhaler') || n.includes('rotacap')) return { label: 'Inhaler', color: 'bg-purple-50 text-purple-600 border-purple-200' };
  if (n.includes('drop') || n.includes('eye') || n.includes('ear')) return { label: 'Drops', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' };
  return { label: 'Medicine', color: 'bg-slate-50 text-slate-500 border-slate-200' };
};

const MedicineCard: React.FC<{
  med: MedicineWithAlternatives;
  cartQty: number;
  schemes: Scheme[];
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onDetail: () => void;
}> = ({ med, cartQty, schemes, onAdd, onInc, onDec, onDetail }) => {
  const [showAlts, setShowAlts] = useState(false);
  const margin = med.mrp > 0 ? ((med.mrp - med.price) / med.mrp * 100) : 0;
  const typeInfo = getMedicineType(med.name);
  const isOutOfStock = med.stock_qty <= 0;
  const isLow = med.stock_qty > 0 && med.stock_qty <= 10;
  const { addItem } = useCartStore();

  const applicableSchemes = schemes.filter(s =>
    (s.type === 'CASH_DISCOUNT' && s.wholesaler_id === med.wholesaler_id) ||
    (s.medicine_id === med.id && s.wholesaler_id === med.wholesaler_id)
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden group", isOutOfStock && "opacity-60")}
    >
      <div className="p-4 cursor-pointer" onClick={onDetail}>
        {/* Top row: Type + Stock */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border", typeInfo.color)}>{typeInfo.label}</span>
          {isOutOfStock ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Out of Stock</span>
          ) : isLow ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Low Stock</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />In Stock</span>
          )}
        </div>

        {/* Medicine Info */}
        <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">{med.name}</h3>
        <p className="text-xs text-slate-400 mt-1 font-medium">{med.brand}</p>
        {med.pack_size && <p className="text-[11px] text-slate-500 mt-1">{med.pack_size}</p>}
        {med.salt && <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-1 bg-slate-50 px-2 py-0.5 rounded-md inline-block">{med.salt}</p>}

        {/* Pricing */}
        <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100/60">
          <div>
            <span className="text-[11px] text-slate-400 line-through mr-2">₹{med.mrp.toFixed(0)}</span>
            <span className="text-lg font-extrabold text-blue-700">₹{med.price.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {margin > 15 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 px-2 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1">
                <TrendingUp size={10} />{margin.toFixed(0)}% Margin
              </span>
            )}
            {applicableSchemes.length > 0 && (
              <span className="text-[10px] font-bold text-indigo-700 bg-gradient-to-r from-indigo-50 to-blue-50 px-2 py-1 rounded-lg border border-indigo-200/60 flex items-center gap-1">
                <Sparkles size={10} />Offer Applied
              </span>
            )}
          </div>
        </div>

        {/* Supplier */}
        {med.wholesaler && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="w-4 h-4 rounded bg-blue-50 flex items-center justify-center">
              <Building2 size={9} className="text-blue-500" />
            </div>
            <span className="text-[10px] text-slate-500 truncate font-medium">{med.wholesaler.name}</span>
          </div>
        )}

        {/* Active Offers Details */}
        {applicableSchemes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {applicableSchemes.map(s => (
              <div key={s.id} className="flex items-start gap-1.5 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100/60">
                <Sparkles size={12} className="text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-indigo-900 leading-none mb-0.5">{s.name}</p>
                  <p className="text-[9px] text-indigo-700 leading-snug font-medium">
                    {s.type === 'BOGO' ? `Buy ${s.min_qty} get ${s.free_qty} free!` :
                      s.type === 'HALF_SCHEME' ? `Buy ${s.min_qty} get ${s.free_qty} at half price!` :
                        s.type === 'CASH_DISCOUNT' ? `Extra ${s.discount_pct}% Cash Discount.` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Controls */}
      <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
        {isOutOfStock ? (
          <div className="py-2.5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl font-medium">Unavailable</div>
        ) : cartQty > 0 ? (
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-1.5 border border-blue-100/50">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onDec} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-blue-100 text-blue-600 transition-colors shadow-sm"><Minus size={14} strokeWidth={2.5} /></motion.button>
            <span className="text-sm font-extrabold text-blue-700 tabular-nums">{cartQty}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onInc} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-blue-100 text-blue-600 transition-colors shadow-sm"><Plus size={14} strokeWidth={2.5} /></motion.button>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} onClick={onAdd} className="w-full py-2.5 text-xs font-bold text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-blue-100/50">
            <Plus size={14} strokeWidth={2.5} /> Add to Cart
          </motion.button>
        )}
      </div>

      {/* Alternatives / Substitutes */}
      {med.alternatives && med.alternatives.filter(alt => alt.id !== med.id).length > 0 && (
        <div className="border-t border-slate-100/60 bg-slate-50/50">
          {isOutOfStock ? (
            <div className="p-3">
              <div className="flex items-start gap-2 mb-2 bg-amber-50 rounded-xl p-2.5 border border-amber-200/50">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-xs text-amber-800 font-medium">Out of stock! Would you like to buy a generic substitute with the same composition?</p>
              </div>
              <button onClick={() => setShowAlts(!showAlts)} className="w-full py-2.5 text-xs font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all shadow-sm">
                {showAlts ? 'Hide Substitutes' : `View ${med.alternatives.filter(alt => alt.id !== med.id).length} Substitutes`}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAlts(!showAlts)} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all">
              <Zap size={10} /> {med.alternatives.filter(alt => alt.id !== med.id).length} more supplier{med.alternatives.filter(alt => alt.id !== med.id).length > 1 ? 's' : ''} / brands
              {showAlts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          <AnimatePresence>
            {showAlts && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2 mt-1">
                  {med.alternatives.filter(alt => alt.id !== med.id).map(alt => (
                    <div key={alt.id} className={cn("flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all", alt.stock_qty > 0 ? "bg-white border-blue-100 hover:border-blue-300 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60")}>
                      <div className="flex-1 pr-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{alt.brand || alt.name}</p>
                          {alt.stock_qty <= 0 && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Out</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <Building2 size={10} className="text-slate-400" />
                            {alt.wholesaler?.name}
                          </p>
                          <p className="text-[11px] font-extrabold text-blue-700">₹{alt.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => addItem(alt, 1)} disabled={alt.stock_qty <= 0} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:bg-slate-300 ml-2 shrink-0 shadow-sm">
                        Add
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export const MarketplacePage: React.FC = () => {
  const [medicines, setMedicines] = useState<MedicineWithAlternatives[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [agencies, setAgencies] = useState<RetailerAgency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineWithAlternatives | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { items, addItem, updateQty, removeItem } = useCartStore();
  const { orders, schemes, setSchemes } = useDataStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch agencies
  useEffect(() => {
    api.get('/retailer/agencies').then(r => {
      const active = (r.data || []).filter((a: RetailerAgency) => a.status === 'ACTIVE');
      setAgencies(active);
    }).catch(() => { });
  }, []);

  // Fetch medicines
  const fetchMedicines = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (selectedAgency) params.set('agency_id', selectedAgency);
      const { data } = await api.get(`/marketplace/medicines?${params.toString()}`);
      setMedicines(Array.isArray(data) ? data : data?.medicines || []);
      if (data?.schemes) {
        setSchemes(data.schemes);
      }
    } catch {
      setMedicines([]);
      if (schemes.length === 0) setSchemes([]);
    }
    setLoading(false);
  }, [selectedAgency]);

  useEffect(() => { fetchMedicines(); }, [selectedAgency]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMedicines(val), 400);
  };

  // Category filter (client-side)
  const filtered = category === 'All' ? medicines : medicines.filter(m => {
    const n = m.name.toLowerCase();
    const cat = category.toLowerCase();
    if (cat === 'tablets') return n.includes('tab');
    if (cat === 'syrups') return n.includes('syrup') || n.includes('suspension');
    if (cat === 'injections') return n.includes('injection') || n.includes('vial');
    if (cat === 'creams') return n.includes('cream') || n.includes('ointment') || n.includes('gel');
    if (cat === 'drops') return n.includes('drop') || n.includes('eye') || n.includes('ear');
    if (cat === 'inhalers') return n.includes('inhaler') || n.includes('rotacap');
    if (cat === 'capsules') return n.includes('cap');
    return true;
  });

  // Quick Reorder: derive recently ordered medicines
  const recentMedicines = React.useMemo(() => {
    const delivered = orders.filter(o => o.status === 'DELIVERED');
    const seen = new Set<string>();
    const result: { name: string; medicine?: Medicine }[] = [];
    for (const order of delivered) {
      for (const item of order.items) {
        if (!seen.has(item.medicine_name) && result.length < 6) {
          seen.add(item.medicine_name);
          const found = medicines.find(m => m.name === item.medicine_name || m.id === item.medicine_id);
          if (found) result.push({ name: item.medicine_name, medicine: found });
        }
      }
    }
    return result;
  }, [orders, medicines]);

  const cartCount = items.length;

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-blue-200" />
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Marketplace</span>
          </div>
          <h2 className="text-lg font-bold mb-1">Order medicines from your agencies</h2>
          <p className="text-blue-200 text-xs">Browse catalog, compare prices, and place orders effortlessly</p>
          <div className="flex gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-white/10">
              <p className="text-[10px] text-blue-200 uppercase font-semibold">Active Orders</p>
              <p className="text-lg font-bold">{orders.filter(o => ['PENDING', 'ACCEPTED', 'DISPATCHED'].includes(o.status)).length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-white/10">
              <p className="text-[10px] text-blue-200 uppercase font-semibold">In Cart</p>
              <p className="text-lg font-bold">{cartCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-white/10">
              <p className="text-[10px] text-blue-200 uppercase font-semibold">Agencies</p>
              <p className="text-lg font-bold">{agencies.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-2">
        <div className="flex-1 relative group" onClick={() => setSearchOpen(true)}>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Search medicines, salts, brands..."
            className="w-full pl-10 pr-16 py-3 text-sm bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-slate-400 transition-all shadow-sm hover:shadow-md"
          />
          <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 items-center gap-0.5">⌘K</kbd>
        </div>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className={cn("px-4 py-3 rounded-2xl border transition-all flex items-center gap-1.5 shadow-sm", showFilters ? "bg-blue-50 border-blue-200 text-blue-600 shadow-blue-100/50" : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:shadow-md")}
        >
          <Filter size={16} />
          <span className="text-xs font-semibold hidden sm:inline">Filters</span>
        </motion.button>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2.5">Agency</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedAgency('')} className={cn("text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all", !selectedAgency ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-sm")}>
                    All Agencies
                  </button>
                  {agencies.map(a => (
                    <button key={a.wholesaler_id} onClick={() => setSelectedAgency(a.wholesaler_id)}
                      className={cn("text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all", selectedAgency === a.wholesaler_id ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-sm")}>
                      {a.wholesaler.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <motion.button whileTap={{ scale: 0.95 }}
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn("text-xs font-semibold px-4 py-2 rounded-xl border whitespace-nowrap transition-all",
              category === cat ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:shadow-sm")}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Quick Reorder Section */}
      {recentMedicines.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Order Again</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {recentMedicines.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="min-w-[150px] bg-white rounded-2xl border border-slate-100/80 p-3.5 shadow-sm hover:shadow-md transition-all shrink-0 group">
                <p className="text-xs font-semibold text-slate-700 line-clamp-2 group-hover:text-blue-700 transition-colors">{item.name}</p>
                {item.medicine && (
                  <>
                    <p className="text-base font-extrabold text-blue-700 mt-1.5">₹{item.medicine.price.toFixed(0)}</p>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => item.medicine && addItem(item.medicine, 1)} className="w-full mt-2.5 py-2 text-[10px] font-bold text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all border border-blue-100/50">
                      + Add to Cart
                    </motion.button>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">{filtered.length} medicine{filtered.length !== 1 ? 's' : ''} found</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchMedicines(search)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all"><RefreshCw size={12} />Refresh</motion.button>
      </div>

      {/* Medicine Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100/80 p-4 animate-pulse">
              <div className="flex justify-between mb-3"><div className="w-16 h-6 bg-slate-100 rounded-lg" /><div className="w-16 h-5 bg-slate-100 rounded-lg" /></div>
              <div className="w-3/4 h-4 bg-slate-100 rounded-lg mb-2" />
              <div className="w-1/2 h-3 bg-slate-100 rounded-lg mb-4" />
              <div className="w-1/3 h-7 bg-slate-100 rounded-lg mt-4" />
              <div className="w-full h-10 bg-slate-100 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-600">No medicines found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or filter</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((med, i) => {
            const cartItem = items.find(ci => ci.medicine.id === med.id);
            return (
              <MedicineCard
                key={med.id}
                med={med}
                cartQty={cartItem?.qty || 0}
                schemes={schemes}
                onAdd={() => addItem(med, 1)}
                onInc={() => updateQty(med.id, (cartItem?.qty || 0) + 1)}
                onDec={() => { const q = (cartItem?.qty || 0); q <= 1 ? removeItem(med.id) : updateQty(med.id, q - 1); }}
                onDetail={() => setSelectedMedicine(med)}
              />
            );
          })}
        </div>
      )}

      {/* Floating Cart Banner (mobile) */}
      {cartCount > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-[84px] left-4 right-4 lg:hidden z-40">
          <a href="#/shop/cart" className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 rounded-2xl shadow-xl shadow-blue-600/30 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div>
                <span className="text-sm font-bold block">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                <span className="text-[10px] text-blue-200">Tap to checkout</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">View Cart</span>
              <ArrowRight size={16} />
            </div>
          </a>
        </motion.div>
      )}

      {/* Medicine Detail Sheet */}
      {selectedMedicine && <MedicineDetailSheet medicine={selectedMedicine} onClose={() => setSelectedMedicine(null)} />}

      {/* Search Command */}
      <SearchCommand isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
