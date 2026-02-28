
import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, CheckCircle, Package, ShieldCheck, Store, Loader2, AlertCircle, ShoppingBag, Search } from 'lucide-react';
import { Order, OrderItem } from '../../types';

export const CartPage = () => {
  const { items, updateQty, removeItem, clearCart } = useCartStore();
  const { retailer } = useAuthStore();
  const { placeOrder } = useDataStore();
  const navigate = useNavigate();
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Use reliable calculation from items directly
  const subTotal = items.reduce((sum, item) => sum + ((item as any).medicine?.price * item.qty || (item as any).unit_price * item.qty || 0), 0);
  const gstAmount = subTotal * 0.12;
  const total = subTotal + gstAmount;

  const availableCredit = (retailer?.credit_limit || 0) - (retailer?.current_balance || 0);
  const isCreditExceeded = (retailer?.credit_limit || 0) > 0 && total > availableCredit;
  const creditUsedPercent = retailer?.credit_limit ? (retailer.current_balance / retailer.credit_limit) * 100 : 0;

  // Group items by wholesaler — filter out medicines with no wholesaler_id
  const itemsByWholesaler = items.reduce((acc, item) => {
    const wsId = (item as any).medicine?.wholesaler_id || (item as any).ws_id;
    if (!wsId) return acc;
    if (!acc[wsId]) acc[wsId] = [];
    acc[wsId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const handlePlaceOrder = async () => {
    if (!retailer || placing) return;
    setPlacing(true);
    setPlaceError(null);

    try {
      // Create a separate order for each wholesaler
      for (const [wsId, wsItems] of Object.entries(itemsByWholesaler)) {
        const wsSubTotal = wsItems.reduce((sum, item) => {
          const price = (item as any).medicine?.price || (item as any).unit_price || 0;
          return sum + (price * item.qty);
        }, 0);
        const wsTaxTotal = wsSubTotal * 0.12;
        const wsTotal = wsSubTotal + wsTaxTotal;

        const orderItems: OrderItem[] = wsItems.map(cartItem => {
          const price = (cartItem as any).medicine?.price || (cartItem as any).unit_price || 0;
          const mrp = (cartItem as any).medicine?.mrp || (cartItem as any).mrp || 0;
          const name = (cartItem as any).medicine?.name || (cartItem as any).medicine_name || '';
          const medId = (cartItem as any).medicine?.id || (cartItem as any).medicine_id || '';
          const gstRate = (cartItem as any).medicine?.gst_rate || (cartItem as any).gst_rate || 12;
          const hsnCode = (cartItem as any).medicine?.hsn_code || (cartItem as any).hsn_code || '';

          const taxable = price * cartItem.qty;
          const tax = taxable * (gstRate / 100);

          return {
            id: '',
            medicine_id: medId,
            medicine_name: name,
            qty: cartItem.qty,
            mrp: mrp,
            unit_price: price,
            discount_percent: 0,
            discount_amount: 0,
            total_price: taxable + tax,
            hsn_code: hsnCode,
            gst_rate: gstRate,
            taxable_value: taxable,
            tax_amount: tax
          };
        });

        const newOrder: Order = {
          id: '',
          wholesaler_id: wsId,
          retailer_id: retailer.id,
          retailer_name: retailer.shop_name,
          status: 'PENDING',
          sub_total: wsSubTotal,
          tax_total: wsTaxTotal,
          total_amount: wsTotal,
          items: orderItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await placeOrder(newOrder);
      }

      clearCart();
      setPlaced(true);
      setTimeout(() => navigate('/shop/orders'), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to place order. Please try again.';
      setPlaceError(msg);
    } finally {
      setPlacing(false);
    }
  };

  const getSupplierName = (wsId: string) => {
    const item = items.find((i) => ((i as any).medicine?.wholesaler_id || (i as any).ws_id) === wsId);
    return (item as any)?.medicine?.wholesaler?.name || (item as any)?.ws_name || `Supplier (${wsId.slice(-6)})`;
  };

  if (placed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[40px] opacity-20 animate-pulse" />
          <div className="w-28 h-28 bg-emerald-50 border border-emerald-100 rounded-[32px] flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/20 relative z-10 rotate-3">
            <CheckCircle size={56} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-3">Orders Confirmed!</h2>
        <p className="text-slate-500 text-lg font-medium max-w-md">Your orders have been successfully sent to the respective agencies. Redirecting to your orders...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
        <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-300 mb-8 border border-slate-100 shadow-xl shadow-slate-200/50">
          <ShoppingBag size={56} strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Your Cart is Empty</h2>
        <p className="text-slate-500 text-lg font-medium mb-10">Looks like you haven't added any medicines to your cart yet.</p>
        <button
          onClick={() => navigate('/shop')}
          className="bg-emerald-600 text-white px-10 py-4 rounded-[20px] font-bold text-lg shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
        >
          <Search size={20} /> Browse Medicines
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">Review Order</h1>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold tracking-widest uppercase border border-emerald-200 shadow-sm">{items.length} Items</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-10">

        {/* Left Column: Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(itemsByWholesaler).map(([wsId, wsItems], idx) => (
            <div key={wsId} className="bg-white rounded-[32px] border border-slate-200/60 shadow-lg shadow-slate-200/40 overflow-hidden" style={{ animationDelay: `${idx * 100}ms` }}>

              <div className="bg-slate-50/50 p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
                    <Store size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Agency</p>
                    <h3 className="font-extrabold text-slate-800 text-base sm:text-lg tracking-tight">{getSupplierName(wsId)}</h3>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</p>
                  <p className="font-bold text-slate-700">{wsItems.length}</p>
                </div>
              </div>

              <div className="p-2 sm:p-4 opacity-100">
                {wsItems.map((item, index) => {
                  const medPrice = (item as any).medicine?.price || (item as any).unit_price || 0;
                  const medId = (item as any).medicine?.id || (item as any).medicine_id;
                  const medName = (item as any).medicine?.name || (item as any).medicine_name;
                  const medBrand = (item as any).medicine?.brand || (item as any).brand;

                  return (
                    <div key={medId} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[20px] transition-colors hover:bg-slate-50 ${index !== wsItems.length - 1 ? 'border-b border-slate-100/60' : ''}`}>

                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-200 shadow-sm shrink-0">
                          <Package size={24} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-800 text-base mb-1 truncate">{medName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">{medBrand}</span>
                            <span className="text-xs font-medium text-slate-400">PTR: <span className="font-bold text-slate-600">₹{medPrice.toFixed(2)}</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
                          <button onClick={() => updateQty(medId, item.qty - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors text-slate-500"><Minus size={14} strokeWidth={2.5} /></button>
                          <span className="text-sm font-black w-8 text-center text-slate-800">{item.qty}</span>
                          <button onClick={() => updateQty(medId, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors text-slate-500"><Plus size={14} strokeWidth={2.5} /></button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total</p>
                          <p className="font-black text-slate-800 text-lg leading-none">₹{(medPrice * item.qty).toFixed(2)}</p>
                        </div>
                        <button onClick={() => removeItem(medId)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-[14px] transition-all shrink-0">
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary Checkout */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#042F2E] via-[#064E3B] to-[#0D9488] p-6 sm:p-8 rounded-[32px] shadow-2xl shadow-emerald-900/20 sticky top-24 text-white relative overflow-hidden">

            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-300/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2 text-emerald-100">
              <ShieldCheck size={18} className="text-emerald-400" /> Order Summary
            </h3>

            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex justify-between text-sm font-medium text-emerald-100/80">
                <span>Subtotal</span>
                <span className="text-white font-bold">₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-emerald-100/80">
                <span>GST (Est. 12%)</span>
                <span className="text-white font-bold">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-emerald-700/50 pt-5 mt-5 flex justify-between items-end">
                <span className="font-bold text-emerald-100 text-sm tracking-wide">Total Payable</span>
                <span className="font-black text-white text-3xl tracking-tight">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl mb-8 border backdrop-blur-md relative z-10 ${isCreditExceeded ? 'bg-rose-500/20 border-rose-500/30' : 'bg-white/10 border-white/20'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isCreditExceeded ? 'text-rose-200' : 'text-emerald-100'}`}>Credit Available</p>
                <p className={`text-xs font-bold ${isCreditExceeded ? 'text-white' : 'text-white'}`}>₹{availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className={`w-full rounded-full h-1.5 overflow-hidden ${isCreditExceeded ? 'bg-rose-950/50' : 'bg-black/20'}`}>
                <div className={`h-full transition-all ${isCreditExceeded ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(creditUsedPercent, 100)}%` }}></div>
              </div>
              {isCreditExceeded && (
                <p className="text-[10.5px] text-rose-200 font-bold mt-3 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-400 shrink-0" /> Cart exceeds available credit
                </p>
              )}
            </div>

            {placeError && (
              <div className="flex items-start gap-2 bg-rose-500/20 border border-rose-500/30 rounded-2xl p-4 mb-6 text-xs text-rose-100 font-medium relative z-10 backdrop-blur-md">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{placeError}</span>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing || Object.keys(itemsByWholesaler).length === 0 || isCreditExceeded}
              className="w-full py-4 bg-white text-emerald-900 rounded-[20px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all shadow-xl shadow-black/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group relative z-10"
            >
              {placing ? <><Loader2 size={18} className="animate-spin text-emerald-600" /> Confirming…</> : <>Confirm {Object.keys(itemsByWholesaler).length} Order{Object.keys(itemsByWholesaler).length !== 1 ? 's' : ''} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-emerald-600" /></>}
            </button>
            <p className="text-[10px] text-center text-emerald-200/60 mt-5 font-bold tracking-widest uppercase relative z-10">Orders will be split by supplier automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
};
