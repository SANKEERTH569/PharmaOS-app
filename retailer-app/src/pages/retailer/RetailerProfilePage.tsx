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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {retailer.shop_name?.charAt(0) || retailer.name?.charAt(0) || 'R'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">{retailer.shop_name || 'My Shop'}</h2>
            <p className="text-xs text-slate-500">{retailer.name} · {retailer.phone}</p>
            {retailer.gstin && <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><Shield size={10} /> GSTIN: {retailer.gstin}</p>}
          </div>
        </div>
      </motion.div>

      {/* Credit Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

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
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Business Details</h3>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">Edit</button>
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
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Icon size={10} /> {field.label}
                  </label>
                  {editMode ? (
                    <input
                      value={(formData as any)[field.key]}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-shadow"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 py-2.5">{(formData as any)[field.key] || <span className="text-slate-300">Not set</span>}</p>
                  )}
                </div>
              );
            })}
          </div>

          {editMode && (
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => { setEditMode(false); setFormData({ name: retailer.name, shop_name: retailer.shop_name, phone: retailer.phone, address: retailer.address || '', gstin: retailer.gstin || '' }); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors">
                <Save size={14} /> Save Changes
              </button>
            </div>
          )}
        </form>
      </motion.div>

      {/* Quick Links */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {[
          { label: 'My Agencies', path: '/shop/setup-agencies', icon: Store },
          { label: 'Order History', path: '/shop/orders', icon: FileText },
        ].map((link, idx) => {
          const Icon = link.icon;
          return (
            <a key={idx} href={`#${link.path}`} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center"><Icon size={14} className="text-slate-500" /></div>
              <span className="text-sm font-medium text-slate-700 flex-1">{link.label}</span>
              <ChevronRight size={16} className="text-slate-400" />
            </a>
          );
        })}
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={() => { logout(); window.location.hash = '/'; }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </motion.div>
    </div>
  );
};
