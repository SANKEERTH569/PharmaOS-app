import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, User, ToggleLeft, ToggleRight, Search, X, Eye, EyeOff, MapPin } from 'lucide-react';
import api from '../utils/api';
import { Salesman } from '../types';

export const SalesmenPage = () => {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Salesman | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', username: '', password: '' });

  const fetchSalesmen = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/salesmen');
      setSalesmen(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSalesmen(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', username: '', password: '' });
    setShowModal(true);
  };

  const openEdit = (s: Salesman) => {
    setEditTarget(s);
    setForm({ name: s.name, phone: s.phone, username: s.username, password: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: any = { name: form.name, phone: form.phone };
        if (form.password) payload.password = form.password;
        const { data } = await api.patch(`/salesmen/${editTarget.id}`, payload);
        setSalesmen(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...data } : s));
      } else {
        const { data } = await api.post('/salesmen', form);
        setSalesmen(prev => [data, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (s: Salesman) => {
    try {
      const { data } = await api.patch(`/salesmen/${s.id}`, { is_active: !s.is_active });
      setSalesmen(prev => prev.map(x => x.id === s.id ? { ...x, is_active: data.is_active } : x));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const filtered = salesmen.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pt-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">Sales Team</h1>
          <p className="text-slate-600 font-medium text-lg">Manage salesman accounts and field force.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-colors shadow-sm"
        >
          <Plus size={22} strokeWidth={3} /> Add Salesman
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: salesmen.length, color: 'blue' },
          { label: 'Active', value: salesmen.filter(s => s.is_active).length, color: 'emerald' },
          { label: 'Inactive', value: salesmen.filter(s => !s.is_active).length, color: 'slate' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color === 'blue' ? 'text-blue-700' : stat.color === 'emerald' ? 'text-emerald-700' : 'text-slate-500'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, username or phone..."
          className="w-full pl-14 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Users size={56} className="text-slate-300 mb-4" strokeWidth={1.5} />
          <p className="text-2xl font-black text-slate-700 mb-2">No salesmen found</p>
          <p className="text-slate-500">Add your first salesman to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(s => (
            <div key={s.id} className={`bg-white rounded-3xl border-2 p-6 shadow-sm transition-all hover:shadow-md ${s.is_active ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl ${s.is_active ? 'bg-blue-600' : 'bg-slate-400'}`}>
                    {s.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">{s.name}</h3>
                    <p className="text-sm text-slate-500 font-semibold">@{s.username}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold bg-slate-50 p-3 rounded-xl">
                  <Phone size={16} className="text-blue-500" /> {s.phone}
                </div>
                {s.beat_routes && s.beat_routes.length > 0 && (
                  <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold bg-slate-50 p-3 rounded-xl">
                    <MapPin size={16} className="text-purple-500" />
                    Beat: {s.beat_routes.map(b => b.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 py-3 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${s.is_active ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'}`}
                >
                  {s.is_active ? <><ToggleRight size={16} /> Deactivate</> : <><ToggleLeft size={16} /> Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-2 border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{editTarget ? 'Edit Salesman' : 'Add Salesman'}</h2>
                <p className="text-sm text-slate-500 font-semibold mt-0.5">{editTarget ? 'Update details below' : 'Create a new field rep account'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {[
                { label: 'Full Name*', key: 'name', type: 'text', placeholder: 'e.g. Ravi Kumar', required: true },
                { label: 'Phone Number*', key: 'phone', type: 'tel', placeholder: '9999999999', required: true },
                { label: 'Username*', key: 'username', type: 'text', placeholder: 'ravi.kumar23', required: !editTarget, disabled: !!editTarget },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{field.label}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    disabled={field.disabled}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  {editTarget ? 'New Password (leave blank to keep current)' : 'Password*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editTarget}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-60">
                  {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Salesman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
