import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, CheckCircle2, Clock, XCircle, ArrowRight, LogOut, Link as LinkIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending Approval',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: <Clock size={13} />,
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: <CheckCircle2 size={13} />,
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-600',
    icon: <XCircle size={13} />,
  },
};

export const SalesmanConnectPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { salesman, logout } = useAuthStore();
  const navigate = useNavigate();
  const [wholesalers, setWholesalers] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [wsRes, reqRes] = await Promise.all([
        api.get('/salesman-links/wholesalers', { params: { search } }),
        api.get('/salesman-links/my'),
      ]);
      setWholesalers(wsRes.data);
      setMyRequests(reqRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequest = async (wholesalerId: string) => {
    try {
      await api.post('/salesman-links/request', { wholesaler_id: wholesalerId });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleWithdraw = async (requestId: string) => {
    try {
      await api.delete(`/salesman-links/${requestId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to withdraw request');
    }
  };

  const handleLogout = () => { logout(); navigate('/login/wholesaler'); };

  const initials = (salesman?.name || 'F').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  if (embedded) {
    return (
      <div className="px-4 pt-5 pb-6 space-y-6">
        {/* Info banner */}
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <LinkIcon size={16} className="text-indigo-600" />
          </div>
          <p className="text-indigo-800 text-[13px] font-medium leading-relaxed pt-0.5">
            Connect with distributors to start taking orders. You can send requests to multiple distributors.
          </p>
        </div>

        {/* My Requests */}
        {myRequests.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your Requests</p>
            <div className="space-y-3">
              {myRequests.map((req: any) => {
                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={req.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shrink-0">
                          <Building2 size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[15px] tracking-tight">{req.wholesaler.name}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Sent {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} shrink-0 uppercase tracking-wide`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    {req.status === 'PENDING' && (
                      <button onClick={() => handleWithdraw(req.id)}
                        className="mt-4 w-full py-2.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-xl transition-colors border border-red-200 shadow-sm active:scale-[0.98]">
                        Withdraw Request
                      </button>
                    )}
                    {req.status === 'APPROVED' && salesman?.wholesaler_id !== 'UNLINKED' && (
                      <button onClick={() => navigate('/salesman')}
                        className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]">
                        Go to Dashboard <ArrowRight size={16} />
                      </button>
                    )}
                    {req.status === 'REJECTED' && (
                      <p className="mt-3 text-xs font-medium text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5">You can request another distributor below.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Find Distributor */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Find Distributor</p>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by name or area..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-sm text-sm" />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                <X size={14} className="text-slate-600" />
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg" /></div>
          ) : wholesalers.length === 0 ? (
            <div className="flex flex-col items-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Building2 size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-bold text-[15px]">No distributors found</p>
              {search && <p className="text-slate-400 font-medium text-xs mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {wholesalers.map(ws => {
                const existingReq = myRequests.find(r => r.wholesaler_id === ws.id);
                return (
                  <div key={ws.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                      <Building2 size={22} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-[15px] truncate tracking-tight">{ws.name}</p>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{ws.address || 'India'}</p>
                    </div>
                    {!existingReq ? (
                      <button onClick={() => handleRequest(ws.id)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 shrink-0">
                        Connect
                      </button>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).bg} ${(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).text} shrink-0 uppercase tracking-wide`}>
                        {(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).icon}
                        {existingReq.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative">
      {/* Abstract top background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-slate-900 rounded-b-[40px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-[#0f172a] rounded-b-[40px]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* Dark header */}
      <div className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 border border-indigo-400/20">
              <span className="text-white font-black text-xl">{initials}</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black leading-tight tracking-tight">{salesman?.name}</h1>
              {salesman?.company_name && (
                <p className="text-indigo-200 text-[13px] font-medium mt-0.5 tracking-wide uppercase">{salesman.company_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-rose-500/20 flex items-center justify-center transition-all border border-white/10 active:scale-95"
          >
            <LogOut size={18} className="text-slate-300 hover:text-rose-400 transition-colors" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-white/10 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-md shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <LinkIcon size={16} className="text-indigo-300" />
            </div>
            <p className="text-indigo-100 text-[13px] font-medium leading-relaxed pt-0.5">
              Connect with a distributor to start taking orders from pharmacies.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto relative z-10 pb-20">

        {/* My Requests */}
        {myRequests.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your Requests</p>
            <div className="space-y-3">
              {myRequests.map((req: any) => {
                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={req.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shrink-0">
                          <Building2 size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[15px] tracking-tight">{req.wholesaler.name}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Sent {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} shrink-0 uppercase tracking-wide`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => handleWithdraw(req.id)}
                        className="mt-4 w-full py-2.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-xl transition-colors border border-red-200 shadow-sm active:scale-[0.98]"
                      >
                        Withdraw Request
                      </button>
                    )}
                    {req.status === 'APPROVED' && salesman?.wholesaler_id !== 'UNLINKED' && (
                      <button
                        onClick={() => navigate('/salesman')}
                        className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                      >
                        Go to Dashboard <ArrowRight size={16} />
                      </button>
                    )}
                    {req.status === 'REJECTED' && (
                      <p className="mt-3 text-xs font-medium text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5">
                        You can request another distributor below.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Find Distributor */}
        <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Find Distributor</p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or area..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-sm text-sm"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X size={14} className="text-slate-600" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg" />
              </div>
            ) : wholesalers.length === 0 ? (
              <div className="flex flex-col items-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Building2 size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-600 font-bold text-[15px]">No distributors found</p>
                {search && <p className="text-slate-400 font-medium text-xs mt-1">Try a different search term</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {wholesalers.map(ws => {
                  const existingReq = myRequests.find(r => r.wholesaler_id === ws.id);
                  return (
                    <div key={ws.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Building2 size={22} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-[15px] truncate tracking-tight">{ws.name}</p>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{ws.address || 'India'}</p>
                      </div>
                      {!existingReq ? (
                        <button
                          onClick={() => handleRequest(ws.id)}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 shrink-0"
                        >
                          Connect
                        </button>
                      ) : (
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).bg} ${(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).text} shrink-0 uppercase tracking-wide`}>
                          {(STATUS_CONFIG[existingReq.status] || STATUS_CONFIG.PENDING).icon}
                          {existingReq.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};
