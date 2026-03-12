import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { UserPlus, UserCheck, XCircle, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { MOCK_WHOLESALERS } from '../../store/authStore';

export const SalesmanRequestsPage = () => {
  const { wholesaler } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/salesman-links/requests');
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch salesman requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/salesman-links/${id}/approve`);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to reject this request?')) return;
      await api.patch(`/salesman-links/${id}/reject`);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const filtered = requests.filter(req => {
    if (filter !== 'ALL' && req.status !== filter) return false;
    const s = searchTerm.toLowerCase();
    return (
      (req.salesman?.name?.toLowerCase().includes(s)) ||
      (req.salesman?.company_name?.toLowerCase().includes(s)) ||
      (req.salesman?.phone?.includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Field Rep Requests</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage connection requests from salesmen</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, company, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-colors uppercase tracking-wide border',
                filter === f
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 font-medium flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white/50 animate-pulse rounded-2xl border border-slate-200" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <UserPlus size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No requests found</h3>
            <p className="text-slate-500 mt-1">There are no {filter !== 'ALL' ? filter.toLowerCase() : ''} requests.</p>
          </div>
        ) : (
          filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {req.salesman?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{req.salesman?.name}</h3>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{req.salesman?.company_name || 'Independent'}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest border',
                    req.status === 'PENDING' && 'bg-amber-50 text-amber-600 border-amber-200',
                    req.status === 'APPROVED' && 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    req.status === 'REJECTED' && 'bg-rose-50 text-rose-600 border-rose-200'
                  )}>
                    {req.status}
                  </span>
                </div>
                
                <div className="space-y-2 mt-4 text-sm font-medium">
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">Phone:</span>
                    <span className="text-slate-800">{req.salesman?.phone}</span>
                  </div>
                  {req.salesman?.employee_id && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-16">Emp ID:</span>
                      <span className="text-slate-800">{req.salesman.employee_id}</span>
                    </div>
                  )}
                  {req.salesman?.territory && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-16">Territory:</span>
                      <span className="text-slate-800">{req.salesman.territory}</span>
                    </div>
                  )}
                  <div className="flex gap-2 text-xs mt-3">
                    <span className="text-slate-400">Requested:</span>
                    <span className="text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              {req.status === 'PENDING' && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                  >
                    <UserCheck size={16} /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border-2 border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-sm rounded-xl transition-colors"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
