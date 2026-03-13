import React, { useEffect, useState } from 'react';
import { AlertOctagon, Loader2, ShieldCheck } from 'lucide-react';
import api from '../../utils/api';

export const ComplianceControlPage = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/control/compliance/overview');
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Compliance and Audit Control</h2>
        <p className="text-sm text-slate-500">Policy risk snapshot across activation, pending approvals and unresolved incidents.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Inactive Users</p><p className="text-lg font-extrabold text-rose-600">{data?.inactiveUsers || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Failed Reminders</p><p className="text-lg font-extrabold text-amber-600">{data?.failedReminders || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Unresolved Issues</p><p className="text-lg font-extrabold text-indigo-600">{data?.unresolvedIssues || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Pending Approvals</p><p className="text-lg font-extrabold text-violet-600">{data?.pendingApprovals || 0}</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Blocked Agencies</p><p className="text-lg font-extrabold text-slate-900">{data?.blockedAgencies || 0}</p></div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-sm font-bold mb-3">Breakdown</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {Object.entries(data?.breakdown || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between border rounded-lg px-3 py-2"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800">{String(v)}</span></div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4 text-sm bg-slate-900 text-white inline-flex items-center gap-2">
        {(data?.failedReminders || 0) > 0 || (data?.unresolvedIssues || 0) > 0 ? <AlertOctagon size={14} className="text-amber-300" /> : <ShieldCheck size={14} className="text-emerald-300" />}
        {(data?.failedReminders || 0) > 0 || (data?.unresolvedIssues || 0) > 0 ? 'Compliance attention required on failed reminders or unresolved incidents.' : 'No high-risk compliance alerts at the moment.'}
      </div>
    </div>
  );
};
