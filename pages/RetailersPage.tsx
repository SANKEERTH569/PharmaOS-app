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
    credit_limit: '50000',
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
    const creditLimit = parseInt(formData.credit_limit, 10);
    if (!Number.isFinite(creditLimit)) {
      alert('Please enter a valid credit limit.');
      return;
    }
    addRetailer({ ...formData, credit_limit: creditLimit });
    setShowAddModal(false);
    setFormData({ name: '', shop_name: '', phone: '', credit_limit: '50000', address: '', gstin: '' });
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">Retailers</h1>
          <p className="text-slate-600 font-medium text-sm">
            Manage your network of active pharmacy partners.
          </p>
        </div>
        <div className="w-full md:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Retailer
          </button>
        </div>
      </div>

      {/* Tabs & Search Container */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row bg-slate-100 p-1 rounded-xl w-full xl:w-auto gap-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'active'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <Store size={16} className={activeTab === 'active' ? 'text-blue-600' : 'text-slate-500'} />
            Active
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
              {retailers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending'
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <UserPlus size={16} className={activeTab === 'pending' ? 'text-amber-600' : 'text-slate-500'} />
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        {activeTab === 'active' && (
          <div className="relative w-full xl:w-1/3 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search by shop or owner name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Active Retailers Tab ── */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRetailers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Store size={48} className="text-slate-300 mb-4" strokeWidth={1.5} />
              <p className="text-xl font-bold text-slate-800 mb-1">No retailers found</p>
              <p className="text-sm font-medium text-slate-500">Try adjusting your search criteria or add a new retailer.</p>
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
                <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col shadow-sm">

                  {/* Shop Name Header */}
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-tight mb-1 truncate group-hover:text-blue-700 transition-colors">
                        {retailer.shop_name}
                      </h3>
                      <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                        <Users size={14} /> {retailer.name}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center text-slate-800 text-sm font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <Phone size={16} className="text-blue-500 shrink-0 mr-2.5" />
                      <span className="truncate">{retailer.phone}</span>
                    </div>
                    <div className="flex items-center text-slate-800 text-sm font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <MapPin size={16} className="text-blue-500 shrink-0 mr-2.5" />
                      <span className="truncate">{retailer.address || 'Address not provided'}</span>
                    </div>
                  </div>

                  {/* Balance / Credit Section */}
                  <div className={`rounded-xl p-3 border flex flex-col gap-2 ${statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
                      statusColor === 'amber' ? 'bg-amber-50 border-amber-300' :
                        'bg-rose-50 border-rose-300'
                    }`}>
                    <div className="flex justify-between items-end">
                      <span className={`text-xs font-bold uppercase tracking-wide ${statusColor === 'emerald' ? 'text-emerald-700' :
                          statusColor === 'amber' ? 'text-amber-800' :
                            'text-rose-700'
                        }`}>Current Balance</span>
                      <span className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Credit Limit</span>
                    </div>

                    <div className="flex justify-between items-end mb-1">
                      <span className={`text-lg font-bold ${statusColor === 'emerald' ? 'text-emerald-800' :
                          statusColor === 'amber' ? 'text-amber-900' :
                            'text-rose-800'
                        }`}>₹{myBalance.toLocaleString()}</span>
                      <span className="text-slate-700 font-bold text-base">₹{retailer.credit_limit.toLocaleString()}</span>
                    </div>

                    <div className={`pt-2 border-t flex items-center gap-1.5 ${statusColor === 'emerald' ? 'border-emerald-200/50' :
                        statusColor === 'amber' ? 'border-amber-300/50' : 'border-rose-300/50'
                      }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${statusColor === 'emerald' ? 'bg-emerald-500' :
                          statusColor === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                      <p className={`text-xs font-semibold ${statusColor === 'emerald' ? 'text-emerald-700' :
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingLoading && (
            <div className="col-span-full text-center py-12 text-slate-500 font-medium text-sm">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3"></div>
              Loading connection requests...
            </div>
          )}

          {!pendingLoading && pendingRequests.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4">
                <UserPlus size={28} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="font-bold text-slate-800 text-lg mb-2">No pending requests</p>
              <p className="text-sm text-slate-500 font-medium">New retailer connection requests will appear here.</p>
            </div>
          )}

          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-amber-200 p-4 flex flex-col h-full shadow-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Store size={24} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base mb-1 truncate">{req.retailer.shop_name}</h3>
                  <p className="text-slate-600 text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Users size={14} /> {req.retailer.name}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock size={12} strokeWidth={2.5} /> Pending Review
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm text-slate-800 font-medium mb-4 flex-1">
                <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <Phone size={16} className="text-amber-500 shrink-0" />
                  <span>{req.retailer.phone}</span>
                </div>
                {req.retailer.address && (
                  <div className="flex flex-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <MapPin size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{req.retailer.address}</span>
                  </div>
                )}
                {req.retailer.gstin && (
                  <div className="flex flex-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <FileText size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="font-semibold uppercase tracking-wide text-slate-900 text-xs">GST: {req.retailer.gstin}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'REJECT')}
                  className="w-full flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 font-semibold text-sm hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} strokeWidth={2.5} /> Reject
                </button>
                <button
                  disabled={respondingId === req.retailer_id}
                  onClick={() => handleRespond(req.retailer_id, 'ACCEPT')}
                  className="w-full flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} strokeWidth={2.5} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Retailer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Add New Retailer</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Connect a pharmacy to your network</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-all shrink-0"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Owner Name*</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={formData.name}
                    placeholder="e.g., John Doe"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Shop Name*</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={formData.shop_name}
                    placeholder="e.g., City Pharmacy"
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Phone Number*</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" strokeWidth={2} />
                    <input
                      type="tel" required maxLength={10}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      placeholder="9999999999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Credit Limit (₹)*</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                    <input
                      type="number" required
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Full Address</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  rows={3}
                  placeholder="Enter complete shop address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-1/3 py-2 text-slate-600 font-semibold uppercase tracking-wide text-sm hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-all">
                  Cancel
                </button>
                <button type="submit" className="w-full sm:w-2/3 py-2 bg-blue-600 text-white font-semibold uppercase tracking-wide text-sm hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all">
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
