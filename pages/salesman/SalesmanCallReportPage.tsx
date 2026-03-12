import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Send, MapPin, ShoppingCart, CheckCircle, Package, ChevronDown, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface Medicine {
  id: string;
  name: string;
  brand?: string;
  salt?: string;
  mrp: number;
  price: number;
  gst_rate: number;
  hsn_code?: string;
  stock_qty: number;
  pack_size?: string;
}

interface CartItem extends Medicine {
  qty: number;
}

interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
}

export const SalesmanCallReportPage = () => {
  const { salesman } = useAuthStore();
  const defaultWholesalerId = salesman?.wholesaler_id || '';

  const [linkedWholesalers, setLinkedWholesalers] = useState<any[]>([]);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string>(defaultWholesalerId);

  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch approved linked wholesalers so salesman can pick one
  useEffect(() => {
    api.get('/salesman-links/my').then(res => {
      const approved = res.data.filter((l: any) => l.status === 'APPROVED').map((l: any) => l.wholesaler);
      setLinkedWholesalers(approved);
      if (approved.length > 0 && !selectedWholesalerId) {
        setSelectedWholesalerId(approved[0].id);
      }
    }).catch(console.error);
  }, [selectedWholesalerId]);

  const fetchData = useCallback(async () => {
    if (!selectedWholesalerId) return;
    setLoading(true);
    // Clear selections before fetching new data
    setSelectedRetailer('');
    setCart([]);
    
    try {
      // Need to adjust beat-routes to filter by the selected wholesaler if API supports it, 
      // but API handles this automatically via auth token / salesman_id query if possible.
      // Medicines route accepts wholesaler_id param.
      const [beatRes, medRes] = await Promise.all([
        api.get('/beat-routes'),
        api.get('/medicines', { params: { wholesaler_id: selectedWholesalerId } }),
      ]);
      const allRetailers: Retailer[] = [];
      const seen = new Set<string>();
      
      // Filter the returned beats to only those owned by selectedWholesalerId
      const targetBeats = beatRes.data.filter((b: any) => b.wholesaler_id === selectedWholesalerId);

      for (const beat of targetBeats) {
        for (const br of beat.retailers) {
          if (!seen.has(br.retailer.id)) {
            seen.add(br.retailer.id);
            allRetailers.push(br.retailer);
          }
        }
      }
      setRetailers(allRetailers);
      setMedicines(medRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedWholesalerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMeds = medicines.filter(m =>
    !medSearch ||
    m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.brand?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.salt?.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 30);

  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === med.id);
      if (existing) return prev.map(c => c.id === med.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...med, qty: 1 }];
    });
    setMedSearch('');
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
      .filter(c => c.qty > 0)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const cartTotal = cart.reduce((sum, c) => {
    const taxable = c.price * c.qty;
    return sum + taxable + taxable * (c.gst_rate / 100);
  }, 0);

  const getGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsLoading(false); },
      () => { alert('Location access denied'); setGpsLoading(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailer) return alert('Select a retailer');
    if (cart.length === 0) return alert('Add at least one medicine');
    setSubmitting(true);
    try {
      const items = cart.map(c => ({
        medicine_id: c.id,
        medicine_name: c.name,
        qty: c.qty,
        mrp: c.mrp,
        unit_price: c.price,
        discount_percent: 0,
        gst_rate: c.gst_rate,
        hsn_code: c.hsn_code || '3004',
      }));
      await api.post('/orders/mr-order', {
        wholesaler_id: selectedWholesalerId,
        retailer_id: selectedRetailer,
        items,
        notes,
        lat,
        lng
      });
      setCart([]);
      setSelectedRetailer('');
      setNotes('');
      setLat(null);
      setLng(null);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit order');
    } finally { setSubmitting(false); }
  };

  const selectedRetailerObj = retailers.find(r => r.id === selectedRetailer);

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg" />
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-32 space-y-6 max-w-md mx-auto min-h-screen bg-slate-50/50">

      {/* Success toast */}
      {submitted && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl shadow-emerald-500/30 flex items-center gap-2.5 font-bold text-sm transform transition-all duration-300">
          <CheckCircle size={18} /> Order sent to distributor!
        </div>
      )}

      {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Create Order</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Book an order from the field instantly</p>
          </div>
        </div>

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Distributor Selection */}
        {linkedWholesalers.length > 1 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">
              1. Select Distributor / Wholesaler
            </label>
            <div className="relative">
              <select
                value={selectedWholesalerId}
                onChange={(e) => setSelectedWholesalerId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              >
                <option value="" disabled>Select a distributor</option>
                {linkedWholesalers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} {w.address ? `- ${w.address}` : ''}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                <ChevronDown size={18} />
              </div>
            </div>
            {!selectedWholesalerId && (
              <p className="mt-2 text-amber-600 text-xs font-bold">Please select a distributor to view their retailers and medicines.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          <div className="lg:col-span-7 space-y-6">
            {/* Step 2: Select Retailer */}
            <div className={`bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all ${!selectedWholesalerId && 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${selectedRetailer ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>
                  {selectedRetailer ? '✓' : (linkedWholesalers.length > 1 ? '2' : '1')}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Shop</span>
                  <p className="text-slate-500 text-sm mt-1">Choose the retailer you are visiting</p>
                </div>
              </div>

              {retailers.length === 0 ? (
                <div className="text-[13px] text-amber-700 bg-amber-50/80 border border-amber-100 rounded-2xl px-4 py-3 font-medium">
                  <p className="text-slate-500 text-sm mt-1">No retailers assigned yet for this distributor.</p>
                </div>
              ) : (
                <div className="relative group">
                  <select
                    required
                    className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                    value={selectedRetailer}
                    onChange={e => setSelectedRetailer(e.target.value)}
                  >
                    <option value="">Choose a shop...</option>
                    {retailers.map(r => (
                      <option key={r.id} value={r.id}>{r.shop_name} — {r.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                    <ChevronDown size={18} />
                  </div>
                </div>
              )}

              {selectedRetailerObj && (
                <div className="mt-4 flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm shadow-indigo-500/20">
                    {selectedRetailerObj.shop_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-900 tracking-tight truncate">{selectedRetailerObj.shop_name}</p>
                    <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{selectedRetailerObj.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 — Medicines */}
            <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4 ${!selectedRetailer && 'opacity-60 pointer-events-none delay-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${cart.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>
                  {cart.length > 0 ? '✓' : (linkedWholesalers.length > 1 ? '3' : '2')}
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Add Medicines</span>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, brand, salt..."
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold placeholder:font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  value={medSearch}
                  onChange={e => setMedSearch(e.target.value)}
                />
                {medSearch && (
                  <button type="button" onClick={() => setMedSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
                    <X size={13} className="text-slate-600" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {medSearch && (
                <div className="border-2 border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-lg bg-white relative z-10">
                  {filteredMeds.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-[13px] font-semibold">No medicines found</div>
                  ) : filteredMeds.map(med => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => addToCart(med)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-indigo-50/50 border-b border-slate-50 last:border-b-0 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-black text-sm shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {med.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-[14px] truncate tracking-tight">{med.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{med.brand} · ₹{med.price}/{med.pack_size || 'unit'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qty {med.stock_qty}</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                          <Plus size={16} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Cart items */}
              {cart.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                      <div className="flex-1 min-w-0 pl-1">
                        <p className="font-bold text-slate-900 text-[14px] truncate tracking-tight">{item.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">₹{item.price} × {item.qty} = <span className="font-black text-indigo-600">₹{(item.price * item.qty).toFixed(0)}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button type="button" onClick={() => updateQty(item.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-200 hover:border-slate-300 flex items-center justify-center transition-colors active:scale-95 text-slate-600">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-black text-slate-900 text-sm tracking-tight">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-indigo-600 shadow-sm shadow-indigo-500/20 flex items-center justify-center text-white transition-colors active:scale-95">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center text-red-600 transition-colors ml-1 active:scale-95 shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                    <ShoppingCart size={20} className="text-slate-300" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-500">Your cart is empty</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">Search above to add medicines</p>
                </div>
              )}
            </div>

            {/* Step 3 — Notes & GPS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shadow-sm shrink-0">
                  {linkedWholesalers.length > 1 ? '4' : '3'}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Details</span>
                  <span className="text-[10px] text-slate-400 font-medium">(optional)</span>
                </div>
              </div>
              <textarea
                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none text-slate-800 shadow-inner"
                rows={2}
                placeholder="Special instructions, remarks..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <button
                type="button"
                onClick={getGps}
                disabled={gpsLoading}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  lat ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <MapPin size={16} />
                {gpsLoading ? 'Getting location...' : lat ? `✓ Location captured` : 'Check in with GPS'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Floating Submit Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 z-40 max-w-md mx-auto">
        <button
          onClick={handleSubmit}
          disabled={submitting || cart.length === 0 || !selectedRetailer}
          className="w-full py-4.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 text-white font-black text-lg transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-between px-6 active:scale-[0.98]"
        >
          <span className="flex items-center gap-2.5">
            <Send size={20} />
            {submitting ? 'Sending...' : 'Submit Order'}
          </span>
          {cart.length > 0 && !submitting && (
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              ₹{cartTotal.toFixed(0)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
