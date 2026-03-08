import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Pill, ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Building2, Package, AlertTriangle, Sparkles, Clock, X, RefreshCw,
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

  const applicableSchemes = schemes.filter(s => {
    const match = (s.type === 'CASH_DISCOUNT' && s.wholesaler_id === med.wholesaler_id) ||
      (s.medicine_id === med.id && s.wholesaler_id === med.wholesaler_id);
    if (match) {
      console.log('Matched scheme', s, 'for med', med.name);
    }
    return match;
  });

  if (med.name === 'Zincold Tablet') {
    console.log('Zincold Tablet card -> schemes:', schemes, 'med.id:', med.id, 'wholesaler_id:', med.wholesaler_id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group", isOutOfStock && "opacity-60")}
    >
      <div className="p-4 cursor-pointer" onClick={onDetail}>
        {/* Top row: Type + Stock */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", typeInfo.color)}>{typeInfo.label}</span>
          {isOutOfStock ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Out of Stock</span>
          ) : isLow ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Low Stock</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />In Stock</span>
          )}
        </div>

        {/* Medicine Info */}
        <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">{med.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{med.brand}</p>
        {med.pack_size && <p className="text-[11px] text-slate-500 mt-1">{med.pack_size}</p>}
        {med.salt && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{med.salt}</p>}

        {/* Pricing & Schemes */}
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-50">
          <div>
            <span className="text-xs text-slate-400 line-through mr-1.5">₹{med.mrp.toFixed(0)}</span>
            <span className="text-base font-bold text-blue-700">₹{med.price.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {margin > 15 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                {margin.toFixed(0)}% Margin
              </span>
            )}
            {applicableSchemes.length > 0 && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                <Sparkles size={10} /> {applicableSchemes.length} Offer{applicableSchemes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Supplier */}
        {med.wholesaler && (
          <div className="flex items-center gap-1.5 mt-2">
            <Building2 size={10} className="text-slate-400" />
            <span className="text-[10px] text-slate-400 truncate">{med.wholesaler.name}</span>
          </div>
        )}
      </div>

      {/* Cart Controls */}
      <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
        {isOutOfStock ? (
          <div className="py-2 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">Unavailable</div>
        ) : cartQty > 0 ? (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-1">
            <button onClick={onDec} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"><Minus size={14} /></button>
            <span className="text-sm font-bold text-blue-700">{cartQty}</span>
            <button onClick={onInc} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"><Plus size={14} /></button>
          </div>
        ) : (
          <button onClick={onAdd} className="w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Plus size={14} /> Add to Cart
          </button>
        )}
      </div>

      {/* Alternatives */}
      {med.alternatives && med.alternatives.length > 0 && (
        <div className="border-t border-slate-50">
          <button onClick={() => setShowAlts(!showAlts)} className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-semibold text-slate-500 hover:text-blue-600 transition-colors">
            {med.alternatives.length} more supplier{med.alternatives.length > 1 ? 's' : ''}
            {showAlts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showAlts && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-3 space-y-2">
                  {med.alternatives.map(alt => (
                    <div key={alt.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-[10px] text-slate-500">{alt.wholesaler?.name}</p>
                        <p className="text-xs font-bold text-slate-700">₹{alt.price.toFixed(2)}</p>
                      </div>
                      <button onClick={() => addItem(alt, 1)} disabled={alt.stock_qty <= 0} className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40">
                        Add
                      </button>
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch agencies
  useEffect(() => {
    api.get('/retailer/agencies').then(r => {
      const active = (r.data || []).filter((a: RetailerAgency) => a.status === 'ACTIVE');
      setAgencies(active);
    }).catch(() => { });
  }, []);

  // Fetch medicines
  const fetchMedicines = useCallback(async (q: string = '') => {
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

  useEffect(() => { fetchMedicines(search); }, [selectedAgency]);

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
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative" onClick={() => setSearchOpen(true)}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Search medicines, salts, brands..."
            className="w-full pl-9 pr-16 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-slate-400 transition-all"
          />
          <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 items-center gap-0.5">⌘K</kbd>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn("px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-1.5", showFilters ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
        >
          <Filter size={16} />
          <span className="text-xs font-medium hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Agency</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedAgency('')} className={cn("text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors", !selectedAgency ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                    All Agencies
                  </button>
                  {agencies.map(a => (
                    <button key={a.wholesaler_id} onClick={() => setSelectedAgency(a.wholesaler_id)}
                      className={cn("text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors", selectedAgency === a.wholesaler_id ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
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
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn("text-xs font-medium px-4 py-1.5 rounded-full border whitespace-nowrap transition-colors",
              category === cat ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick Reorder Section */}
      {recentMedicines.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-amber-500" />
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Order Again</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {recentMedicines.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="min-w-[140px] bg-white rounded-xl border border-slate-100 p-3 shadow-sm shrink-0">
                <p className="text-xs font-medium text-slate-700 line-clamp-2">{item.name}</p>
                {item.medicine && (
                  <>
                    <p className="text-sm font-bold text-blue-700 mt-1">₹{item.medicine.price.toFixed(0)}</p>
                    <button onClick={() => item.medicine && addItem(item.medicine, 1)} className="w-full mt-2 py-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      + Add to Cart
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{filtered.length} medicine{filtered.length !== 1 ? 's' : ''} found</p>
        <button onClick={() => fetchMedicines(search)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"><RefreshCw size={12} />Refresh</button>
      </div>

      {/* Medicine Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
              <div className="flex justify-between mb-3"><div className="w-16 h-5 bg-slate-100 rounded-full" /><div className="w-12 h-4 bg-slate-100 rounded-full" /></div>
              <div className="w-3/4 h-4 bg-slate-100 rounded mb-2" />
              <div className="w-1/2 h-3 bg-slate-100 rounded mb-4" />
              <div className="w-1/3 h-6 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No medicines found</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search or filter</p>
        </div>
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
          <a href="#/shop/cart" className="flex items-center justify-between bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-blue-600/30">
            <div className="flex items-center gap-2.5">
              <ShoppingCart size={18} />
              <span className="text-sm font-semibold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
            </div>
            <span className="text-sm font-bold">View Cart →</span>
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
