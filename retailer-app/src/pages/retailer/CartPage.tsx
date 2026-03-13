import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Trash2, Plus, Minus, Building2, ShoppingBag,
  CreditCard, AlertTriangle, Check, ArrowRight, Package, Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

export const CartPage: React.FC = () => {
  const { items, updateQty, removeItem, clearCart, totalAmount } = useCartStore();
  const { placeOrder, fetchRetailerLedgerSummary, retailerLedgerSummary, schemes } = useDataStore();
  const { retailer } = useAuthStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  React.useEffect(() => { fetchRetailerLedgerSummary().catch(() => { }); }, []);

  // Group items by wholesaler
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const wid = item.medicine.wholesaler_id || 'unknown';
    (acc[wid] = acc[wid] || []).push(item);
    return acc;
  }, {});

  // Calculate totals and schemes
  let grossSubtotal = 0;
  let totalSchemeDiscount = 0;
  let invoiceCashDiscount = 0;
  let preciseGstAmount = 0;

  // Calculate item-level schemes
  const calculatedItems = Object.entries(grouped).map(([wid, groupItems]) => {
    const wholesalerSchemes = schemes.filter(s => s.wholesaler_id === wid && s.is_active);
    const cashSchema = wholesalerSchemes.find(s => s.type === 'CASH_DISCOUNT');
    const widCashDiscountRate = cashSchema?.discount_pct || 0;

    const updatedItems = groupItems.map(ci => {
      let schemeDiscount = 0;
      let appliedScheme = null;
      const itemSchemes = wholesalerSchemes.filter(s => s.medicine_id === ci.medicine.id);
      const scheme = itemSchemes.find(s => s.type === 'BOGO' || s.type === 'HALF_SCHEME');

      if (scheme && scheme.min_qty && scheme.free_qty && ci.qty >= scheme.min_qty) {
        const times = Math.floor(ci.qty / scheme.min_qty);
        schemeDiscount = times * scheme.free_qty * ci.medicine.price;
        appliedScheme = scheme;
      }

      const gross = ci.medicine.price * ci.qty;
      grossSubtotal += gross;
      totalSchemeDiscount += schemeDiscount;

      // Check for cash discount for this wholesaler
      const itemTaxableBeforeCash = gross - schemeDiscount;
      const itemCashDiscount = itemTaxableBeforeCash * (widCashDiscountRate / 100);
      invoiceCashDiscount += itemCashDiscount;

      const finalItemTaxable = itemTaxableBeforeCash - itemCashDiscount;
      preciseGstAmount += finalItemTaxable * ((ci.medicine.gst_rate || 12) / 100);

      return { ...ci, schemeDiscount, appliedScheme };
    });

    return { wid, items: updatedItems, cashSchema };
  });

  const taxableAmount = grossSubtotal - totalSchemeDiscount - invoiceCashDiscount;
  const gstAmount = preciseGstAmount;
  const total = taxableAmount + gstAmount;

  const creditLimit = retailer?.credit_limit || retailerLedgerSummary?.global_credit_limit || 0;
  const currentBalance = retailer?.current_balance || retailerLedgerSummary?.global_current_balance || 0;
  const available = creditLimit - currentBalance;
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const exceeds = total > available && creditLimit > 0;

  const handlePlaceOrder = async () => {
    if (!retailer || placing) return;
    setPlacing(true);
    try {
      for (const group of calculatedItems) {
        const wholesalerId = group.wid;
        const groupItems = group.items;

        let cashDiscountAmount = 0;
        let widSubtotal = 0;

        const orderItems = groupItems.map((ci) => {
          const grossValue = ci.medicine.price * ci.qty;
          const schemeDiscountPct = grossValue > 0 ? (ci.schemeDiscount / grossValue) * 100 : 0;
          const globalCashDiscount = group.cashSchema?.discount_pct || 0;
          const finalDiscountPct = Math.min(100, schemeDiscountPct + globalCashDiscount);

          const finalDiscountAmount = grossValue * (finalDiscountPct / 100);
          const taxable = grossValue - finalDiscountAmount;

          widSubtotal += taxable;

          const gstRate = parseFloat(ci.medicine.gst_rate as any) || 12;
          const tax = taxable * (gstRate / 100);

          return {
            id: crypto.randomUUID(),
            medicine_id: ci.medicine.id,
            medicine_name: ci.medicine.name,
            qty: ci.qty,
            mrp: ci.medicine.mrp,
            unit_price: ci.medicine.price,
            discount_percent: finalDiscountPct,
            discount_amount: finalDiscountAmount,
            total_price: taxable + tax,
            hsn_code: ci.medicine.hsn_code || '',
            gst_rate: gstRate,
            taxable_value: taxable,
            tax_amount: tax,
          };
        });

        if (group.cashSchema && group.cashSchema.discount_pct) {
          cashDiscountAmount = widSubtotal * (group.cashSchema.discount_pct / 100);
        }

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
          notes: notes[wholesalerId],
          payment_terms: cashDiscountAmount > 0 ? `Includes ${group.cashSchema?.discount_pct}% Cash Discount` : undefined
        } as any);
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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-24">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
          <Check size={40} className="text-white" strokeWidth={3} />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Order Placed!</h2>
        <p className="text-sm text-slate-500 mb-1">Your order has been sent to the supplier</p>
        <p className="text-xs text-slate-400">Redirecting to orders...</p>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24">
        <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
          <ShoppingBag size={36} className="text-slate-300" />
        </div>
        <h2 className="text-lg font-bold text-slate-700 mb-1">Your cart is empty</h2>
        <p className="text-sm text-slate-400 mb-5">Browse the marketplace to add medicines</p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/shop')} className="text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
          <Sparkles size={16} /> Browse Marketplace
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="lg:flex lg:gap-6">
      {/* Items */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ShoppingCart size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{items.length} item{items.length > 1 ? 's' : ''} in cart</h2>
              <p className="text-[10px] text-slate-400 font-medium">Ready to order</p>
            </div>
          </div>
          <button onClick={clearCart} className="text-xs text-rose-500 hover:text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all">Clear All</button>
        </div>

        {calculatedItems.map((group) => {
          const wid = group.wid;
          const groupItems = group.items;
          const supplierName = groupItems[0]?.medicine?.wholesaler?.name || 'Supplier';
          return (
            <motion.div key={wid} layout className="bg-white rounded-2xl border border-slate-100/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
              {/* Supplier Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100/60">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 size={13} className="text-blue-600" />
                </div>
                <span className="text-xs font-bold text-slate-700">{supplierName}</span>
                <span className="text-[10px] text-slate-400 font-semibold ml-auto bg-white px-2 py-0.5 rounded-md">{groupItems.length} item{groupItems.length > 1 ? 's' : ''}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-50">
                <AnimatePresence>
                  {groupItems.map(ci => {
                    const displayName = ci.medicine.name || (ci as any).medicine_name || 'Medicine';

                    return (
                      <motion.div key={ci.medicine.id} layout exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.2 }} className="p-4">
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                              <Package size={16} className="text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p title={displayName} className="text-sm font-semibold text-slate-800 leading-tight break-words">{displayName}</p>
                              <p className="text-xs text-slate-500 mt-1">{ci.medicine.brand || 'Generic'} · ₹{ci.medicine.price.toFixed(2)}/unit</p>
                            </div>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeItem(ci.medicine.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0">
                              <Trash2 size={14} />
                            </motion.button>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => ci.qty <= 1 ? removeItem(ci.medicine.id) : updateQty(ci.medicine.id, ci.qty - 1)}
                                className="p-2.5 hover:bg-slate-100 rounded-l-xl transition-colors"><Minus size={12} className="text-slate-500" /></motion.button>
                              <span className="w-8 text-center text-xs font-bold text-slate-700 tabular-nums">{ci.qty}</span>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQty(ci.medicine.id, ci.qty + 1)}
                                className="p-2.5 hover:bg-slate-100 rounded-r-xl transition-colors"><Plus size={12} className="text-slate-500" /></motion.button>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-base font-extrabold text-slate-800">₹{((ci.medicine.price * ci.qty) - ci.schemeDiscount).toFixed(2)}</p>
                              {ci.schemeDiscount > 0 && (
                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 mt-1 inline-block">Scheme Applied</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Notes */}
              <div className="px-4 pb-3 pt-1">
                <input
                  value={notes[wid] || ''}
                  onChange={e => setNotes(p => ({ ...p, [wid]: e.target.value }))}
                  placeholder="Add order notes (optional)"
                  className="w-full text-xs text-slate-600 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-300 placeholder-slate-400 transition-all"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order Summary - Sticky */}
      <div className="lg:w-[360px] mt-5 lg:mt-0">
        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-5 lg:sticky lg:top-20 space-y-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={12} className="text-blue-600" />
            </div>
            Order Summary
          </h3>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-700 font-semibold">₹{grossSubtotal.toFixed(2)}</span></div>
            {totalSchemeDiscount > 0 && (
              <div className="flex justify-between"><span className="text-emerald-500 flex items-center gap-1"><Sparkles size={12} /> Item Schemes</span><span className="text-emerald-600 font-bold">-₹{totalSchemeDiscount.toFixed(2)}</span></div>
            )}
            {invoiceCashDiscount > 0 && (
              <div className="flex justify-between"><span className="text-indigo-500 flex items-center gap-1"><Sparkles size={12} /> Cash Discount</span><span className="text-indigo-600 font-bold">-₹{invoiceCashDiscount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">Total GST</span><span className="text-slate-700 font-semibold">₹{gstAmount.toFixed(2)}</span></div>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3" />
            <div className="flex justify-between items-end"><span className="text-slate-800 font-bold">Total</span><span className="text-xl font-extrabold text-blue-700">₹{total.toFixed(2)}</span></div>
          </div>

          {/* Credit */}
          {creditLimit > 0 && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl p-4 space-y-2.5 border border-slate-100/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium"><CreditCard size={12} />Credit Available</span>
                <span className={cn("font-bold", available > 0 ? "text-emerald-600" : "text-rose-600")}>₹{available.toFixed(0)}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(utilization, 100)}%` }} transition={{ duration: 0.6 }}
                  className={cn("h-full rounded-full transition-all", utilization > 80 ? "bg-gradient-to-r from-rose-400 to-rose-500" : utilization > 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-emerald-400 to-emerald-500")}
                  style={{ width: `${Math.min(utilization, 100)}%` }} />
              </div>
              {exceeds && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200/50">
                  <AlertTriangle size={10} />
                  <span>Cart exceeds available credit</span>
                </div>
              )}
            </div>
          )}

          <motion.button whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            disabled={placing || items.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
          >
            {placing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Place Order ({total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}) <ArrowRight size={14} /></>
            )}
          </motion.button>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            {Object.keys(grouped).length > 1 ? `${Object.keys(grouped).length} separate orders will be placed` : 'Order will be placed with supplier'}
          </p>
        </div>
      </div>
    </div>
  );
};
