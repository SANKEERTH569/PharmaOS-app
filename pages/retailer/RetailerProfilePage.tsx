
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Store, User, Phone, MapPin, Save, CreditCard, ShieldCheck } from 'lucide-react';

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

  if (!retailer) return <div>Loading...</div>;

  const percentUsed = (retailer.current_balance / retailer.credit_limit) * 100;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <h1 className="text-2xl font-black text-slate-900">My Profile</h1>

      {/* Credit Card Info */}
      <div className="bg-gradient-to-br from-[#0D2B5E] to-blue-900 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
               <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <CreditCard className="text-white" />
               </div>
               <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Active Account</span>
            </div>
            
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Available Credit Limit</p>
            <h2 className="text-4xl font-black tracking-tighter mb-6">₹{(retailer.credit_limit - retailer.current_balance).toLocaleString()}</h2>
            
            <div className="space-y-2">
               <div className="flex justify-between text-xs font-medium text-white/80">
                  <span>Used: ₹{retailer.current_balance.toLocaleString()}</span>
                  <span>Limit: ₹{retailer.credit_limit.toLocaleString()}</span>
               </div>
               <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${percentUsed > 80 ? 'bg-rose-400' : 'bg-emerald-400'}`} 
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  ></div>
               </div>
            </div>
         </div>
         {/* Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
         <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
               <Store size={24} />
            </div>
            <div>
               <h3 className="font-bold text-slate-900 text-lg">Shop Details</h3>
               <p className="text-xs text-slate-400">Update your business information</p>
            </div>
         </div>

         <form onSubmit={handleSave} className="space-y-5">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Shop Name</label>
               <div className="relative">
                  <Store className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                  <input 
                     type="text" 
                     value={formData.shop_name}
                     onChange={e => setFormData({...formData, shop_name: e.target.value})}
                     className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-900"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Owner Name</label>
               <div className="relative">
                  <User className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                  <input 
                     type="text" 
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Phone</label>
                  <div className="relative">
                     <Phone className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                     <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                     />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">GSTIN</label>
                  <div className="relative">
                     <ShieldCheck className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                     <input 
                        type="text" 
                        value={formData.gstin}
                        onChange={e => setFormData({...formData, gstin: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                        placeholder="Optional"
                     />
                  </div>
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Address</label>
               <div className="relative">
                  <MapPin className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                  <textarea 
                     rows={3}
                     value={formData.address}
                     onChange={e => setFormData({...formData, address: e.target.value})}
                     className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
               </div>
            </div>

            <button 
               type="submit"
               className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 mt-4"
            >
               <Save size={18} /> {success ? 'Saved Successfully!' : 'Update Profile'}
            </button>
         </form>
      </div>
    </div>
  );
};
