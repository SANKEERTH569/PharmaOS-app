
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Pill, ShoppingCart, Plus, Minus, Package, Building2,
  AlertTriangle, Activity, BookOpen, Stethoscope, Heart, Sparkles
} from 'lucide-react';
import { Medicine } from '../types';
import { useCartStore } from '../store/cartStore';
import { useDataStore } from '../store/dataStore';
import { cn } from '../utils/cn';

interface Props {
  medicine: (Medicine & { alternatives?: Medicine[] }) | null;
  onClose: () => void;
}

const getMedicineTypeInfo = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('tablet') || n.includes('tab') || n.includes('cap')) return { label: 'Tablet/Capsule', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (n.includes('syrup') || n.includes('suspension') || n.includes('liquid')) return { label: 'Syrup/Liquid', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (n.includes('injection') || n.includes('vial') || n.includes('ampoule')) return { label: 'Injection', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (n.includes('cream') || n.includes('ointment') || n.includes('gel')) return { label: 'Topical', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (n.includes('inhaler') || n.includes('rotacap')) return { label: 'Inhaler', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (n.includes('drop') || n.includes('eye') || n.includes('ear')) return { label: 'Drops', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  return { label: 'Medicine', color: 'bg-slate-50 text-slate-600 border-slate-200' };
};

export const MedicineDetailSheet: React.FC<Props> = ({ medicine, onClose }) => {
  const { items, addItem, updateQty, removeItem } = useCartStore();
  const { schemes } = useDataStore();

  if (!medicine) return null;

  const cartItem = items.find(i => i.medicine.id === medicine.id);
  const qty = cartItem?.qty || 0;
  const margin = medicine.mrp > 0 ? ((medicine.mrp - medicine.price) / medicine.mrp * 100) : 0;
  const typeInfo = getMedicineTypeInfo(medicine.name);
  const isOutOfStock = medicine.stock_qty <= 0;
  const isLowStock = medicine.stock_qty > 0 && medicine.stock_qty <= 10;

  const applicableSchemes = medicine ? schemes.filter(s =>
    (s.type === 'CASH_DISCOUNT' && s.wholesaler_id === medicine.wholesaler_id) ||
    (s.medicine_id === medicine.id && s.wholesaler_id === medicine.wholesaler_id)
  ) : [];

  return (
    <AnimatePresence>
      {medicine && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet — bottom on mobile, right panel on desktop */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 lg:top-0 lg:left-auto lg:right-0 lg:w-[420px] lg:bottom-0 bg-white rounded-t-3xl lg:rounded-l-3xl lg:rounded-t-none z-50 max-h-[85vh] lg:max-h-full overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Handle + Close */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="lg:hidden w-10 h-1 rounded-full bg-slate-300 mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
              <h3 className="text-sm font-semibold text-slate-800">Medicine Details</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Pill size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">{medicine.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{medicine.brand}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", typeInfo.color)}>{typeInfo.label}</span>
                      {medicine.pack_size && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{medicine.pack_size}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Your Price (PTR)</p>
                    <p className="text-2xl font-bold text-blue-700 mt-0.5">₹{medicine.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">MRP</p>
                    <p className="text-sm text-slate-400 line-through">₹{medicine.mrp.toFixed(2)}</p>
                    {margin > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
                        {margin.toFixed(1)}% Margin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200/40">
                  <p className="text-xs text-slate-500">GST: {medicine.gst_rate}%</p>
                  {medicine.hsn_code && <p className="text-xs text-slate-500">HSN: {medicine.hsn_code}</p>}
                </div>
              </div>

              {/* Offers / Schemes */}
              {applicableSchemes.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <h4 className="text-sm font-bold text-indigo-900">Available Offers</h4>
                  </div>
                  <div className="space-y-2.5">
                    {applicableSchemes.map(s => (
                      <div key={s.id} className="bg-white rounded-lg p-3 border border-indigo-100/50 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                            {s.type === 'BOGO' ? `Buy ${s.min_qty} get ${s.free_qty} free!` :
                              s.type === 'HALF_SCHEME' ? `Buy ${s.min_qty} get ${s.free_qty} at half price!` :
                                s.type === 'CASH_DISCOUNT' ? `Extra ${s.discount_pct}% Cash Discount applied at checkout.` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Low Stock ({medicine.stock_qty} left)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> In Stock
                  </span>
                )}
              </div>

              {/* Composition */}
              {medicine.salt && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-600" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Composition</p>
                  </div>
                  <p className="text-sm text-slate-600">{medicine.salt}</p>
                  {medicine.composition2 && <p className="text-sm text-slate-500">{medicine.composition2}</p>}
                </div>
              )}

              {/* Therapeutic Class */}
              {medicine.therapeutic_class && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-purple-600" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Therapeutic Class</p>
                  </div>
                  <p className="text-sm text-slate-600">{medicine.therapeutic_class}</p>
                </div>
              )}

              {/* Uses */}
              {medicine.uses && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Uses</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{medicine.uses}</p>
                </div>
              )}

              {/* Side Effects */}
              {medicine.side_effects && (
                <div className="bg-rose-50 rounded-xl p-4 space-y-2 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Side Effects</p>
                  </div>
                  <p className="text-sm text-rose-600 leading-relaxed">{medicine.side_effects}</p>
                </div>
              )}

              {/* Supplier */}
              {medicine.wholesaler && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-slate-500" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Supplier</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{medicine.wholesaler.name}</p>
                  <p className="text-xs text-slate-400">{medicine.wholesaler.phone}</p>
                </div>
              )}

              {/* Alternatives / Substitutes */}
              {medicine.alternatives && medicine.alternatives.filter(alt => alt.id !== medicine.id).length > 0 && (
                <div className="mt-6">
                  {isOutOfStock ? (
                    <div className="mb-3 bg-amber-50 rounded-xl p-3 border border-amber-200/50">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-800">Smart Substitutes Available</p>
                          <p className="text-xs text-amber-700 mt-0.5">This item is out of stock, but the following generic substitutes with the same composition are available.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Other Suppliers & Brands</p>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{medicine.alternatives.filter(alt => alt.id !== medicine.id).length}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {medicine.alternatives.filter(alt => alt.id !== medicine.id).map(alt => (
                      <div key={alt.id} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all", alt.stock_qty > 0 ? "bg-white border-blue-100 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60")}>
                        <div className="flex-1 pr-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-800">{alt.brand || alt.name}</p>
                            {alt.stock_qty <= 0 && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Out of Stock</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <Building2 size={12} className="text-slate-400" />
                              {alt.wholesaler?.name}
                            </p>
                            <p className="text-sm font-extrabold text-blue-700">₹{alt.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addItem(alt, 1)}
                          disabled={alt.stock_qty <= 0}
                          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:bg-slate-300 shadow-sm shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {isOutOfStock ? (
                <button disabled className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm">
                  Out of Stock
                </button>
              ) : qty > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl">
                    <button onClick={() => qty === 1 ? removeItem(medicine.id) : updateQty(medicine.id, qty - 1)} className="p-2.5 hover:bg-slate-200 rounded-l-xl transition-colors">
                      <Minus size={16} className="text-slate-600" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-slate-800">{qty}</span>
                    <button onClick={() => updateQty(medicine.id, qty + 1)} className="p-2.5 hover:bg-slate-200 rounded-r-xl transition-colors">
                      <Plus size={16} className="text-slate-600" />
                    </button>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs text-slate-500">Subtotal</p>
                    <p className="text-base font-bold text-slate-800">₹{(medicine.price * qty).toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => addItem(medicine, 1)}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20"
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
