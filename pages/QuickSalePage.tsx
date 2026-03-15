import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Plus, Trash2, ShoppingBag, User, X, Minus,
  CheckCircle2, AlertTriangle, ArrowLeft, FileText,
  Store, Package, Hash, Percent, IndianRupee,
  ChevronDown, Sparkles, Zap, ReceiptText, Tag, Gift
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { InvoiceModal } from '../components/InvoiceModal';
import { Medicine, Retailer, Order } from '../types';

interface SaleItem {
  medicine: Medicine;
  qty: number | '';
  unit_price: number | '';
  discount_percent: number | '';
}

export const QuickSalePage = () => {
  const { retailers, medicines, schemes, createQuickSale } = useDataStore();
  const { wholesaler } = useAuthStore();
  const navigate = useNavigate();

  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [retailerSearch, setRetailerSearch] = useState('');
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);

  const [items, setItems] = useState<SaleItem[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const retailerRef = useRef<HTMLDivElement>(null);
  const medRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (retailerRef.current && !retailerRef.current.contains(e.target as Node)) setShowRetailerDropdown(false);
      if (medRef.current && !medRef.current.contains(e.target as Node)) setShowMedDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeRetailers = useMemo(() => retailers.filter(r => r.is_active), [retailers]);

  const filteredRetailers = useMemo(() => {
    if (!retailerSearch.trim()) return activeRetailers.slice(0, 10);
    const q = retailerSearch.toLowerCase();
    return activeRetailers.filter(r =>
      r.shop_name.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.phone.includes(q)
    ).slice(0, 10);
  }, [activeRetailers, retailerSearch]);

  const myMedicines = useMemo(() =>
    medicines.filter(m => m.wholesaler_id === wholesaler?.id && m.is_active && m.stock_qty > 0),
    [medicines, wholesaler]
  );

  const filteredMeds = useMemo(() => {
    if (!medSearch.trim()) return myMedicines.slice(0, 15);
    const q = medSearch.toLowerCase();
    return myMedicines.filter(m =>
      m.name.toLowerCase().includes(q) || (m.salt && m.salt.toLowerCase().includes(q)) || (m.brand && m.brand.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [myMedicines, medSearch]);

  const addItem = (med: Medicine) => {
    if (items.find(i => i.medicine.id === med.id)) return;
    setItems(prev => [...prev, { medicine: med, qty: 1, unit_price: med.price, discount_percent: 0 }]);
    setMedSearch('');
    setShowMedDropdown(false);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof SaleItem, value: number | '') => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[idx], [field]: value };
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unit_price || 0);

      // Re-evaluate schemes if qty changed
      if (field === 'qty') {
        const activeSchemes = schemes.filter(s => s.medicine_id === item.medicine.id && s.is_active);

        // Prioritize BOGO, then HALF_SCHEME. Assuming only one applies at a time for simplicity.
        const scheme = activeSchemes.find(s => s.type === 'BOGO' || s.type === 'HALF_SCHEME');

        if (scheme && scheme.min_qty && scheme.free_qty && qty >= scheme.min_qty && unitPrice > 0) {
          if (scheme.type === 'BOGO') {
            // Give full value of 'free_qty' items as a discount.
            // e.g. Buy 10, Free 1. Qty = 10. Discount Amount = 1 * unit_price
            const times = Math.floor(qty / scheme.min_qty);
            // We apply this as a discount percent so it maps to the UI cleanly
            const freeValue = times * scheme.free_qty * unitPrice;
            const grossValue = qty * unitPrice;
            item.discount_percent = parseFloat(((freeValue / grossValue) * 100).toFixed(2));
          } else if (scheme.type === 'HALF_SCHEME') {
            // Buy X, get Y equivalent monetary discount
            const times = Math.floor(qty / scheme.min_qty);
            const discountEquivalent = times * scheme.free_qty * unitPrice;
            const grossValue = qty * unitPrice;
            item.discount_percent = parseFloat(((discountEquivalent / grossValue) * 100).toFixed(2));
          }
        } else {
          // Reset discount if they fall below scheme threshold (assuming they didn't manually set it)
          // Only reset if they were given an auto discount. For safety, if they manually typed a discount, let's leave it, 
          // but if they just drop qty, maybe reset to 0. We'll simply reset to 0 for now.
          item.discount_percent = 0;
        }
      }

      newItems[idx] = item;
      return newItems;
    });
  };

  const totals = useMemo(() => {
    let subTotal = 0, taxTotal = 0, discTotal = 0;
    items.forEach(item => {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unit_price || 0);
      const discountPct = Number(item.discount_percent || 0);
      const gross = unitPrice * qty;
      const discountAmt = gross * (discountPct / 100);
      const taxable = gross - discountAmt;
      const gstRate = parseFloat(item.medicine.gst_rate as any) || 12;
      const tax = taxable * (gstRate / 100);
      subTotal += taxable;
      taxTotal += tax;
      discTotal += discountAmt;
    });

    const activeCashDiscount = schemes.find(s => s.type === 'CASH_DISCOUNT' && s.is_active);

    // If a global cash discount exists, subtract it from the final subtotal
    let finalSubTotal = subTotal;
    let cashDiscountAmount = 0;

    if (activeCashDiscount && activeCashDiscount.discount_pct) {
      cashDiscountAmount = finalSubTotal * (activeCashDiscount.discount_pct / 100);
      finalSubTotal -= cashDiscountAmount;
      // Note: Depending on accounting, GST might be calculated on pre or post cash discount.
      // Usually, trade discounts affect GST, cash discounts do not (they happen at payment time).
      // Here we apply it as a trade discount for simplicity of the invoice.
      // We'll just show it in the totals for now.
    }

    return {
      subTotal,
      taxTotal,
      discTotal: discTotal + cashDiscountAmount,
      cashDiscountAmount,
      cashDiscountPct: activeCashDiscount?.discount_pct || 0,
      total: subTotal - cashDiscountAmount + taxTotal
    };
  }, [items, schemes]);

  const handleSubmit = async () => {
    if (!selectedRetailer) { setError('Please select a retailer'); return; }
    if (items.length === 0) { setError('Please add at least one medicine'); return; }
    setError('');
    for (const [idx, item] of items.entries()) {
      const qty = Number(item.qty);
      const unitPrice = Number(item.unit_price);
      const discountPct = Number(item.discount_percent || 0);
      if (!Number.isFinite(qty) || qty <= 0) { setError(`Item ${idx + 1}: enter a valid quantity`); return; }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) { setError(`Item ${idx + 1}: enter a valid unit price`); return; }
      if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) { setError(`Item ${idx + 1}: discount must be between 0 and 100`); return; }
    }
    setSubmitting(true);
    try {
      const order = await createQuickSale({
        retailer_id: selectedRetailer.id,
        notes: totals.cashDiscountAmount > 0
          ? `[Applied ${totals.cashDiscountPct}% Cash Discount = ₹${totals.cashDiscountAmount.toFixed(2)}] ${notes}`
          : notes,
        payment_terms: totals.cashDiscountAmount > 0 ? `Includes ${totals.cashDiscountPct}% Cash Discount` : undefined,
        items: items.map(i => {
          const globalCashDiscount = totals.cashDiscountPct > 0 ? totals.cashDiscountPct : 0;
          const qty = Number(i.qty);
          const unitPrice = Number(i.unit_price);
          const discountPct = Number(i.discount_percent || 0);
          const finalDiscountPct = Math.min(100, discountPct + globalCashDiscount);
          return {
            medicine_id: i.medicine.id,
            medicine_name: i.medicine.name,
            qty,
            mrp: i.medicine.mrp,
            unit_price: unitPrice,
            gst_rate: parseFloat(i.medicine.gst_rate as any) || 12,
            hsn_code: i.medicine.hsn_code || '3004',
            discount_percent: finalDiscountPct,
            discount_amount: unitPrice * qty * (finalDiscountPct / 100),
          };
        }),
      });
      setCreatedOrder(order);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setCreatedOrder(null);
    setSelectedRetailer(null);
    setItems([]);
    setNotes('');
    setRetailerSearch('');
  };

  /* ── Success / Invoice View ── */
  if (createdOrder && selectedRetailer) {
    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 shadow-xl shadow-emerald-500/10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/10">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-extrabold text-white tracking-tight">Sale Created Successfully!</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                <span className="text-sm text-white/80 font-medium flex items-center gap-1.5">
                  <ReceiptText size={13} /> {createdOrder.invoice_no}
                </span>
                <span className="text-sm text-white/80 font-medium flex items-center gap-1.5">
                  <IndianRupee size={13} /> ₹{createdOrder.total_amount.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-white/80 font-medium flex items-center gap-1.5">
                  <Package size={13} /> {createdOrder.items.length} items
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleNewSale} className="px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20">
                + New Sale
              </button>
              <button onClick={() => navigate('/orders')} className="px-5 py-2.5 bg-white text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-lg shadow-black/5">
                View Orders
              </button>
            </div>
          </div>
        </div>
        <InvoiceModal order={createdOrder} retailer={selectedRetailer} onClose={handleNewSale} variant="inline" />
      </div>
    );
  }

  /* ── Step indicator data ── */
  const step = !selectedRetailer ? 1 : items.length === 0 ? 2 : 3;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all shadow-sm">
            <ArrowLeft size={16} className="text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Quick Sale</h1>
              <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md">
                New
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Create invoice → Auto-accept → Deduct stock</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded-xl px-4 py-2 shadow-sm">
          {[
            { n: 1, label: 'Retailer' },
            { n: 2, label: 'Items' },
            { n: 3, label: 'Review' },
          ].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              {i > 0 && <div className={`w-6 h-[2px] rounded-full ${step >= n ? 'bg-emerald-400' : 'bg-slate-200'} transition-colors`} />}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-400'
                  }`}>
                  {step > n ? <CheckCircle2 size={12} /> : n}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:inline ${step >= n ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ══════ LEFT PANEL ══════ */}
        <div className="lg:col-span-8 space-y-4">

          {/* ── 1. Retailer Selection ── */}
          <div className={`bg-white rounded-2xl border shadow-sm transition-all ${selectedRetailer ? 'border-emerald-200/60' : 'border-indigo-200/60 ring-1 ring-indigo-500/10'
            }`}>
            <div className={`px-5 py-3.5 flex items-center gap-3 border-b ${selectedRetailer ? 'border-emerald-100 bg-emerald-50/30' : 'border-indigo-100 bg-indigo-50/30'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedRetailer ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'
                } shadow-sm`}>
                {selectedRetailer ? <CheckCircle2 size={14} className="text-white" /> : <User size={14} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {selectedRetailer ? 'Retailer Selected' : 'Step 1 — Select Retailer'}
                </p>
              </div>
              {selectedRetailer && (
                <button onClick={() => { setSelectedRetailer(null); setRetailerSearch(''); }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Change
                </button>
              )}
            </div>
            <div className="p-4" ref={retailerRef}>
              {selectedRetailer ? (
                <div className="flex items-center gap-4 p-3.5 bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md shadow-indigo-500/15">
                    {selectedRetailer.shop_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{selectedRetailer.shop_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedRetailer.name} · {selectedRetailer.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Credit Left</p>
                    <p className={`text-sm font-extrabold ${(selectedRetailer.credit_limit - selectedRetailer.current_balance) > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                      ₹{(selectedRetailer.credit_limit - selectedRetailer.current_balance).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={retailerSearch}
                    onChange={e => { setRetailerSearch(e.target.value); setShowRetailerDropdown(true); }}
                    onFocus={() => setShowRetailerDropdown(true)}
                    placeholder="Search by shop name, owner, or phone..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    autoFocus
                  />
                  {showRetailerDropdown && filteredRetailers.length > 0 && (
                    <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200/80 rounded-xl shadow-2xl shadow-black/8 max-h-64 overflow-y-auto">
                      {filteredRetailers.map(r => (
                        <button
                          key={r.id}
                          onClick={() => { setSelectedRetailer(r); setShowRetailerDropdown(false); setRetailerSearch(''); }}
                          className="w-full px-4 py-3 text-left hover:bg-indigo-50/60 transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 font-bold text-sm transition-colors shrink-0">
                            {r.shop_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{r.shop_name}</p>
                            <p className="text-[11px] text-slate-400">{r.name} · {r.phone}</p>
                          </div>
                          <ChevronDown size={13} className="text-slate-300 -rotate-90 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Medicine Search ── */}
          <div className={`bg-white rounded-2xl border shadow-sm transition-all ${!selectedRetailer ? 'opacity-50 pointer-events-none border-slate-200/60' : 'border-slate-200/60'
            }`}>
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <ShoppingBag size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Step 2 — Add Medicines</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                <Package size={11} className="text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700">{myMedicines.length} in stock</span>
              </div>
            </div>
            <div className="p-4" ref={medRef}>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={medSearch}
                  onChange={e => { setMedSearch(e.target.value); setShowMedDropdown(true); }}
                  onFocus={() => setShowMedDropdown(true)}
                  placeholder="Type to search medicines by name, salt, brand..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all"
                />
                {showMedDropdown && filteredMeds.length > 0 && (
                  <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200/80 rounded-xl shadow-2xl shadow-black/8 max-h-80 overflow-y-auto">
                    {filteredMeds.map(m => {
                      const alreadyAdded = items.some(i => i.medicine.id === m.id);
                      return (
                        <button
                          key={m.id}
                          disabled={alreadyAdded}
                          onClick={() => addItem(m)}
                          className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${alreadyAdded ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:bg-emerald-50/60 group'
                            }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${alreadyAdded ? 'bg-slate-100' : 'bg-emerald-50 group-hover:bg-emerald-100'
                            }`}>
                            {alreadyAdded
                              ? <CheckCircle2 size={14} className="text-slate-300" />
                              : <Plus size={14} className="text-emerald-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              {m.brand && <span className="text-[10px] text-slate-400">{m.brand}</span>}
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400">MRP ₹{m.mrp}</span>
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">{m.stock_qty} in stock</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-bold text-emerald-600">₹{m.price}</p>
                            <p className="text-[10px] text-slate-400">GST {m.gst_rate}%</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Items Table ── */}
          {items.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                    <Hash size={11} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{items.length} Item{items.length !== 1 ? 's' : ''} Added</p>
                </div>
                <button onClick={() => setItems([])} className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline">
                  Clear All
                </button>
              </div>

              {/* Desktop table header */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div className="col-span-4">Product</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-center">Rate (₹)</div>
                <div className="col-span-1 text-center">Disc %</div>
                <div className="col-span-1 text-center">GST</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-slate-100/60">
                {items.map((item, idx) => {
                  const qty = Number(item.qty || 0);
                  const unitPrice = Number(item.unit_price || 0);
                  const discountPct = Number(item.discount_percent || 0);
                  const gross = unitPrice * qty;
                  const discAmt = gross * (discountPct / 100);
                  const taxable = gross - discAmt;
                  const gstRate = parseFloat(item.medicine.gst_rate as any) || 12;
                  const tax = taxable * (gstRate / 100);
                  const lineTotal = taxable + tax;
                  const isOverStock = qty > item.medicine.stock_qty;

                  return (
                    <div key={item.medicine.id} className={`px-5 py-3.5 hover:bg-slate-50/50 transition-colors ${isOverStock ? 'bg-rose-50/30' : ''}`}>

                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{item.medicine.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">MRP ₹{item.medicine.mrp}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isOverStock ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                              Stock: {item.medicine.stock_qty}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-center">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                            <button onClick={() => updateItem(idx, 'qty', Math.max(1, Number(item.qty || 0) - 1))}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              <Minus size={12} />
                            </button>
                            <input
                              type="number" min={1} max={item.medicine.stock_qty} value={item.qty}
                              onChange={e => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  updateItem(idx, 'qty', '');
                                  return;
                                }
                                const nextQty = Math.max(1, Math.min(item.medicine.stock_qty, parseInt(raw, 10)));
                                updateItem(idx, 'qty', nextQty);
                              }}
                              className="w-12 text-center py-1 text-sm font-bold bg-white border-x border-slate-200 outline-none"
                            />
                            <button onClick={() => updateItem(idx, 'qty', Math.min(item.medicine.stock_qty, Number(item.qty || 0) + 1))}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-center">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">₹</span>
                            <input
                              type="number" step={0.01} min={0} value={item.unit_price}
                              onChange={e => {
                                const raw = e.target.value;
                                updateItem(idx, 'unit_price', raw === '' ? '' : Math.max(0, parseFloat(raw)));
                              }}
                              className="w-24 text-center pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <div className="relative">
                            <input
                              type="number" step={0.5} min={0} max={100} value={item.discount_percent}
                              onChange={e => {
                                const raw = e.target.value;
                                updateItem(idx, 'discount_percent', raw === '' ? '' : Math.max(0, Math.min(100, parseFloat(raw))));
                              }}
                              className="w-14 text-center pr-4 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                          </div>
                        </div>

                        <div className="col-span-1 text-center">
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{item.medicine.gst_rate}%</span>
                        </div>

                        <div className="col-span-1 text-right">
                          <p className="text-sm font-extrabold text-slate-800">₹{lineTotal.toFixed(0)}</p>
                          {discAmt > 0 && <p className="text-[10px] text-emerald-600 font-medium">-₹{discAmt.toFixed(0)}</p>}
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <div className="flex flex-col items-end gap-1">
                            {Number(item.discount_percent || 0) > 0 && schemes.some(s => s.medicine_id === item.medicine.id && s.is_active && qty >= (s.min_qty || 999)) && (
                              <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mb-1">Scheme Applied</span>
                            )}
                            <button onClick={() => removeItem(idx)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{item.medicine.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">MRP ₹{item.medicine.mrp}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">Stock: {item.medicine.stock_qty}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">GST {item.medicine.gst_rate}%</span>
                            </div>
                          </div>
                          <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Qty</label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                              <button onClick={() => updateItem(idx, 'qty', Math.max(1, Number(item.qty || 0) - 1))} className="p-1.5 text-slate-400"><Minus size={11} /></button>
                              <input type="number" min={1} value={item.qty} onChange={e => {
                                const raw = e.target.value;
                                updateItem(idx, 'qty', raw === '' ? '' : Math.max(1, parseInt(raw, 10)));
                              }}
                                className="w-full text-center py-1 text-sm font-bold bg-white border-x border-slate-200 outline-none" />
                              <button onClick={() => updateItem(idx, 'qty', Math.min(item.medicine.stock_qty, Number(item.qty || 0) + 1))} className="p-1.5 text-slate-400"><Plus size={11} /></button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Rate ₹</label>
                            <input type="number" step={0.01} min={0} value={item.unit_price}
                              onChange={e => {
                                const raw = e.target.value;
                                updateItem(idx, 'unit_price', raw === '' ? '' : Math.max(0, parseFloat(raw)));
                              }}
                              className="w-full text-center py-1.5 border border-slate-200 rounded-lg text-sm font-semibold outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Disc %</label>
                            <input type="number" step={0.5} min={0} max={100} value={item.discount_percent}
                              onChange={e => {
                                const raw = e.target.value;
                                updateItem(idx, 'discount_percent', raw === '' ? '' : Math.max(0, Math.min(100, parseFloat(raw))));
                              }}
                              className="w-full text-center py-1.5 border border-slate-200 rounded-lg text-sm font-semibold outline-none" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <p className="text-sm font-extrabold text-slate-800">₹{lineTotal.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Items footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-slate-400">{items.reduce((s, i) => s + Number(i.qty || 0), 0)} total units</p>
                <p className="text-sm font-extrabold text-slate-800">Subtotal: ₹{totals.subTotal.toFixed(2)}</p>
              </div>
            </div>
          ) : selectedRetailer ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No items added yet</p>
              <p className="text-xs text-slate-400 mt-1">Use the search above to add medicines to this sale</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-200/40 p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100/80 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-indigo-700">Select a retailer first</p>
              <p className="text-xs text-indigo-400 mt-1">Choose who you're billing before adding items</p>
            </div>
          )}
        </div>

        {/* ══════ RIGHT PANEL — Summary ══════ */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-4">

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                  <ReceiptText size={15} className="text-indigo-500" />
                  <p className="text-sm font-bold text-slate-800">Invoice Summary</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Retailer mini card */}
                {selectedRetailer ? (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border border-indigo-100/60 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                      {selectedRetailer.shop_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedRetailer.shop_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{selectedRetailer.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-center">
                    <p className="text-xs text-slate-400 font-medium">No retailer selected</p>
                  </div>
                )}

                {/* Line items summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Package size={12} className="text-slate-400" />
                      Items ({items.length})
                    </span>
                    <span className="font-semibold text-slate-800">₹{(totals.subTotal + totals.discTotal).toFixed(2)}</span>
                  </div>
                  {totals.discTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <Tag size={12} />
                        Discount
                      </span>
                      <span className="font-semibold text-emerald-600">-₹{totals.discTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.cashDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <Gift size={12} />
                        Cash Discount ({totals.cashDiscountPct}%)
                      </span>
                      <span className="font-semibold text-emerald-600">-₹{totals.cashDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Percent size={12} className="text-slate-400" />
                      GST
                    </span>
                    <span className="font-semibold text-slate-800">₹{totals.taxTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Grand total */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 -mx-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">Grand Total</span>
                    <span className="text-xl font-extrabold text-white tracking-tight">₹{totals.total.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Incl. GST · Payment terms: NET 15</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any notes for this sale..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 animate-shake">
                    <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-rose-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0 || !selectedRetailer}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 group"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={15} className="group-hover:animate-pulse" />
                      Create Sale & Generate Invoice
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info card */}
            <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 rounded-xl border border-indigo-100/50 p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-indigo-800">How Quick Sale works</p>
                  <ul className="text-[10px] text-indigo-600/80 mt-1 space-y-0.5 leading-relaxed">
                    <li>• Order is auto-accepted with invoice number</li>
                    <li>• Stock is deducted from your inventory</li>
                    <li>• Retailer sees it in their order history</li>
                    <li>• Print or share the invoice immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
