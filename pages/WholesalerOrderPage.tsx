import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, Building2, ShoppingCart, Plus, Minus, Trash2,
  X, Loader2, CheckCircle, ArrowLeft, Package, Send,
  ChevronRight, Pill, FlaskConical, Syringe, Droplets,
  Wind, Package2, AlertCircle, Store, Phone, MapPin, Tag
} from 'lucide-react';
import api from '../utils/api';
import { MainWholesalerMedicine, MainWholesalerScheme } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MainWholesaler {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  gstin?: string | null;
}

interface CartItem {
  medicine_id: string;
  medicine_name: string;
  brand?: string | null;
  mrp?: number | null;
  unit_cost: number;
  qty_ordered: number;
}

// ── Medicine type helpers ─────────────────────────────────────────────────────
type MedType = 'tablet' | 'syrup' | 'injection' | 'cream' | 'inhaler' | 'powder';

function getMedType(name: string): MedType {
  const s = name.toLowerCase();
  if (s.includes('syrup') || s.includes('suspension') || s.includes('solution') || s.includes('drops')) return 'syrup';
  if (s.includes('injection') || s.includes('vial') || s.includes('ampoule') || s.includes('infusion')) return 'injection';
  if (s.includes('cream') || s.includes('gel') || s.includes('ointment') || s.includes('lotion')) return 'cream';
  if (s.includes('inhaler') || s.includes('rotacap') || s.includes('respule')) return 'inhaler';
  if (s.includes('sachet') || s.includes('powder')) return 'powder';
  return 'tablet';
}

const MED_ICON: Record<MedType, { Icon: React.ElementType; bg: string; color: string }> = {
  tablet: { Icon: Pill, bg: 'bg-blue-50', color: 'text-blue-500' },
  syrup: { Icon: FlaskConical, bg: 'bg-amber-50', color: 'text-amber-500' },
  injection: { Icon: Syringe, bg: 'bg-red-50', color: 'text-red-500' },
  cream: { Icon: Droplets, bg: 'bg-emerald-50', color: 'text-emerald-500' },
  inhaler: { Icon: Wind, bg: 'bg-purple-50', color: 'text-purple-500' },
  powder: { Icon: Package2, bg: 'bg-slate-50', color: 'text-slate-500' },
};

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────

export const WholesalerOrderPage = () => {
  const navigate = useNavigate();

  // ── Phase: 'browse-wholesalers' | 'browse-catalog' | 'success' ────────────
  const [phase, setPhase] = useState<'browse-wholesalers' | 'browse-catalog' | 'success'>('browse-wholesalers');

  // ── Wholesaler search ─────────────────────────────────────────────────────
  const [mwSearch, setMwSearch] = useState('');
  const [mwList, setMwList] = useState<MainWholesaler[]>([]);
  const [mwLoading, setMwLoading] = useState(false);
  const [selectedMW, setSelectedMW] = useState<MainWholesaler | null>(null);

  const debouncedMwSearch = useDebounce(mwSearch, 350);

  const fetchWholesalers = useCallback(async () => {
    setMwLoading(true);
    try {
      const { data } = await api.get('/main-wholesalers/list', {
        params: debouncedMwSearch ? { q: debouncedMwSearch } : {},
      });
      setMwList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setMwLoading(false);
    }
  }, [debouncedMwSearch]);

  useEffect(() => { fetchWholesalers(); }, [fetchWholesalers]);

  // ── Catalog ───────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<MainWholesalerMedicine[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const debouncedCatalogSearch = useDebounce(catalogSearch, 350);

  const fetchCatalog = useCallback(async () => {
    if (!selectedMW) return;
    setCatalogLoading(true);
    try {
      const { data } = await api.get(`/main-wholesalers/${selectedMW.id}/medicines`, {
        params: debouncedCatalogSearch ? { q: debouncedCatalogSearch } : {},
      });
      setCatalog(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  }, [selectedMW, debouncedCatalogSearch]);

  useEffect(() => {
    if (phase === 'browse-catalog') fetchCatalog();
  }, [fetchCatalog, phase]);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [successPONumber, setSuccessPONumber] = useState('');

  const cartTotal = cart.reduce((s, i) => s + i.unit_cost * i.qty_ordered, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty_ordered, 0);

  const addToCart = (med: MainWholesalerMedicine) => {
    setCart(prev => {
      const existing = prev.find(i => i.medicine_id === med.id);
      if (existing) {
        return prev.map(i => i.medicine_id === med.id ? { ...i, qty_ordered: i.qty_ordered + 1 } : i);
      }
      return [...prev, {
        medicine_id: med.id,
        medicine_name: med.medicine_name,
        brand: med.brand,
        mrp: med.mrp,
        unit_cost: med.price,
        qty_ordered: 1,
      }];
    });
  };

  const updateQty = (medicineId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.medicine_id === medicineId ? { ...i, qty_ordered: Math.max(0, i.qty_ordered + delta) } : i)
        .filter(i => i.qty_ordered > 0)
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(i => i.medicine_id !== medicineId));
  };

  const getCartQty = (medicineId: string) => {
    return cart.find(i => i.medicine_id === medicineId)?.qty_ordered ?? 0;
  };

  // ── Place Order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedMW || cart.length === 0) return;
    setPlaceError('');
    setPlacing(true);
    try {
      // 1. Create PO in DRAFT
      const { data: po } = await api.post('/purchase-orders', {
        supplier_name: selectedMW.name,
        supplier_phone: selectedMW.phone,
        supplier_gstin: selectedMW.gstin || undefined,
        notes: notes.trim() || undefined,
        main_wholesaler_id: selectedMW.id,
        items: cart.map(i => ({
          medicine_id: i.medicine_id,
          medicine_name: i.medicine_name,
          qty_ordered: i.qty_ordered,
          unit_cost: i.unit_cost,
        })),
      });

      // 2. Immediately mark as SENT → auto-creates supply order on MW's side
      await api.patch(`/purchase-orders/${po.id}`, { status: 'SENT' });

      setSuccessPONumber(po.po_number);
      setShowCart(false);
      setPhase('success');
    } catch (err: any) {
      setPlaceError(err?.response?.data?.error ?? 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const selectWholesaler = (mw: MainWholesaler) => {
    setSelectedMW(mw);
    setCart([]);
    setCatalogSearch('');
    setPhase('browse-catalog');
  };

  const backToWholesalers = () => {
    setSelectedMW(null);
    setCart([]);
    setPhase('browse-wholesalers');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Order Placed!</h1>
        <p className="text-slate-500 font-medium mb-1">
          Your order <span className="font-bold text-slate-800">{successPONumber}</span> has been sent to
        </p>
        <p className="text-lg font-bold text-indigo-700 mb-6">{selectedMW?.name}</p>
        <p className="text-sm text-slate-400 mb-8 max-w-sm">
          The wholesaler will review and accept your order. You can track its status in Purchase Orders.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Package size={16} /> Track Order
          </button>
          <button
            onClick={() => {
              setPhase('browse-wholesalers');
              setSelectedMW(null);
              setCart([]);
              setNotes('');
              setSuccessPONumber('');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Store size={16} /> Order More
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BROWSE WHOLESALERS SCREEN
  if (phase === 'browse-wholesalers') {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Order from Wholesaler</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Browse & order medicines directly from main wholesalers on PharmaOS
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search wholesaler by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 outline-none shadow-sm transition-all"
            value={mwSearch}
            onChange={e => setMwSearch(e.target.value)}
          />
        </div>

        {/* Wholesaler cards */}
        {mwLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : mwList.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No wholesalers found</p>
            {mwSearch && <p className="text-slate-400 text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mwList.map(mw => (
              <button
                key={mw.id}
                onClick={() => selectWholesaler(mw)}
                className="group text-left bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <Building2 size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">
                      {mw.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium">{mw.phone}</span>
                    </div>
                    {mw.address && (
                      <div className="flex items-start gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-400 truncate">{mw.address}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">View catalog & order</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Browse →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BROWSE CATALOG SCREEN
  const filteredCatalog = catalog.filter(m => m.is_active);

  return (
    <div className="space-y-5 animate-slide-up pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={backToWholesalers}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 truncate">{selectedMW!.name}</h1>
              <p className="text-xs text-slate-400 font-medium">{selectedMW!.phone}</p>
            </div>
          </div>
        </div>
        {/* Cart button */}
        <button
          onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all shrink-0"
        >
          <ShoppingCart size={16} />
          <span className="hidden sm:inline">Cart</span>
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Search catalog */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search medicines in this catalog..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none shadow-sm transition-all"
          value={catalogSearch}
          onChange={e => setCatalogSearch(e.target.value)}
        />
      </div>

      {/* Catalog grid */}
      {catalogLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="text-center py-20">
          <Pill size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">
            {catalogSearch ? `No results for "${catalogSearch}"` : 'No medicines in this catalog'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCatalog.map(med => {
            const qty = getCartQty(med.id);
            const t = getMedType(med.medicine_name);
            const { Icon, bg, color } = MED_ICON[t];
            const margin = med.mrp && med.mrp > 0 ? ((med.mrp - med.price) / med.mrp * 100) : 0;
            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Card body */}
                <div className="p-4 flex-1">
                  {/* Icon + type badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
                      <Icon size={18} />
                    </div>
                    {med.schemes && med.schemes.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-emerald-200 shadow-sm">
                        <Tag size={9} className="opacity-70" />
                        Offer
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                    {med.medicine_name}
                  </h3>

                  {/* Brand */}
                  {med.brand ? (
                    <p className="text-xs text-slate-400 mt-1 font-medium">{med.brand}</p>
                  ) : (
                    <p className="text-xs text-slate-300 mt-1">—</p>
                  )}

                  {/* Schemes */}
                  {med.schemes && med.schemes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {med.schemes.map(s => {
                        let badgeText = s.name;
                        if (s.type === 'BOGO') badgeText = `Buy ${s.min_qty} Get ${s.free_qty} Free`;
                        else if (s.type === 'CASH_DISCOUNT') badgeText = `${s.discount_pct}% Discount`;
                        else if (s.type === 'HALF_SCHEME') badgeText = 'Half Scheme';
                        return (
                          <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider rounded-md border border-indigo-100">
                            <Tag size={8} className="opacity-70" />
                            {badgeText}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100/60">
                    <div>
                      {med.mrp && med.mrp > 0 && (
                        <span className="text-[10px] text-slate-400 line-through block">MRP ₹{med.mrp.toFixed(2)}</span>
                      )}
                      <span className="text-lg font-extrabold text-indigo-700">₹{med.price.toFixed(2)}</span>
                    </div>
                    {margin > 5 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/60">
                        {margin.toFixed(0)}% off
                      </span>
                    )}
                  </div>
                </div>

                {/* Cart controls */}
                <div className="px-4 pb-4">
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(med)}
                      className="w-full py-2.5 text-xs font-bold text-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-indigo-100/50"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-1.5 border border-indigo-100/50">
                      <button
                        onClick={() => updateQty(med.id, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-indigo-100 text-indigo-600 transition-colors shadow-sm"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="text-sm font-extrabold text-indigo-700 tabular-nums">{qty}</span>
                      <button
                        onClick={() => updateQty(med.id, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-indigo-100 text-indigo-600 transition-colors shadow-sm"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky bottom bar when cart has items */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-indigo-500/40 hover:shadow-3xl transition-all font-bold"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart size={15} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-extrabold">{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</p>
                  <p className="text-xs text-indigo-200">{cart.length} product{cart.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CART DRAWER
      ═══════════════════════════════════════════════════════════════════ */}
      {showCart && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setShowCart(false)} />

          <div className="relative bg-white w-full sm:w-[420px] sm:h-full sm:max-h-screen rounded-t-3xl sm:rounded-none sm:rounded-l-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-900">Your Cart</h2>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full">{cart.length} items</span>
                )}
              </div>
              <button onClick={() => setShowCart(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Wholesaler tag */}
            <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100/60 shrink-0 flex items-center gap-2">
              <Building2 size={14} className="text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700">{selectedMW!.name}</span>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ShoppingCart size={40} className="mb-3 text-slate-200" />
                  <p className="font-medium">Cart is empty</p>
                  <p className="text-sm mt-1">Add medicines from the catalog</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.medicine_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.medicine_name}</p>
                      {item.brand && <p className="text-xs text-slate-400">{item.brand}</p>}
                      <p className="text-xs text-indigo-600 font-bold mt-0.5">₹{item.unit_cost.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.medicine_id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-sm font-extrabold">{item.qty_ordered}</span>
                      <button onClick={() => updateQty(item.medicine_id, 1)} className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <p className="text-sm font-extrabold text-slate-900">
                        ₹{(item.unit_cost * item.qty_ordered).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button onClick={() => removeFromCart(item.medicine_id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Notes + Summary + Place Order */}
            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 space-y-4 shrink-0">
                <textarea
                  placeholder="Order notes (e.g. delivery instructions, expected date)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 focus:bg-white transition-all"
                />

                {/* Order summary */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Items</span>
                    <span className="font-bold text-slate-700">{cartCount} units × {cart.length} products</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-indigo-700">₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {placeError && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>{placeError}</p>
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold rounded-xl hover:shadow-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {placing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {placing ? 'Placing Order…' : 'Place Order'}
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Order will be sent directly to {selectedMW!.name}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
