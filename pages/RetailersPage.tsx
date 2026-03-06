import React, { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  Search, Plus, MapPin, Phone, Store, ChevronRight,
  Clock, CheckCircle, XCircle, Users, UserPlus, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

interface PendingRetailer {
  id: string;
  retailer_id: string;
  wholesaler_id: string;
  status: string;
  created_at: string;
  retailer: {
    id: string;
    name: string;
    shop_name: string;
    phone: string;
    address?: string;
    gstin?: string;
    current_balance: number;
    credit_limit: number;
    created_at: string;
  };
}

export const RetailersPage = () => {
  const { retailers, addRetailer, getWholesalerRetailerBalance } = useDataStore();
  const { wholesaler } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState<PendingRetailer[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shop_name: '',
    phone: '',
    credit_limit: 50000,
    address: '',
    gstin: '',
  });

  const fetchPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/wholesaler/agencies/pending');
      setPendingRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch pending requests', err);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleRespond = async (retailerId: string, action: 'ACCEPT' | 'REJECT') => {
    setRespondingId(retailerId);
    try {
      await api.patch(`/wholesaler/agencies/${retailerId}/respond`, { action });
      setPendingRequests((prev) => prev.filter((r) => r.retailer_id !== retailerId));
      if (action === 'ACCEPT') {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to process request');
    } finally {
      setRespondingId(null);
    }
  };

  const filteredRetailers = retailers.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.shop_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRetailer(formData);
    setShowAddModal(false);
    setFormData({ name: '', shop_name: '', phone: '', credit_limit: 50000, address: '', gstin: '' });
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pt-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Retailers</h1>
          <p className="text-slate-600 font-medium text-lg">
            Manage your network of active pharmacy partners.
          </p>
        </div>
        <div className="w-full md:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-colors shadow-sm"
          >
            <Plus size={24} strokeWidth={3} /> Add New Retailer
          </button>
        </div>
      </div>

      {/* Tabs & Search Container */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">

        {/* Large Accessible Tabs */}
        <div className="flex flex-col sm:flex-row bg-slate-100 p-2 rounded-3xl w-full xl:w-auto gap-2 border-2 border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all ${activeTab === 'active'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <Store size={22} className={activeTab === 'active' ? 'text-blue-600' : 'text-slate-500'} />
            Active
            <span className={`px-3 py-1 rounded-full text-sm ${activeTab === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
              {retailers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all ${activeTab === 'pending'
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <UserPlus size={22} className={activeTab === 'pending' ? 'text-amber-600' : 'text-slate-500'} />
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className={`px-3 py-1 rounded-full text-sm ${activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Large Search Input */}
        {activeTab === 'active' && (
          <div className="relative w-full xl:w-1/3 min-w-[320px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-7 h-7" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search by shop or owner name..."
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-300 rounded-3xl text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Active Retailers Tab ── */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredRetailers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
              <Store size={64} className="text-slate-300 mb-6" strokeWidth={1.5} />
              <p className="text-3xl font-black text-slate-800 mb-2">No retailers found</p>
              <p className="text-lg font-medium text-slate-500">Try adjusting your search criteria or add a new retailer.</p>
            </div>
          )}

          {filteredRetailers.map((retailer) => {
            const myBalance = wholesaler ? getWholesalerRetailerBalance(retailer.id, wholesaler.id) : 0;
            const percentUsed = Math.min((myBalance / (retailer.credit_limit || 1)) * 100, 100);

            let statusColor = 'emerald';
            let statusText = 'Good Standing';

            if (percentUsed > 90) {
              statusColor = 'rose';
              statusText = 'Critical: Near Limit';
            } else if (percentUsed > 70) {
              statusColor = 'amber';
              statusText = 'Warning: High Balance';
            }

            return (
              <Link to={`/retailers/${retailer.id}`} key={retailer.id} className="block group">
                <div className="bg-white rounded-[32px] border-2 border-slate-200 p-8 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col shadow-sm">

                  {/* Shop Name Header */}
                  <div className="flex justify-between items-start mb-8 gap-4">
                    <div className="min-w-0">
                      <h3 className="font-black text-2xl sm:text-3xl text-slate-900 leading-tight mb-2 truncate group-hover:text-blue-700 transition-colors">
                        {retailer.shop_name}
                      </h3>
                      <p className="text-slate-500 text-lg font-bold flex items-center gap-2">
                        <Users size={18} /> {retailer.name}
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 shadow-inner">
                      <ChevronRight size={28} strokeWidth={3} />
                    </div>
                  </div>

                  {/* Contact Info - High Contrast */}
                  <div className="space-y-4 mb-10 flex-1">
                    <div className="flex items-center text-slate-800 text-lg font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <Phone size={22} className="text-blue-500 shrink-0 mr-4" />
                      <span className="truncate">{retailer.phone}</span>
                    </div>
                    <div className="flex items-center text-slate-800 text-lg font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <MapPin size={22} className="text-blue-500 shrink-0 mr-4" />
                      <span className="truncate">{retailer.address || 'Address not provided'}</span>
                    </div>
                  </div>

                  {/* Balance / Credit Section - Text-based Status */}
                  <div className={`rounded-3xl p-6 border-2 flex flex-col gap-3 ${statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
                      statusColor === 'amber' ? 'bg-amber-50 border-amber-300' :
                        'bg-rose-50 border-rose-300'
                    }`}>
                    <div className="flex justify-between items-end">
                      <span className={`text-sm font-black uppercase tracking-widest ${statusColor === 'emerald' ? 'text-emerald-700' :
                          statusColor === 'amber' ? 'text-amber-800' :
                            'text-rose-700'
                        }`}>Current Balance</span>
                      <span className="text-slate-600 font-bold text-sm uppercase tracking-widest">Credit Limit</span>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <span className={`text-3xl font-black ${statusColor === 'emerald' ? 'text-emerald-800' :
                          statusColor === 'amber' ? 'text-amber-900' :
                            'text-rose-800'
                        }`}>₹{myBalance.toLocaleString()}</span>
                      <span className="text-slate-700 font-black text-xl">₹{retailer.credit_limit.toLocaleString()}</span>
                    </div>

                    <div className={`pt-3 border-t-2 flex items-center gap-2 ${statusColor === 'emerald' ? 'border-emerald-200/50' :
                        statusColor === 'amber' ? 'border-amber-300/50' : 'border-rose-300/50'
                      }`}>
                      <div className={`w-3 h-3 rounded-full animate-pulse ${statusColor === 'emerald' ? 'bg-emerald-500' :
                          statusColor === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                      <p className={`text-base font-bold ${statusColor === 'emerald' ? 'text-emerald-700' :
                          statusColor === 'amber' ? 'text-amber-800' :
                            'text-rose-700'
                        }`}>
                        {statusText}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Pending Requests Tab ── */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pendingLoading && (
            <div className="col-span-full text-center py-24 text-slate-500 font-bold text-xl">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-6"></div>
              Loading connection requests...
            </div>
          )}

          {!pendingLoading && pendingRequests.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-6">
                <UserPlus size={40} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="font-black text-slate-800 text-3xl mb-3">No pending requests</p>
              <p className="text-lg text-slate-500 font-medium">New retailer connection requests will appear here.</p>
            </div>
          )}

          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-[32px] border-2 border-amber-200 p-8 flex flex-col h-full shadow-lg shadow-amber-900/5"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Store size={40} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-3xl mb-2 truncate">{req.retailer.shop_name}</h3>
                  <p className="text-slate-600 text-xl font-bold mb-3 flex items-center gap-2">
                    <Users size={20} /> {req.retailer.name}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm uppercase tracking-widest bg-amber-50 text-amber-800 font-bold px-4 py-1.5 rounded-lg border border-amber-200">
                    <Clock size={16} strokeWidth={2.5} /> Pending Review
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-lg text-slate-800 font-medium mb-10 flex-1">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Phone size={24} className="text-amber-500 shrink-0" />
                  <span>{req.retailer.phone}</span>
                </div>
                {req.retailer.address && (
                  <div className="flex flex-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <MapPin size={24} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{req.retailer.address}</span>
                  </div>
                )}
                {req.retailer.gstin && (
                  <div className="flex flex-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <FileText size={24} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="font-bold uppercase tracking-wider text-slate-900">GST: {req.retailer.gstin}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto">
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'REJECT')}
                  className="w-full flex justify-center items-center gap-2 px-6 py-5 rounded-2xl border-2 border-rose-200 text-rose-700 font-black text-lg hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-50"
                >
                  <XCircle size={24} strokeWidth={2.5} /> Reject
                </button>
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'ACCEPT')}
                  className="w-full flex justify-center items-center gap-2 px-6 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg transition-colors shadow-md disabled:opacity-50"
                >
                  <CheckCircle size={24} strokeWidth={2.5} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Retailer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 pb-20 overflow-y-auto">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl border-4 border-slate-100 mt-[10vh] max-h-[85vh] overflow-y-auto">
            <div className="px-10 py-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Add New Retailer</h2>
                <p className="text-base font-bold text-slate-500 uppercase tracking-widest">Connect a pharmacy to your network</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm shrink-0"
              >
                <span className="text-3xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-black text-slate-600 uppercase tracking-widest mb-3 pl-2">Owner Name*</label>
                  <input
                    type="text" required
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    value={formData.name}
                    placeholder="e.g., John Doe"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-600 uppercase tracking-widest mb-3 pl-2">Shop Name*</label>
                  <input
                    type="text" required
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    value={formData.shop_name}
                    placeholder="e.g., City Pharmacy"
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-black text-slate-600 uppercase tracking-widest mb-3 pl-2">Phone Number*</label>
                  <div className="relative">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" strokeWidth={2.5} />
                    <input
                      type="tel" required maxLength={10}
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                      placeholder="9999999999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-600 uppercase tracking-widest mb-3 pl-2">Credit Limit (₹)*</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xl">₹</span>
                    <input
                      type="number" required
                      className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-600 uppercase tracking-widest mb-3 pl-2">Full Address</label>
                <textarea
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm resize-none"
                  rows={3}
                  placeholder="Enter complete shop address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="pt-8 border-t-2 border-slate-100 flex flex-col-reverse sm:flex-row gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-1/3 py-5 text-slate-600 font-black uppercase tracking-widest text-lg hover:bg-slate-100 border-2 border-transparent hover:border-slate-200 rounded-2xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-2/3 py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-lg hover:bg-blue-700 active:bg-blue-800 rounded-2xl shadow-lg transition-all">
                  Create Retailer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
