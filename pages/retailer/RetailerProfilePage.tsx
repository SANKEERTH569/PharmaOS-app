
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Store, User, Phone, MapPin, Save, CreditCard, ShieldCheck, Activity } from 'lucide-react';

export const RetailerProfilePage = () => {
   const { retailer, updateRetailerProfile } = useAuthStore();
   const { updateRetailer } = useDataStore(); // To persist to DB
   const [success, setSuccess] = useState(false);

   const [formData, setFormData] = useState({
      name: retailer?.name || '',
      shop_name: retailer?.shop_name || '',
      phone: retailer?.phone || '',
      address: retailer?.address || '',
      gstin: retailer?.gstin || ''
   });

   const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!retailer) return;

      const updates = { ...formData };

      // Update local session
      updateRetailerProfile(updates);

      // Update mock database
      updateRetailer(retailer.id, updates);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
   };

   if (!retailer) return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-slate-400">
         <Activity className="animate-spin mb-4" size={32} />
         <p className="font-bold tracking-widest uppercase text-xs">Loading Profile...</p>
      </div>
   );

   const percentUsed = (retailer.current_balance / retailer.credit_limit) * 100;

   return (
      <div className="space-y-8 pb-24 animate-in fade-in zoom-in-95 duration-500">
         {/* Header */}
         <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">My Profile</h1>
            <p className="text-slate-500 font-medium text-sm">Manage your business information and credit details</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Credit Card Info - Left Side */}
            <div className="lg:col-span-1">
               <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden h-full flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-400/30 transition-colors duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4"></div>

                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-10">
                        <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner border border-white/10 flex items-center justify-center">
                           <CreditCard className="text-blue-100" size={28} strokeWidth={1.5} />
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 shadow-sm flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                           Active Account
                        </span>
                     </div>

                     <div className="mb-8">
                        <p className="text-blue-200/60 text-[11px] font-black uppercase tracking-widest mb-1.5">Available Credit</p>
                        <h2 className="text-4xl font-black tracking-tight text-white mb-2">₹{(retailer.credit_limit - retailer.current_balance).toLocaleString()}</h2>
                        <p className="text-blue-200/50 text-xs font-medium">Total Limit: ₹{retailer.credit_limit.toLocaleString()}</p>
                     </div>

                     <div className="space-y-3 p-5 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/5">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest mb-0.5">Utilized amount</p>
                              <p className="text-lg font-bold text-white leading-none">₹{retailer.current_balance.toLocaleString()}</p>
                           </div>
                           <span className={`text-xs font-bold px-2 py-1 rounded-md ${percentUsed > 80 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                              {percentUsed.toFixed(0)}%
                           </span>
                        </div>

                        <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner border border-white/5">
                           <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${percentUsed > 80 ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                           ></div>
                        </div>
                     </div>
                  </div>

                  {/* Retailer Info on Card */}
                  <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-xs font-medium text-blue-200/70">
                     <span>{retailer.name.toUpperCase()}</span>
                     <span>{retailer.gstin ? 'GST VERIFIED' : 'NO GST'}</span>
                  </div>
               </div>
            </div>

            {/* Edit Form - Right Side */}
            <div className="lg:col-span-2">
               <form onSubmit={handleSave} className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 p-6 sm:p-8 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                  <div className="relative z-10 flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                     <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100/50 shrink-0">
                        <Store size={26} strokeWidth={1.5} />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-slate-800 text-xl tracking-tight mb-1">Business Profile</h3>
                        <p className="text-xs text-slate-500 font-medium">Update owner and shop information</p>
                     </div>
                  </div>

                  <div className="space-y-6 relative z-10 flex-1">
                     {/* Owner Name */}
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Owner Name</label>
                        <div className="relative group">
                           <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                           <input
                              type="text"
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="w-full bg-slate-50 pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:bg-white transition-all shadow-sm"
                           />
                        </div>
                     </div>

                     {/* Shop Name */}
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Shop Name</label>
                        <div className="relative group">
                           <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                           <input
                              type="text"
                              value={formData.shop_name}
                              onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                              className="w-full bg-slate-50 pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:bg-white transition-all shadow-sm"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Phone */}
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Phone</label>
                           <div className="relative group">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                              <input
                                 type="tel"
                                 value={formData.phone}
                                 onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                 className="w-full bg-slate-50 pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:bg-white transition-all shadow-sm"
                              />
                           </div>
                        </div>

                        {/* GSTIN */}
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN (Optional)</label>
                           <div className="relative group">
                              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                              <input
                                 type="text"
                                 value={formData.gstin}
                                 onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                                 placeholder="Enter 15-digit GSTIN"
                                 className="w-full bg-slate-50 pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                              />
                           </div>
                        </div>
                     </div>

                     {/* Address */}
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Business Address</label>
                        <div className="relative group">
                           <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                           <textarea
                              rows={3}
                              value={formData.address}
                              onChange={e => setFormData({ ...formData, address: e.target.value })}
                              className="w-full bg-slate-50 pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:bg-white transition-all shadow-sm resize-none"
                              placeholder="Full shop address..."
                           />
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 mt-6 border-t border-slate-100 relative z-10">
                     <button
                        type="submit"
                        className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 ${success ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50' : 'bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20'}`}
                     >
                        <Save size={18} className={success ? 'animate-bounce' : ''} />
                        {success ? 'Profile Updated!' : 'Save Changes'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      </div>
   );
};
