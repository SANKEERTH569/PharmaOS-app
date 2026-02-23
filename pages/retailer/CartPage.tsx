
import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, CheckCircle, Package, ShieldCheck, Store, Loader2, AlertCircle } from 'lucide-react';
import { Order, OrderItem } from '../../types';

export const CartPage = () => {
  const { items, updateQty, removeItem, totalAmount, clearCart } = useCartStore();
  const { retailer } = useAuthStore();
  const { placeOrder } = useDataStore();
  const navigate = useNavigate();
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const subTotal = totalAmount();
  const gstAmount = subTotal * 0.12; 
  const total = subTotal + gstAmount;

  // Group items by wholesaler — filter out medicines with no wholesaler_id
  const itemsByWholesaler = items.reduce((acc, item) => {
    const wsId = item.medicine.wholesaler_id;
    if (!wsId) return acc; // skip catalog-only medicines
    if (!acc[wsId]) acc[wsId] = [];
    acc[wsId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const handlePlaceOrder = async () => {
    if (!retailer || placing) return;
    setPlacing(true);
    setPlaceError(null);

    try {
      // Create a separate order for each wholesaler — awaited one by one
      for (const [wsId, wsItems] of Object.entries(itemsByWholesaler)) {
        const wsSubTotal = wsItems.reduce((sum, item) => sum + (item.medicine.price * item.qty), 0);
        const wsTaxTotal = wsSubTotal * 0.12;
        const wsTotal = wsSubTotal + wsTaxTotal;

        const orderItems: OrderItem[] = wsItems.map(cartItem => {
            const taxable = cartItem.medicine.price * cartItem.qty;
            const tax = taxable * (cartItem.medicine.gst_rate / 100);
            return {
                id: '',
                medicine_id: cartItem.medicine.id,
                medicine_name: cartItem.medicine.name,
                qty: cartItem.qty,
                mrp: cartItem.medicine.mrp,
                unit_price: cartItem.medicine.price,
                discount_percent: 0,
                discount_amount: 0,
                total_price: taxable + tax,
                hsn_code: cartItem.medicine.hsn_code,
                gst_rate: cartItem.medicine.gst_rate,
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
    // Use the wholesaler name from one of the items that belongs to this wholesaler
    const item = items.find((i) => i.medicine.wholesaler_id === wsId);
    return (item?.medicine as any)?.wholesaler?.name || `Supplier (${wsId.slice(-6)})`;
  };

  if (placed) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-200">
                <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Orders Placed Successfully!</h2>
            <p className="text-slate-500 mb-8 font-medium">We have sent separate orders to each supplier. Redirecting...</p>
        </div>
    );
  }

  if (items.length === 0) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border border-slate-100">
                <Package size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Your Cart is Empty</h2>
            <p className="text-slate-500 mb-8 font-medium">Looks like you haven't added any medicines yet.</p>
            <button 
                onClick={() => navigate('/shop')}
                className="bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:-translate-y-1"
            >
                Start Ordering
            </button>
        </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <h1 className="text-3xl font-black text-slate-900 mb-8">Review Order</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {Object.entries(itemsByWholesaler).map(([wsId, wsItems]) => (
               <div key={wsId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                      <Store size={18} className="text-slate-500" />
                      <span className="font-bold text-slate-700">Supplier: {getSupplierName(wsId)}</span>
                      <span className="ml-auto text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">{wsItems.length} Items</span>
                   </div>
                   <div className="p-4 space-y-4">
                      {wsItems.map(item => (
                          <div key={item.medicine.id} className="flex gap-4 items-center group">
                              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100 shrink-0">
                                  <Package size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-slate-900 text-sm truncate">{item.medicine.name}</h3>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.medicine.brand}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                      <button onClick={() => updateQty(item.medicine.id, item.qty - 1)} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500"><Minus size={12} /></button>
                                      <span className="text-xs font-bold w-6 text-center text-slate-900">{item.qty}</span>
                                      <button onClick={() => updateQty(item.medicine.id, item.qty + 1)} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500"><Plus size={12} /></button>
                                  </div>
                                  <div className="text-right w-20">
                                      <p className="font-black text-slate-900 text-sm">₹{(item.medicine.price * item.qty).toFixed(2)}</p>
                                  </div>
                                  <button onClick={() => removeItem(item.medicine.id)} className="text-rose-300 hover:text-rose-600 transition-colors">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                   </div>
               </div>
            ))}
        </div>

        <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24">
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm mb-6 flex items-center gap-2">
                   <ShieldCheck size={18} className="text-emerald-500" /> Order Summary
                </h3>
                
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>Subtotal</span>
                        <span className="text-slate-900">₹{subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>GST (Est. 12%)</span>
                        <span className="text-slate-900">₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t-2 border-dashed border-slate-100 pt-4 flex justify-between items-end">
                        <span className="font-bold text-slate-900 text-sm">Total Payable</span>
                        <span className="font-black text-slate-900 text-2xl">₹{total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Credit Available</p>
                       <p className="text-xs font-bold text-blue-700">₹{(retailer?.credit_limit || 0) - (retailer?.current_balance || 0)}</p>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                       <div className="bg-blue-500 h-full w-3/4"></div>
                    </div>
                </div>

                {placeError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700 font-medium">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                    {placeError}
                  </div>
                )}

                <button 
                    onClick={handlePlaceOrder}
                    disabled={placing || Object.keys(itemsByWholesaler).length === 0}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/20 hover:shadow-emerald-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-900 disabled:active:scale-100"
                >
                    {placing ? <><Loader2 size={16} className="animate-spin" /> Placing Orders…</> : <>Confirm {Object.keys(itemsByWholesaler).length} Orders <ArrowRight size={16} /></>}
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-4 font-medium">Orders will be split by supplier automatically.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
