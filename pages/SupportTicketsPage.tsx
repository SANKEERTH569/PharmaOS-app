import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MessageSquarePlus } from 'lucide-react';
import api from '../utils/api';

export const SupportTicketsPage = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    description: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/support-tickets/my');
      setTickets(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/support-tickets', form);
      setForm({ subject: '', category: 'TECHNICAL', priority: 'MEDIUM', description: '' });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Support Tickets</h2>
        <p className="text-sm text-slate-500">Raise issues to admin and track resolution status.</p>
      </div>

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold">Raise New Ticket</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="TECHNICAL">Technical</option>
            <option value="ORDER">Order</option>
            <option value="PAYMENT">Payment</option>
            <option value="INVENTORY">Inventory</option>
            <option value="ACCOUNT">Account</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail" className="border rounded-lg px-3 py-2 text-sm md:col-span-3" rows={3} />
        </div>
        <button onClick={submit} disabled={submitting} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />} Submit Ticket
        </button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="text-sm font-bold">My Tickets ({tickets.length})</p></div>
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="animate-spin text-rose-500 mx-auto" /></div>
        ) : (
          <div className="divide-y">
            {tickets.map(t => (
              <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.subject}</p>
                  <p className="text-xs text-slate-500">{t.id} · {t.category} · {new Date(t.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : t.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.status}</span>
                </div>
                {(t.admin_note || t.description) && (
                  <div className="md:basis-full text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                    <p><strong>Description:</strong> {t.description}</p>
                    {t.admin_note && <p className="mt-1"><strong>Admin Note:</strong> {t.admin_note}</p>}
                  </div>
                )}
              </div>
            ))}
            {tickets.length === 0 && <div className="p-8 text-center text-sm text-slate-500 inline-flex items-center justify-center gap-2 w-full"><AlertCircle size={14} /> No tickets raised yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
