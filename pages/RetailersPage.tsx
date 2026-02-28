
import React, { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  Search, Plus, MapPin, Phone, Store, ChevronRight,
  CreditCard, Clock, CheckCircle, XCircle, Users, UserPlus,
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
        // Refresh active retailer list via store if possible
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

  const getCreditStatus = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage > 90) return { color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
    if (percentage > 70) return { color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-8 pt-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-800 flex items-center justify-center shadow-xl shadow-blue-900/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users size={28} className="text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">Retailer Network</h1>
            <p className="text-slate-500 font-medium text-sm">
              Manage {retailers.length} active pharmacy partners.
              {pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                  <Clock size={12} strokeWidth={3} /> {pendingRequests.length} pending
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          {activeTab === 'active' && (
            <div className="relative flex-1 sm:flex-initial group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search retailers..."
                className="w-full sm:w-72 pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[15px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-blue-500/20 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Add Retailer</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 flex items-center gap-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors"></div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 relative z-10 shrink-0">
            <Store size={26} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">{retailers.length}</p>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Active Retailers</p>
          </div>
        </div>
        <div
          className={`bg-white rounded-[32px] border ${activeTab === 'pending' ? 'border-amber-300 shadow-amber-500/10' : 'border-slate-200/60 sm:hover:border-amber-200'} p-6 sm:p-8 flex items-center gap-5 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden group col-span-1 md:col-span-2`}
          onClick={() => setActiveTab('pending')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-100 transition-colors"></div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center relative shadow-lg shadow-amber-500/20 z-10 shrink-0">
            <UserPlus size={24} className="text-white" strokeWidth={1.5} />
            {pendingRequests.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center ring-4 ring-white shadow-sm">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div className="relative z-10 min-w-0 flex-1">
            <p className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">{pendingRequests.length}</p>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Pending Requests</p>
          </div>
          {pendingRequests.length > 0 && (
            <div className="hidden sm:flex relative z-10 items-center justify-center shrink-0 w-10 h-10 rounded-full bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors">
              <ChevronRight size={20} />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit sm:mx-auto md:mx-0 shadow-inner">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-8 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'active'
            ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
        >
          Active
          <span className={`text-[10px] px-2 py-0.5 rounded-md ${activeTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
            {retailers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'pending'
            ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
        >
          Pending
          {pendingRequests.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${activeTab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active Retailers Tab ── */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {filteredRetailers.length === 0 && (
            <div className="col-span-full text-center py-24 bg-white rounded-[32px] border border-slate-200/60 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Store size={32} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-slate-800 font-extrabold text-lg mb-1">No retailers found</p>
              <p className="text-slate-400 font-medium text-sm">Try adjusting your search criteria or add a new retailer.</p>
            </div>
          )}
          {filteredRetailers.map((retailer) => {
            const myBalance = wholesaler ? getWholesalerRetailerBalance(retailer.id, wholesaler.id) : 0;
            const status = getCreditStatus(myBalance, retailer.credit_limit);
            const percentUsed = Math.min((myBalance / retailer.credit_limit) * 100, 100);

            return (
              <Link to={`/retailers/${retailer.id}`} key={retailer.id} className="block group">
                <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-50/50 transition-colors"></div>

                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex gap-4 items-center min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-blue-500 shadow-sm transition-all duration-500 shrink-0">
                        <Store size={26} strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-xl text-slate-800 leading-tight group-hover:text-blue-600 transition-colors truncate">
                          {retailer.shop_name}
                        </h3>
                        <p className="text-slate-500 text-sm font-bold truncate">{retailer.name}</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1 relative z-10">
                    <div className="flex items-center text-slate-600 text-[13px] bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <Phone size={14} className="mr-3 text-slate-400" />
                      <span className="font-bold">{retailer.phone}</span>
                    </div>
                    <div className="flex items-center text-slate-600 text-[13px] bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <MapPin size={14} className="mr-3 text-slate-400 shrink-0" />
                      <span className="truncate font-bold">{retailer.address || 'Location not set'}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-100 relative z-10">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Outstanding</span>
                        <span className="font-black text-slate-800 text-lg leading-none">₹{myBalance.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Limit</span>
                        <span className="font-bold text-slate-500 text-sm leading-none">₹{retailer.credit_limit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Usage</span>
                      <span className={percentUsed > 90 ? 'text-rose-600' : percentUsed > 70 ? 'text-amber-600' : 'text-emerald-600'}>
                        {percentUsed.toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percentUsed > 90 ? 'bg-gradient-to-r from-rose-500 to-red-500' :
                            percentUsed > 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                              'bg-gradient-to-r from-emerald-400 to-teal-500'
                          }`}
                        style={{ width: `${percentUsed}%` }}
                      />
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
        <div className="space-y-4">
          {pendingLoading && (
            <div className="text-center py-24 text-slate-400 font-medium">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
              Loading requests...
            </div>
          )}

          {!pendingLoading && pendingRequests.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[32px] border border-slate-200/60 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <UserPlus size={32} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="font-extrabold text-slate-800 text-lg mb-1">No pending requests</p>
              <p className="text-sm mt-1 text-slate-400 font-medium">Retailers will appear here when they request to connect via the PharmaOS platform.</p>
            </div>
          )}

          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-[32px] border-2 border-amber-100/50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                <Store size={28} strokeWidth={1.5} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                  <h3 className="font-black text-slate-800 text-xl tracking-tight">{req.retailer.shop_name}</h3>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest bg-amber-100 text-amber-700 font-black px-2.5 py-1 rounded-md border border-amber-200/50 shadow-sm">
                    <Clock size={12} strokeWidth={2.5} /> Pending Review
                  </span>
                </div>
                <p className="text-slate-500 text-[15px] font-bold mb-3">{req.retailer.name}</p>
                <div className="flex flex-wrap gap-4 text-[13px] text-slate-600">
                  <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-bold">
                    <Phone size={14} className="text-slate-400" /> {req.retailer.phone}
                  </span>
                  {req.retailer.address && (
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-bold">
                      <MapPin size={14} className="text-slate-400" /> <span className="truncate max-w-[200px]">{req.retailer.address}</span>
                    </span>
                  )}
                  {req.retailer.gstin && (
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-bold uppercase tracking-wider text-slate-700">
                      GST: {req.retailer.gstin}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-wider">
                  Requested on {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-3 shrink-0 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'REJECT')}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-rose-100 text-rose-600 font-black text-[13px] uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50"
                >
                  <XCircle size={18} strokeWidth={2.5} /> Reject
                </button>
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'ACCEPT')}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[13px] uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 shadow-md"
                >
                  <CheckCircle size={18} strokeWidth={2.5} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Retailer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-900/20 w-full max-w-xl overflow-hidden border border-white/20 scale-100 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Add Retailer</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Create a new connection</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Owner Name</label>
                  <input
                    type="text" required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                    value={formData.name}
                    placeholder="E.g. John Doe"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Shop Name</label>
                  <input
                    type="text" required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                    value={formData.shop_name}
                    placeholder="E.g. City Pharmacy"
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type="tel" required maxLength={10}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                      placeholder="99999 99999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Credit Limit (₹)</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-blue-500 transition-colors">₹</span>
                    <input
                      type="number" required
                      className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Full Address</label>
                <textarea
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all shadow-sm resize-none"
                  rows={3}
                  placeholder="Enter complete shop address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-[13px] hover:bg-slate-100 rounded-2xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-[13px] hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 rounded-2xl transition-all">
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
