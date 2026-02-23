
import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Building2, Save, Bell, Shield, Mail, Phone, MapPin } from 'lucide-react';

export const SettingsPage = () => {
  const { wholesaler, updateWholesaler } = useAuthStore();
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: wholesaler?.name || '',
    phone: wholesaler?.phone || '',
    address: wholesaler?.address || '',
    email: wholesaler?.email || '',
    gstin: wholesaler?.gstin || '',
    dl_number: wholesaler?.dl_number || '',
    bank_name: wholesaler?.bank_name || '',
    bank_account: wholesaler?.bank_account || '',
    ifsc: wholesaler?.ifsc || '',
    upi_id: wholesaler?.upi_id || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWholesaler(formData);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Manage your company profile and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'PROFILE' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Building2 size={18} /> Company Profile
          </button>
          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'NOTIFICATIONS' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Bell size={18} /> Notifications
          </button>
          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'SECURITY' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Shield size={18} /> Security
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'PROFILE' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Basic Information</h2>
              <form onSubmit={handleSave} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Business Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="admin@example.com"
                          className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Office Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Business Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">GSTIN</label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Drug License (DL) Number</label>
                      <input
                        type="text"
                        value={formData.dl_number}
                        onChange={(e) => setFormData({ ...formData, dl_number: e.target.value.toUpperCase() })}
                        placeholder="e.g. MH-MZ5-123456"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Banking Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={formData.bank_account}
                        onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                        placeholder="e.g. 50100234567890"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.ifsc}
                        onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">UPI ID</label>
                      <input
                        type="text"
                        value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        placeholder="e.g. business@upi"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4 border-t border-slate-100 mt-8 pt-8">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                  >
                    <Save size={18} /> Save Changes
                  </button>
                  {success && (
                    <span className="text-emerald-600 text-sm font-bold animate-in fade-in">Profile Updated!</span>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {['New Order Received', 'Payment Confirmation', 'Low Stock Alert', 'Daily Summary Report'].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                    <span className="font-medium text-slate-700">{item}</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={true} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center py-20">
              <Shield size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Security Settings</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Password management and 2FA settings are managed by your system administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
