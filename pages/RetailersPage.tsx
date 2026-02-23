
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
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Retailer Network</h1>
          <p className="text-slate-400 font-medium mt-1 text-sm">
            Manage {retailers.length} active pharmacy partners.
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                <Clock size={13} /> {pendingRequests.length} pending approval
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {activeTab === 'active' && (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search retailers..."
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 outline-none shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Add Retailer</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{retailers.length}</p>
            <p className="text-slate-400 text-sm font-medium">Active Retailers</p>
          </div>
        </div>
        <div
          className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 cursor-pointer hover:border-amber-200 transition-all shadow-sm"
          onClick={() => setActiveTab('pending')}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center relative shadow-sm">
            <UserPlus size={20} className="text-white" />
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{pendingRequests.length}</p>
            <p className="text-slate-400 text-sm font-medium">Pending Requests</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Active Retailers
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {retailers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active Retailers Tab ── */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRetailers.length === 0 && (
            <div className="col-span-3 text-center py-20 text-slate-400">
              <Store size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No retailers found.</p>
            </div>
          )}
          {filteredRetailers.map((retailer) => {
            const myBalance = wholesaler ? getWholesalerRetailerBalance(retailer.id, wholesaler.id) : 0;
            const status = getCreditStatus(myBalance, retailer.credit_limit);
            const percentUsed = Math.min((myBalance / retailer.credit_limit) * 100, 100);

            return (
              <Link to={`/retailers/${retailer.id}`} key={retailer.id} className="block group">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:from-indigo-600 group-hover:to-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
                        <Store size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                          {retailer.shop_name}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">{retailer.name}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center text-slate-600 text-sm">
                      <Phone size={14} className="mr-3 text-slate-400" />
                      <span className="font-medium">{retailer.phone}</span>
                    </div>
                    <div className="flex items-center text-slate-600 text-sm">
                      <MapPin size={14} className="mr-3 text-slate-400" />
                      <span className="truncate font-medium">{retailer.address || 'Location not set'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Credit Usage</span>
                      <span className="font-bold">{percentUsed.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-1000 ${status.color}`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Outstanding</p>
                        <p className="text-slate-900 font-bold">₹{myBalance.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Limit</p>
                        <p className="text-slate-500 font-medium text-xs">₹{retailer.credit_limit.toLocaleString()}</p>
                      </div>
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
            <div className="text-center py-20 text-slate-400 font-medium">Loading requests…</div>
          )}

          {!pendingLoading && pendingRequests.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <UserPlus size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No pending retailer requests.</p>
              <p className="text-sm mt-1">Retailers will appear here when they send a join request to your agency.</p>
            </div>
          )}

          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-amber-200 p-6 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-md transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Store size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-lg">{req.retailer.shop_name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-0.5 rounded-full">
                    <Clock size={11} /> Pending
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-2">{req.retailer.name}</p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" /> {req.retailer.phone}
                  </span>
                  {req.retailer.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" /> {req.retailer.address}
                    </span>
                  )}
                  {req.retailer.gstin && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      GSTIN: {req.retailer.gstin}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Requested on {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-3 shrink-0">
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'REJECT')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'ACCEPT')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle size={16} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Retailer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Add New Retailer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Owner Name</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Shop Name</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="tel" required maxLength={10}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    placeholder="99999 99999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Credit Limit (₹)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="number" required
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-colors">
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
