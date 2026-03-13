import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import api from '../../utils/api';

type Complaint = {
  id: string;
  complaint_type: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  notes?: string;
  resolution_note?: string;
  created_at: string;
  wholesaler: { id: string; name: string };
  retailer: { id: string; name: string; shop_name: string };
};

type ReturnReq = {
  id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  total_amount: number;
  created_at: string;
  wholesaler: { id: string; name: string };
  retailer: { id: string; name: string; shop_name: string };
};

export const IssuesControlPage = () => {
  const [kind, setKind] = useState<'all' | 'complaints' | 'returns'>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [returns, setReturns] = useState<ReturnReq[]>([]);
  const [ticketStatus, setTicketStatus] = useState('all');
  const [tickets, setTickets] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, listRes] = await Promise.all([
        api.get('/admin/control/issues/summary'),
        api.get(`/admin/control/issues?kind=${kind}`),
      ]);
      setSummary(summaryRes.data);
      setComplaints(listRes.data.complaints || []);
      setReturns(listRes.data.returns || []);
      const ticketsRes = await api.get(`/admin/control/tickets?status=${ticketStatus}`);
      setTickets(ticketsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [kind, ticketStatus]);

  const unresolved = useMemo(() => complaints.filter(c => c.status !== 'RESOLVED').length, [complaints]);

  const updateComplaint = async (id: string, status: Complaint['status']) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/control/issues/complaints/${id}`, { status });
      await load();
    } finally {
      setBusyId('');
    }
  };

  const updateReturn = async (id: string, status: ReturnReq['status']) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/control/issues/returns/${id}`, { status });
      await load();
    } finally {
      setBusyId('');
    }
  };

  const updateTicket = async (id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    setBusyId(id);
    try {
      await api.patch(`/admin/control/tickets/${id}`, { status });
      await load();
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Issues Control Center</h2>
        <p className="text-sm text-slate-500">Resolve complaints and returns across all wholesalers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Open Complaints</p><p className="text-lg font-extrabold text-rose-600">{summary?.openComplaints || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Acknowledged</p><p className="text-lg font-extrabold text-amber-600">{summary?.acknowledgedComplaints || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Pending Returns</p><p className="text-lg font-extrabold text-indigo-600">{summary?.pendingReturns || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Open Tickets</p><p className="text-lg font-extrabold text-blue-600">{summary?.openTickets || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Needs Attention</p><p className="text-lg font-extrabold text-slate-900">{summary?.needsAttention || 0}</p></div>
      </div>

      <div className="flex gap-2">
        {['all', 'complaints', 'returns'].map(k => (
          <button key={k} onClick={() => setKind(k as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${kind === k ? 'bg-rose-100 text-rose-700' : 'bg-white border text-slate-500'}`}>{k.toUpperCase()}</button>
        ))}
      </div>

      {(kind === 'all' || kind === 'complaints') && (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="text-sm font-bold">Stock Complaints ({complaints.length})</p></div>
          <div className="divide-y">
            {complaints.map(c => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{c.retailer.shop_name || c.retailer.name} <span className="text-slate-400">{'->'} {c.wholesaler.name}</span></p>
                  <p className="text-xs text-slate-500">{c.complaint_type} · {new Date(c.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.status === 'OPEN' ? 'bg-rose-100 text-rose-700' : c.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.status}</span>
                  <button disabled={busyId === c.id} onClick={() => updateComplaint(c.id, 'ACKNOWLEDGED')} className="text-xs px-2 py-1 rounded border">Acknowledge</button>
                  <button disabled={busyId === c.id} onClick={() => updateComplaint(c.id, 'RESOLVED')} className="text-xs px-2 py-1 rounded bg-emerald-500 text-white">Resolve</button>
                </div>
              </div>
            ))}
            {complaints.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No complaints found.</div>}
          </div>
        </div>
      )}

      {(kind === 'all' || kind === 'returns') && (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="text-sm font-bold">Return Requests ({returns.length})</p></div>
          <div className="divide-y">
            {returns.map(r => (
              <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{r.retailer.shop_name || r.retailer.name} <span className="text-slate-400">{'->'} {r.wholesaler.name}</span></p>
                  <p className="text-xs text-slate-500">{r.reason} · Rs{r.total_amount.toLocaleString('en-IN')} · {new Date(r.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.status}</span>
                  <button disabled={busyId === r.id} onClick={() => updateReturn(r.id, 'APPROVED')} className="text-xs px-2 py-1 rounded bg-emerald-500 text-white">Approve</button>
                  <button disabled={busyId === r.id} onClick={() => updateReturn(r.id, 'REJECTED')} className="text-xs px-2 py-1 rounded border">Reject</button>
                </div>
              </div>
            ))}
            {returns.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No return requests found.</div>}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <p className="text-sm font-bold">Raised Support Tickets ({tickets.length})</p>
          <select value={ticketStatus} onChange={e => setTicketStatus(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value="all">ALL</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        <div className="divide-y">
          {tickets.map((t: any) => (
            <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{t.subject}</p>
                <p className="text-xs text-slate-500">{t.id} · {t.requester_role} · {t.requester_name} · {t.category} · {new Date(t.created_at).toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-600 mt-1">{t.description}</p>
                {t.admin_note && <p className="text-xs text-emerald-700 mt-1">Admin note: {t.admin_note}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : t.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.status}</span>
                <button disabled={busyId === t.id} onClick={() => updateTicket(t.id, 'IN_PROGRESS')} className="text-xs px-2 py-1 rounded border">Start</button>
                <button disabled={busyId === t.id} onClick={() => updateTicket(t.id, 'RESOLVED')} className="text-xs px-2 py-1 rounded bg-emerald-500 text-white">Resolve</button>
                <button disabled={busyId === t.id} onClick={() => updateTicket(t.id, 'CLOSED')} className="text-xs px-2 py-1 rounded border">Close</button>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No raised tickets found.</div>}
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center gap-2 text-sm">
        {unresolved > 0 ? <ShieldAlert size={16} className="text-amber-300" /> : <CheckCircle2 size={16} className="text-emerald-300" />}
        {unresolved > 0 ? `${unresolved} complaints are still unresolved.` : 'All complaint queues are resolved.'}
      </div>
    </div>
  );
};
