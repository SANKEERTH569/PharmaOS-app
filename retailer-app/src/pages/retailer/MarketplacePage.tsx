import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Building2, Package, AlertTriangle, Sparkles, RefreshCw, TrendingUp, ArrowRight, Zap,
  LayoutGrid, List, LayoutList
} from 'lucide-react';
import api from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';
import { Medicine, MedicineWithAlternatives, RetailerAgency, Scheme } from '../../types';
import { MedicineDetailSheet } from '../../components/MedicineDetailSheet';
import { SearchCommand } from '../../components/SearchCommand';

const CATEGORIES = ['All', 'Tablets', 'Syrups', 'Injections', 'Creams', 'Drops', 'Inhalers', 'Capsules'] as const;
const SEARCH_DEBOUNCE_MS = 400;
const VIEW_MODE_STORAGE_KEY = 'pharma-marketplace-view-mode';
const PAGE_SIZE = 48;

/** Normalize search so "a250" matches "A 250" — backend also does this; sending normalized helps. */
function normalizeSearchQuery(q: string): string {
  const t = q.trim();
  if (!t) return t;
  return t.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');
}

type ViewMode = 'detailed' | 'grid' | 'compact';

const getStoredViewMode = (): ViewMode => {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'detailed' || stored === 'grid' || stored === 'compact') return stored;
  } catch {
    // ignore
  }
  return 'detailed';
};

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

interface MedicineCardProps {
  med: MedicineWithAlternatives;
  cartQty: number;
  schemes: Scheme[];
  viewMode: ViewMode;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onDetail: () => void;
}

const MedicineCardComponent: React.FC<MedicineCardProps> = ({ med, cartQty, schemes, viewMode, onAdd, onInc, onDec, onDetail }) => {
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


  if (viewMode === 'compact') {
    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className={cn("bg-white rounded-xl border border-slate-200/70 p-3 shadow-sm flex items-center gap-3 overflow-hidden", isOutOfStock && "opacity-75 bg-slate-50")}
      >
        <div className="flex-1 min-w-0" onClick={onDetail} style={{ cursor: 'pointer' }}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800 truncate">{med.name}</h3>
            {isOutOfStock ? (
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">Out</span>
            ) : isLow ? (
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">Low</span>
            ) : null}
            {applicableSchemes.length > 0 && <Sparkles size={10} className="text-indigo-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 truncate">{med.brand}</span>
            <span className="text-slate-300">•</span>
            <span className="font-extrabold text-blue-700">{formatCurrency(med.price)}</span>
            {margin > 15 && <span className="text-[10px] text-emerald-600 font-bold ml-1">{margin.toFixed(0)}% Margin</span>}
          </div>
        </div>
        
        <div className="shrink-0 flex items-center justify-end w-[90px]">
          {cartQty > 0 ? (
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-1 w-full border border-blue-100/50">
              <button onClick={onDec} className="w-6 h-6 flex items-center justify-center rounded bg-white text-blue-600 shadow-sm"><Minus size={12} /></button>
              <span className="text-xs font-bold text-blue-700">{cartQty}</span>
              <button onClick={onInc} className="w-6 h-6 flex items-center justify-center rounded bg-white text-blue-600 shadow-sm"><Plus size={12} /></button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className={cn(
                "w-full py-1.5 px-3 text-[11px] font-bold rounded-lg transition-colors border shadow-sm",
                isOutOfStock ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              )}
            >
              {isOutOfStock ? 'Pre-order' : 'Add'}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={cn("bg-white rounded-2xl border border-slate-200/70 p-3 shadow-sm flex flex-col hover:shadow-md transition-shadow", isOutOfStock && "opacity-75")}
      >
        <div className="flex-1 cursor-pointer" onClick={onDetail}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", typeInfo.color)}>{typeInfo.label}</span>
            {isOutOfStock ? (
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Out</span>
            ) : applicableSchemes.length > 0 ? (
               <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles size={8}/>Offer</span>
            ) : null}
          </div>
          <h3 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 mb-1">{med.name}</h3>
          <p className="text-[10px] text-slate-500 line-clamp-1">{med.brand}</p>
          {med.wholesaler && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 size={9} className="text-slate-400 shrink-0" />
              <span className="text-[9px] text-slate-500 truncate" title={med.wholesaler.name}>{med.wholesaler.name}</span>
            </div>
          )}
          <div className="mt-2 mb-3">
             <span className="text-sm font-extrabold text-blue-700">{formatCurrency(med.price)}</span>
             <span className="text-[9px] text-slate-400 line-through ml-1.5">{formatCurrency(med.mrp)}</span>
          </div>
        </div>
        
        <div className="mt-auto pt-2 border-t border-slate-100">
          {cartQty > 0 ? (
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-1 border border-blue-100/50">
              <button onClick={onDec} className="w-7 h-7 flex items-center justify-center rounded bg-white text-blue-600 shadow-sm"><Minus size={12} /></button>
              <span className="text-xs font-bold text-blue-700">{cartQty}</span>
              <button onClick={onInc} className="w-7 h-7 flex items-center justify-center rounded bg-white text-blue-600 shadow-sm"><Plus size={12} /></button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className={cn(
                "w-full py-2 text-[11px] font-bold rounded-lg transition-colors border shadow-sm flex justify-center items-center gap-1",
                isOutOfStock
                  ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                  : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              )}
            >
              <Plus size={12} /> {isOutOfStock ? 'Pre-order' : 'Add'}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden group")}
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
            <span className="text-[11px] text-slate-400 line-through mr-2">{formatCurrency(med.mrp)}</span>
            <span className="text-lg font-extrabold text-blue-700">{formatCurrency(med.price)}</span>
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
        {cartQty > 0 ? (
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-1.5 border border-blue-100/50">
            <motion.button whileTap={{ scale: 0.9 }} onClick={onDec} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-blue-100 text-blue-600 transition-colors shadow-sm"><Minus size={14} strokeWidth={2.5} /></motion.button>
            <span className="text-sm font-extrabold text-blue-700 tabular-nums">{cartQty}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onInc} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-blue-100 text-blue-600 transition-colors shadow-sm"><Plus size={14} strokeWidth={2.5} /></motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onAdd}
            className={cn(
              "w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border",
              isOutOfStock
                ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/60"
                : "text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-100/50"
            )}
          >
            <Plus size={14} strokeWidth={2.5} />
            {isOutOfStock ? 'Pre-order' : 'Add to Cart'}
          </motion.button>
        )}
        {isOutOfStock && (
          <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium flex items-center justify-center gap-1">
            <AlertTriangle size={10} className="shrink-0" /> Out of stock — supplier will fulfill on restock
          </p>
        )}
        {!isOutOfStock && isLow && (
          <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium">
            Only {med.stock_qty} left — order before it runs out
          </p>
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
                          <p className="text-[11px] font-extrabold text-blue-700">{formatCurrency(alt.price)}</p>
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

const MedicineCard = React.memo(MedicineCardComponent);
MedicineCard.displayName = 'MedicineCard';

export const MarketplacePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [medicines, setMedicines] = useState<MedicineWithAlternatives[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
  const abortRef = useRef<AbortController | null>(null);
  const loadMoreOffsetRef = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;

  // Persist view mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  // Fetch agencies
  useEffect(() => {
    api.get('/retailer/agencies').then(r => {
      const active = (r.data || []).filter((a: RetailerAgency) => a.status === 'ACTIVE');
      setAgencies(active);
    }).catch(() => {});
  }, []);

  // Fetch medicines with abort support. offset > 0 = append (load more).
  // q = explicit search (e.g. from debounced input); when omitted we use searchRef for agency-only refetch.
  const fetchMedicines = useCallback(async (q?: string, agencyOverride?: string, offset = 0) => {
    const isLoadMore = offset > 0;
    if (!isLoadMore) {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setFetchError(null);
    } else {
      loadMoreOffsetRef.current = offset;
      setLoadingMore(true);
    }
    const signal = abortRef.current?.signal;
    const agency = agencyOverride !== undefined ? agencyOverride : selectedAgency;
    const searchVal = q !== undefined ? q : searchRef.current;
    const searchParam = searchVal.trim() ? normalizeSearchQuery(searchVal) : undefined;
    try {
      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (agency) params.set('agency', agency);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      const { data } = await api.get(`/marketplace/medicines?${params.toString()}`, { signal });
      const list = Array.isArray(data) ? data : data?.medicines || [];
      const total = typeof data?.total === 'number' ? data.total : list.length;
      if (isLoadMore) {
        const expectedOffset = loadMoreOffsetRef.current;
        setMedicines((prev) => (prev.length !== expectedOffset ? prev : [...prev, ...list]));
      } else {
        setMedicines(list);
        setTotalCount(total);
      }
      if (data?.schemes) setSchemes(data.schemes);
      else if (!isLoadMore) setSchemes([]);
    } catch (err: unknown) {
      const isAborted = (err as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (err instanceof Error && err.name === 'AbortError');
      if (isAborted) return;
      if (!isLoadMore) {
        setMedicines([]);
        setTotalCount(0);
        setSchemes([]);
        const message = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Failed to load medicines';
        setFetchError(message);
      }
    } finally {
      if (!isLoadMore) {
        if (!signal?.aborted) setLoading(false);
        abortRef.current = null;
      } else {
        setLoadingMore(false);
      }
    }
  }, [selectedAgency, setSchemes]);

  // Only refetch when agency changes (or mount). Do NOT refetch on every search change — that would cancel requests on each keystroke.
  useEffect(() => {
    fetchMedicines(searchRef.current, undefined, 0);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [selectedAgency, fetchMedicines]);

  const handleRetry = useCallback(() => {
    setFetchError(null);
    fetchMedicines(search);
  }, [fetchMedicines, search]);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMedicines(val), SEARCH_DEBOUNCE_MS);
  }, [fetchMedicines]);

  // Category filter (client-side, memoized)
  const filtered = useMemo(() => {
    if (category === 'All') return medicines;
    const cat = category.toLowerCase();
    return medicines.filter(m => {
      const n = m.name.toLowerCase();
      if (cat === 'tablets') return n.includes('tab');
      if (cat === 'syrups') return n.includes('syrup') || n.includes('suspension');
      if (cat === 'injections') return n.includes('injection') || n.includes('vial');
      if (cat === 'creams') return n.includes('cream') || n.includes('ointment') || n.includes('gel');
      if (cat === 'drops') return n.includes('drop') || n.includes('eye') || n.includes('ear');
      if (cat === 'inhalers') return n.includes('inhaler') || n.includes('rotacap');
      if (cat === 'capsules') return n.includes('cap');
      return true;
    });
  }, [medicines, category]);

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
      {/* Search Bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="flex-1 relative group min-w-0" onClick={() => setSearchOpen(true)}>
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={cn("shrink-0 px-4 py-3 rounded-2xl border transition-all flex items-center gap-1.5 shadow-sm", showFilters ? "bg-blue-50 border-blue-200 text-blue-600 shadow-blue-100/50" : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:shadow-md")}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
          >
            <Filter size={16} />
            <span className="text-xs font-semibold hidden sm:inline">Filters</span>
          </motion.button>
        </div>
        {/* Layout switcher: List (one per row) vs Grid (side by side) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">View:</span>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80" role="group" aria-label="Layout">
            <button
              onClick={() => setViewMode('detailed')}
              className={cn("flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all", viewMode === 'detailed' ? "bg-white shadow-sm text-blue-600 border border-slate-200/60" : "text-slate-500 hover:text-slate-700")}
              aria-pressed={viewMode === 'detailed'}
              title="One per row (list)"
            >
              <LayoutList size={16} className="shrink-0" />
              <span className="sm:hidden">List</span>
              <span className="hidden sm:inline">One per row</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn("flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600 border border-slate-200/60" : "text-slate-500 hover:text-slate-700")}
              aria-pressed={viewMode === 'grid'}
              title="Side by side (grid)"
            >
              <LayoutGrid size={16} className="shrink-0" />
              <span className="sm:hidden">Grid</span>
              <span className="hidden sm:inline">Side by side</span>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={cn("flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all", viewMode === 'compact' ? "bg-white shadow-sm text-blue-600 border border-slate-200/60" : "text-slate-500 hover:text-slate-700")}
              aria-pressed={viewMode === 'compact'}
              title="Compact list"
            >
              <List size={16} className="shrink-0" />
              <span className="hidden md:inline">Compact</span>
            </button>
          </div>
        </div>
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
                    <p className="text-base font-extrabold text-blue-700 mt-1.5">{formatCurrency(item.medicine.price)}</p>
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

      {/* Results Count — hide when error so retry is the primary action */}
      {!fetchError && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-500 font-medium">
            {totalCount > 0 && medicines.length < totalCount
              ? `Showing ${filtered.length} of ${totalCount.toLocaleString()} medicines`
              : `${filtered.length} medicine${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchMedicines(search, undefined, 0)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all" aria-label="Refresh medicine list"><RefreshCw size={12} />Refresh</motion.button>
        </div>
      )}

      {/* Error state with retry */}
      {fetchError && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-600" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Could not load medicines</p>
              <p className="text-xs text-amber-700 mt-1 max-w-sm">{fetchError}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors shadow-sm"
              aria-label="Retry loading medicines"
            >
              <RefreshCw size={16} />
              Try again
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Medicine Grid */}
      {loading && !fetchError ? (
        <div className={cn(
          viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3" :
          viewMode === 'compact' ? "flex flex-col gap-2" :
          "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        )}>
          {[...Array(viewMode === 'compact' ? 10 : 6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100/80 p-4 animate-pulse">
              <div className="flex justify-between mb-3"><div className="w-16 h-6 bg-slate-100 rounded-lg" /><div className="w-16 h-5 bg-slate-100 rounded-lg" /></div>
              <div className="w-3/4 h-4 bg-slate-100 rounded-lg mb-2" />
              <div className="w-1/2 h-3 bg-slate-100 rounded-lg mb-4" />
              <div className="w-1/3 h-7 bg-slate-100 rounded-lg mt-4" />
              <div className="w-full h-10 bg-slate-100 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : fetchError ? null : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 sm:py-20" role="status" aria-live="polite">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-slate-300" aria-hidden />
          </div>
          <p className="text-base font-semibold text-slate-600">No medicines found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            {search || selectedAgency ? 'Try a different search or clear filters to see more.' : 'No items match this category.'}
          </p>
          {(search || selectedAgency) && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSearch(''); setSelectedAgency(''); setCategory('All'); fetchMedicines('', '', 0); }}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
            >
              Clear filters
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className={cn(
          viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3" :
          viewMode === 'compact' ? "flex flex-col gap-2" :
          "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        )}>
          {filtered.map((med, i) => {
            const cartItem = items.find(ci => ci.medicine.id === med.id);
            return (
              <MedicineCard
                key={med.id}
                med={med}
                viewMode={viewMode}
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

      {/* Load more — when there are more results than currently loaded */}
      {!fetchError && filtered.length > 0 && medicines.length < totalCount && (
        <div className="flex justify-center pt-4 pb-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchMedicines(search, undefined, medicines.length)}
            disabled={loadingMore}
            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : `Load more (${totalCount - medicines.length} left)`}
          </motion.button>
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
