import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Trash2, Plus, Minus, Building2, ShoppingBag,
  CreditCard, AlertTriangle, Check, ArrowRight, Package,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

export const CartPage: React.FC = () => {
  const { items, updateQty, removeItem, clearCart, totalAmount } = useCartStore();
  const { placeOrder, fetchRetailerLedgerSummary, retailerLedgerSummary } = useDataStore();
  const { retailer } = useAuthStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  React.useEffect(() => { fetchRetailerLedgerSummary().catch(() => {}); }, []);

  // Group items by wholesaler
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const wid = item.medicine.wholesaler_id || 'unknown';
    (acc[wid] = acc[wid] || []).push(item);
    return acc;
  }, {});

  const subtotal = totalAmount();
  const gstAmount = subtotal * 0.12;
  const total = subtotal + gstAmount;

  const creditLimit = retailer?.credit_limit || retailerLedgerSummary?.global_credit_limit || 0;
  const currentBalance = retailer?.current_balance || retailerLedgerSummary?.global_current_balance || 0;
  const available = creditLimit - currentBalance;
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const exceeds = total > available && creditLimit > 0;

  const handlePlaceOrder = async () => {
    if (!retailer || placing) return;
    setPlacing(true);
    try {
      for (const [wholesalerId, groupItems] of Object.entries(grouped)) {
        const orderItems = groupItems.map(ci => ({
          id: crypto.randomUUID(),
          medicine_id: ci.medicine.id,
          medicine_name: ci.medicine.name,
          qty: ci.qty,
          mrp: ci.medicine.mrp,
          unit_price: ci.medicine.price,
          discount_percent: ci.medicine.mrp > 0 ? ((ci.medicine.mrp - ci.medicine.price) / ci.medicine.mrp * 100) : 0,
          discount_amount: (ci.medicine.mrp - ci.medicine.price) * ci.qty,
          total_price: ci.medicine.price * ci.qty,
          hsn_code: ci.medicine.hsn_code || '',
          gst_rate: ci.medicine.gst_rate || 12,
          taxable_value: ci.medicine.price * ci.qty,
          tax_amount: ci.medicine.price * ci.qty * (ci.medicine.gst_rate || 12) / 100,
        }));
        const sub_total = orderItems.reduce((s, i) => s + i.taxable_value, 0);
        const tax_total = orderItems.reduce((s, i) => s + i.tax_amount, 0);
        await placeOrder({
          wholesaler_id: wholesalerId,
          retailer_id: retailer.id,
          retailer_name: retailer.shop_name || retailer.name,
          status: 'PENDING',
          items: orderItems,
          sub_total, tax_total,
          total_amount: sub_total + tax_total,
        });
      }
      clearCart();
      setSuccess(true);
      setTimeout(() => navigate('/shop/orders'), 2000);
    } catch (e) {
      console.error('Order failed', e);
    }
    setPlacing(false);
  };

  if (success) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <Check size={36} className="text-emerald-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Order Placed!</h2>
        <p className="text-sm text-slate-500">Redirecting to orders...</p>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <ShoppingBag size={28} className="text-slate-400" />
        </div>
        <h2 className="text-base font-semibold text-slate-700 mb-1">Your cart is empty</h2>
        <p className="text-sm text-slate-400 mb-4">Browse the marketplace to add medicines</p>
        <button onClick={() => navigate('/shop')} className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-colors">
          Browse Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="lg:flex lg:gap-6">
      {/* Items */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-800">{items.length} item{items.length > 1 ? 's' : ''} in cart</h2>
          <button onClick={clearCart} className="text-xs text-rose-500 hover:text-rose-600 font-medium">Clear All</button>
        </div>

        {Object.entries(grouped).map(([wid, groupItems]) => {
          const supplierName = groupItems[0]?.medicine?.wholesaler?.name || 'Supplier';
          return (
            <div key={wid} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              {/* Supplier Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <Building2 size={14} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">{supplierName}</span>
                <span className="text-[10px] text-slate-400 ml-auto">{groupItems.length} item{groupItems.length > 1 ? 's' : ''}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-50">
                <AnimatePresence>
                  {groupItems.map(ci => (
                    <motion.div key={ci.medicine.id} layout exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Package size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{ci.medicine.name}</p>
                        <p className="text-xs text-slate-400">{ci.medicine.brand} · ₹{ci.medicine.price.toFixed(2)}/unit</p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 rounded-lg">
                        <button onClick={() => ci.qty <= 1 ? removeItem(ci.medicine.id) : updateQty(ci.medicine.id, ci.qty - 1)}
                          className="p-1.5 hover:bg-slate-100 rounded-l-lg transition-colors"><Minus size={12} className="text-slate-500" /></button>
                        <span className="w-7 text-center text-xs font-bold text-slate-700">{ci.qty}</span>
                        <button onClick={() => updateQty(ci.medicine.id, ci.qty + 1)}
                          className="p-1.5 hover:bg-slate-100 rounded-r-lg transition-colors"><Plus size={12} className="text-slate-500" /></button>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-semibold text-slate-800">₹{(ci.medicine.price * ci.qty).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeItem(ci.medicine.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1">
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Notes */}
              <div className="px-4 pb-3 pt-1">
                <input
                  value={notes[wid] || ''}
                  onChange={e => setNotes(p => ({ ...p, [wid]: e.target.value }))}
                  placeholder="Add order notes (optional)"
                  className="w-full text-xs text-slate-600 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary - Sticky */}
      <div className="lg:w-[340px] mt-4 lg:mt-0">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 lg:sticky lg:top-20 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Order Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-700 font-medium">₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">GST (12%)</span><span className="text-slate-700 font-medium">₹{gstAmount.toFixed(2)}</span></div>
            <div className="h-px bg-slate-100 my-2" />
            <div className="flex justify-between"><span className="text-slate-800 font-semibold">Total</span><span className="text-lg font-bold text-blue-700">₹{total.toFixed(2)}</span></div>
          </div>

          {/* Credit */}
          {creditLimit > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1"><CreditCard size={12} />Credit Available</span>
                <span className={cn("font-semibold", available > 0 ? "text-emerald-600" : "text-rose-600")}>₹{available.toFixed(0)}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", utilization > 80 ? "bg-rose-500" : utilization > 50 ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(utilization, 100)}%` }} />
              </div>
              {exceeds && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-600">
                  <AlertTriangle size={10} />
                  <span>Cart exceeds available credit</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing || items.length === 0}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20 disabled:shadow-none"
          >
            {placing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Place Order <ArrowRight size={14} /></>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            {Object.keys(grouped).length > 1 ? `${Object.keys(grouped).length} separate orders will be placed` : 'Order will be placed with supplier'}
          </p>
        </div>
      </div>
    </div>
  );
};
