import React, { useState, useEffect } from 'react';
import { Map, Plus, X, Search, Users, UserCheck, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import { BeatRoute, Salesman, Retailer } from '../types';
import { useDataStore } from '../store/dataStore';

export const BeatRoutesPage = () => {
  const { retailers } = useDataStore();
  const [beats, setBeats] = useState<BeatRoute[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BeatRoute | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retailerSearch, setRetailerSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    salesman_id: '',
    retailer_ids: [] as string[],
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [beatRes, smRes] = await Promise.all([
        api.get('/beat-routes'),
        api.get('/salesmen'),
      ]);
      setBeats(beatRes.data);
      setSalesmen(smRes.data.filter((s: Salesman) => s.is_active));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', description: '', salesman_id: '', retailer_ids: [] });
    setRetailerSearch('');
    setShowModal(true);
  };

  const openEdit = (beat: BeatRoute) => {
    setEditTarget(beat);
    setForm({
      name: beat.name,
      description: beat.description || '',
      salesman_id: beat.salesman_id || '',
      retailer_ids: beat.retailers.map(br => br.retailer_id),
    });
    setRetailerSearch('');
    setShowModal(true);
  };

  const toggleRetailer = (id: string) => {
    setForm(f => ({
      ...f,
      retailer_ids: f.retailer_ids.includes(id)
        ? f.retailer_ids.filter(r => r !== id)
        : [...f.retailer_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTarget) {
        await api.patch(`/beat-routes/${editTarget.id}`, {
          name: form.name,
          description: form.description,
          salesman_id: form.salesman_id || null,
        });
        await api.post(`/beat-routes/${editTarget.id}/retailers`, { retailer_ids: form.retailer_ids });
      } else {
        const { data: newBeat } = await api.post('/beat-routes', {
          name: form.name,
          description: form.description,
          salesman_id: form.salesman_id || null,
        });
        if (form.retailer_ids.length > 0) {
          await api.post(`/beat-routes/${newBeat.id}/retailers`, { retailer_ids: form.retailer_ids });
        }
      }
      await fetchAll();
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save beat route');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (beatId: string) => {
    if (!confirm('Delete this beat route? Retailer assignments will be removed.')) return;
    try {
      await api.delete(`/beat-routes/${beatId}`);
      setBeats(prev => prev.filter(b => b.id !== beatId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filteredRetailers = retailers.filter(r =>
    r.name.toLowerCase().includes(retailerSearch.toLowerCase()) ||
    r.shop_name.toLowerCase().includes(retailerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Beat Routes</h1>
          <p className="text-slate-600 font-medium text-lg">Assign territory & retailers to each salesman.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-colors shadow-sm">
          <Plus size={22} strokeWidth={3} /> Create Beat Route
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin" /></div>
      ) : beats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Map size={56} className="text-slate-300 mb-4" strokeWidth={1.5} />
          <p className="text-2xl font-black text-slate-700 mb-2">No beat routes yet</p>
          <p className="text-slate-500">Create your first beat to assign retailer territories.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {beats.map(beat => (
            <div key={beat.id} className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                    <Map size={22} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-lg truncate">{beat.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {beat.salesman ? (
                        <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                          <UserCheck size={14} /> {beat.salesman.name}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">No salesman assigned</span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-sm font-semibold text-slate-500">
                        {beat.retailers.length} retailer{beat.retailers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(beat)} className="px-4 py-2 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200">Edit</button>
                  <button onClick={() => handleDelete(beat.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                    {expandedBeat === beat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>
              {expandedBeat === beat.id && beat.retailers.length > 0 && (
                <div className="border-t border-slate-100 px-6 pb-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest pt-5 mb-4">Assigned Retailers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {beat.retailers.map(br => (
                      <div key={br.retailer_id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm shrink-0">
                          {br.retailer.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{br.retailer.shop_name}</p>
                          <p className="text-xs text-slate-500 truncate">{br.retailer.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-slate-100 max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black text-slate-900">{editTarget ? 'Edit Beat Route' : 'Create Beat Route'}</h2>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Beat Name*</label>
                <input required type="text" placeholder="e.g. MG Road North" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-purple-500 transition-all" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Assign Salesman</label>
                <select className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-purple-500 transition-all" value={form.salesman_id} onChange={e => setForm(f => ({ ...f, salesman_id: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {salesmen.map(s => <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Retailers ({form.retailer_ids.length} selected)
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="Search retailers..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-purple-400 transition-all" value={retailerSearch} onChange={e => setRetailerSearch(e.target.value)} />
                </div>
                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredRetailers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-semibold">No retailers found</div>
                  ) : filteredRetailers.map(r => {
                    const selected = form.retailer_ids.includes(r.id);
                    return (
                      <label key={r.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${selected ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleRetailer(r.id)} className="w-4 h-4 accent-purple-600" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{r.shop_name}</p>
                          <p className="text-xs text-slate-500">{r.name} • {r.phone}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-60">
                  {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Beat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
