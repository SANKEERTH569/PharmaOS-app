import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Store, Phone, MapPin, CreditCard, Save, Shield,
  CheckCircle, FileText, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../utils/cn';

export const RetailerProfilePage = () => {
  const { retailer, updateRetailerProfile, logout } = useAuthStore();
  const { updateRetailer } = useDataStore();
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: retailer?.name || '',
    shop_name: retailer?.shop_name || '',
    phone: retailer?.phone || '',
    address: retailer?.address || '',
    gstin: retailer?.gstin || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailer) return;
    updateRetailerProfile({ ...formData });
    updateRetailer(retailer.id, { ...formData });
    setSuccess(true);
    setEditMode(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (!retailer) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const utilization = retailer.credit_limit > 0 ? (retailer.current_balance / retailer.credit_limit) * 100 : 0;
  const available = retailer.credit_limit - retailer.current_balance;

  return (
    <div className="space-y-5">
      {/* Success Toast */}
      {success && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium">
          <CheckCircle size={14} /> Profile updated
        </motion.div>
      )}

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 h-20 relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="px-5 pb-5 -mt-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-blue-500/30 border-4 border-white">
            {retailer.shop_name?.charAt(0) || retailer.name?.charAt(0) || 'R'}
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-extrabold text-slate-800">{retailer.shop_name || 'My Shop'}</h2>
            <p className="text-sm text-slate-500 font-medium">{retailer.name} · {retailer.phone}</p>
            {retailer.gstin && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold"><Shield size={10} className="text-emerald-500" /> GSTIN: {retailer.gstin}</p>}
          </div>
        </div>
      </motion.div>

      {/* Credit Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl shadow-blue-600/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-blue-200" />
            <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Credit Account</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-blue-200 uppercase">Available</p>
              <p className="text-2xl font-bold">₹{available.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-200 uppercase">Outstanding</p>
              <p className="text-2xl font-bold text-rose-300">₹{retailer.current_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(utilization, 100)}%` }} transition={{ duration: 0.8 }}
                className={cn("h-full rounded-full", utilization > 80 ? "bg-rose-400" : utilization > 50 ? "bg-amber-400" : "bg-emerald-400")} />
            </div>
            <div className="flex justify-between text-[10px] text-blue-200">
              <span>{utilization.toFixed(0)}% used</span>
              <span>Limit: ₹{retailer.credit_limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100/60">
          <h3 className="text-sm font-bold text-slate-800">Business Details</h3>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">Edit</button>
          )}
        </div>

        <form onSubmit={handleSave} className="p-4">
          <div className="space-y-4">
            {[
              { label: 'Full Name', key: 'name', icon: User, placeholder: 'Your name' },
              { label: 'Shop Name', key: 'shop_name', icon: Store, placeholder: 'Shop / Business name' },
              { label: 'Phone', key: 'phone', icon: Phone, placeholder: 'Phone number' },
              { label: 'Address', key: 'address', icon: MapPin, placeholder: 'Business address' },
              { label: 'GSTIN', key: 'gstin', icon: FileText, placeholder: 'GST Identification Number' },
            ].map(field => {
              const Icon = field.icon;
              return (
                <div key={field.key}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                    <Icon size={10} /> {field.label}
                  </label>
                  {editMode ? (
                    <input
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all hover:border-slate-300"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 py-3 font-medium">{(formData as any)[field.key] || <span className="text-slate-300 italic">Not set</span>}</p>
                  )}
                </div>
              );
            })}
          </div>

          {editMode && (
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => { setEditMode(false); setFormData({ name: retailer.name, shop_name: retailer.shop_name, phone: retailer.phone, address: retailer.address || '', gstin: retailer.gstin || '' }); }}
                className="flex-1 py-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} type="submit" className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl text-xs font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20">
                <Save size={14} /> Save Changes
              </motion.button>
            </div>
          )}
        </form>
      </motion.div>

      {/* Quick Links */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
        {[
          { label: 'My Agencies', path: '/shop/setup-agencies', icon: Store },
          { label: 'Order History', path: '/shop/orders', icon: FileText },
        ].map((link, idx) => {
          const Icon = link.icon;
          return (
            <a key={idx} href={`#${link.path}`} className="flex items-center gap-3 px-4 py-4 border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors"><Icon size={14} className="text-slate-500 group-hover:text-blue-600 transition-colors" /></div>
              <span className="text-sm font-semibold text-slate-700 flex-1 group-hover:text-slate-800">{link.label}</span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            </a>
          );
        })}
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={() => { logout(); window.location.hash = '/'; }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-all">
          <LogOut size={16} /> Sign Out
        </button>
      </motion.div>
    </div>
  );
};
