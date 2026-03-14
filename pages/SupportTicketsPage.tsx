import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MessageSquarePlus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <Clock size={14} />;
      case 'IN_PROGRESS': return <AlertTriangle size={14} />;
      case 'RESOLVED': return <CheckCircle2 size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">Support Tickets</h1>
        <p className="text-slate-600 font-medium text-sm">
          Raise issues to admin and track resolution status.
        </p>
      </div>

      {/* Create New Ticket Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquarePlus size={18} className="text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Raise New Ticket</h2>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject*</label>
              <input 
                value={form.subject} 
                onChange={e => setForm({ ...form, subject: e.target.value })} 
                placeholder="Brief description of the issue" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Category*</label>
              <select 
                value={form.category} 
                onChange={e => setForm({ ...form, category: e.target.value })} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="TECHNICAL">Technical</option>
                <option value="ORDER">Order</option>
                <option value="PAYMENT">Payment</option>
                <option value="INVENTORY">Inventory</option>
                <option value="ACCOUNT">Account</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Priority*</label>
              <select 
                value={form.priority} 
                onChange={e => setForm({ ...form, priority: e.target.value })} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Description*</label>
              <textarea 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Describe the issue in detail..." 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none" 
                rows={3} 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={submit} 
              disabled={submitting || !form.subject.trim() || !form.description.trim()} 
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />} 
              Submit Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">My Tickets ({tickets.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={32} />
            <p className="text-sm text-slate-500 font-medium">Loading tickets...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {tickets.map(t => (
              <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{t.subject}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      ID: {t.id.slice(0, 8)} · {t.category} · {new Date(t.created_at).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 ${
                      t.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                      t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                      t.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {t.priority}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 ${
                      t.status === 'OPEN' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                      t.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                      'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {getStatusIcon(t.status)}
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                {(t.description || t.admin_note) && (
                  <div className="space-y-2">
                    {t.description && (
                      <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="font-semibold text-slate-600 mb-1">Description:</p>
                        <p className="leading-relaxed">{t.description}</p>
                      </div>
                    )}
                    {t.admin_note && (
                      <div className="text-xs text-slate-700 bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="font-semibold text-blue-700 mb-1">Admin Response:</p>
                        <p className="leading-relaxed text-blue-900">{t.admin_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {tickets.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">No tickets raised yet</p>
                <p className="text-xs text-slate-500">Create your first support ticket above to get help.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
