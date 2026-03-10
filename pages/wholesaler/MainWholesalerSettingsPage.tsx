import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Building2, Save, Bell, Shield, Phone, MapPin, FileText } from 'lucide-react';
import api from '../../utils/api';

export const MainWholesalerSettingsPage = () => {
    const { mainWholesaler } = useAuthStore();
    const [activeTab, setActiveTab] = useState('PROFILE');
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: mainWholesaler?.name || '',
        phone: mainWholesaler?.phone || '',
        address: mainWholesaler?.address || '',
        gstin: mainWholesaler?.gstin || '',
        dl_number: mainWholesaler?.dl_number || '',
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch('/main-wholesalers/profile', formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5 animate-slide-up max-w-4xl">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Settings</h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5">Manage your company profile and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Nav */}
                <div className="w-full lg:w-56 flex-shrink-0 space-y-1">
                    {[
                        { key: 'PROFILE', label: 'Company Profile', icon: Building2 },
                        { key: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
                        { key: 'SECURITY', label: 'Security', icon: Shield },
                    ].map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setActiveTab(key)}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === key ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'PROFILE' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
                            <h2 className="text-base font-bold text-slate-900 mb-5 border-b border-slate-100 pb-3">Basic Information</h2>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <input type="text" value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none text-sm font-medium" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                            <input type="tel" value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none text-sm font-medium" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
                                        <input type="text" value={formData.gstin}
                                            onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                            placeholder="e.g. 22AAAAA0000A1Z5"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none text-sm font-medium uppercase" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Office Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <textarea value={formData.address} rows={3}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none text-sm font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Drug License (DL) Number</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <input type="text" value={formData.dl_number}
                                            onChange={e => setFormData({ ...formData, dl_number: e.target.value.toUpperCase() })}
                                            placeholder="e.g. MH-MZ5-123456"
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none text-sm font-medium uppercase" />
                                    </div>
                                </div>

                                <div className="pt-3 flex items-center gap-4 border-t border-slate-100">
                                    <button type="submit" disabled={saving}
                                        className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50">
                                        <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
                                    </button>
                                    {success && <span className="text-emerald-600 text-sm font-bold">Profile Updated!</span>}
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'NOTIFICATIONS' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
                            <h2 className="text-base font-bold text-slate-900 mb-5">Notification Preferences</h2>
                            <div className="space-y-3">
                                {['New Supply Order', 'Payment Received', 'Low Stock Alert', 'Daily Summary Report'].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                                        <span className="text-sm font-medium text-slate-700">{item}</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'SECURITY' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 text-center py-16">
                            <Shield size={40} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-base font-bold text-slate-900">Security Settings</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">Password management and 2FA settings are managed by your system administrator.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
