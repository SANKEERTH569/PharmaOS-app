import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  Search, Plus, AlertTriangle, AlertCircle, Pill, Edit, BookOpen,
  ChevronLeft, ChevronRight, X, Download, CheckCircle, Trash2,
  Loader2, Info, PackageSearch, MapPin, Crown,
  FlaskConical, Syringe, Droplets, Wind, Package2, Layers
} from 'lucide-react';
import { Medicine, CatalogMedicine, CatalogPage } from '../types';
import api from '../utils/api';
import { MedicineBatchesModal } from '../components/MedicineBatchesModal';

// ── Medicine type helpers ────────────────────────────────────────────────────
type MedType = 'tablet' | 'syrup' | 'injection' | 'cream' | 'inhaler' | 'powder';

function getMedType(unit: string, packSize?: string | null): MedType {
  const s = ((packSize || '') + ' ' + (unit || '')).toLowerCase();
  if (s.includes('syrup') || s.includes('suspension') || s.includes('solution') || s.includes('drops') || s.includes('bottle')) return 'syrup';
  if (s.includes('injection') || s.includes('vial') || s.includes('ampoule') || s.includes('infusion')) return 'injection';
  if (s.includes('cream') || s.includes('gel') || s.includes('ointment') || s.includes('lotion') || s.includes('tube')) return 'cream';
  if (s.includes('inhaler') || s.includes('rotacap') || s.includes('respule')) return 'inhaler';
  if (s.includes('sachet') || s.includes('powder')) return 'powder';
  return 'tablet';
}

function getPackLabel(packSize?: string | null, unit?: string): string {
  const s = (packSize || '').toLowerCase();
  const type = getMedType(unit || '', packSize);
  if (type === 'syrup' || type === 'injection') {
    const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/);
    return ml ? `${ml[1]} ml` : packSize || unit || '';
  } else if (type === 'cream') {
    const gm = s.match(/(\d+(?:\.\d+)?)\s*(?:gm|g\b|gram)/);
    return gm ? `${gm[1]} gm` : packSize || unit || '';
  } else {
    const n = s.match(/\b(\d+)\b/);
    return n ? `${n[1]} tabs/strip` : packSize || unit || '';
  }
}

const MED_ICON: Record<MedType, { Icon: React.ElementType; bg: string; color: string; label: string }> = {
  tablet: { Icon: Pill, bg: 'bg-blue-50', color: 'text-blue-400', label: 'Tablet' },
  syrup: { Icon: FlaskConical, bg: 'bg-amber-50', color: 'text-amber-400', label: 'Syrup' },
  injection: { Icon: Syringe, bg: 'bg-red-50', color: 'text-red-400', label: 'Injection' },
  cream: { Icon: Droplets, bg: 'bg-emerald-50', color: 'text-emerald-400', label: 'Cream/Gel' },
  inhaler: { Icon: Wind, bg: 'bg-purple-50', color: 'text-purple-400', label: 'Inhaler' },
  powder: { Icon: Package2, bg: 'bg-slate-50', color: 'text-slate-400', label: 'Powder' },
};

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const UNITS = ['strip', 'bottle', 'box', 'tube', 'vial', 'inhaler', 'sachet'];
const GST_OPTIONS = [0, 5, 12, 18, 28];
const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const EXP_YEARS = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() + i));
const emptyForm = () => ({
  name: '', salt: '', brand: '', unit: 'strip',
  mrp: 0, price: 0, gst_rate: 12, hsn_code: '3004', stock_qty: 0, is_active: true,
  expiry_date: '', rack_location: '',
});

export const MedicinesPage = () => {
  const { medicines, addMedicine, addMedicineToStore, updateMedicine, toggleMedicineStatus, removeMedicine } = useDataStore();
  const { wholesaler } = useAuthStore();

  // Pro plan check for rack locator feature
  const isPro = wholesaler?.plan === 'pro' || (wholesaler?.plan as string) === 'enterprise';

  // ── Inventory list state ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [batchModalMed, setBatchModalMed] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | 'low_stock' | 'expiring'>('all');

  // ── Catalog state ─────────────────────────────────────────────────────────
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogClass, setCatalogClass] = useState('');
  const [catalogData, setCatalogData] = useState<CatalogPage | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);

  // ── Import configure state ────────────────────────────────────────────────
  const [importItem, setImportItem] = useState<CatalogMedicine | null>(null);
  const [importForm, setImportForm] = useState({ mrp: 0, price: 0, stock_qty: 100, gst_rate: 12, hsn_code: '3004', rack_location: '' });
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importExpiry, setImportExpiry] = useState('');

  const debouncedCatalogSearch = useDebounce(catalogSearch, 400);

  // ── My filtered inventory ─────────────────────────────────────────────────
  const myMedicines = medicines.filter(m => m.wholesaler_id === wholesaler?.id);
  const importedNames = new Set(myMedicines.map(m => m.name.toLowerCase().trim()));

  // Calculate alerts dynamically
  const lowStockCount = myMedicines.filter(m => m.stock_qty <= 20).length;
  const expiringCount = myMedicines.filter(m => {
    if (!m.expiry_date) return false;
    const exp = new Date(m.expiry_date);
    const now = new Date();
    const diffMonths = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
    return diffMonths <= 3;
  }).length;

  const filteredMedicines = myMedicines.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(search.toLowerCase()) ||
      (m.salt || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (isPro && (m.rack_location || '').toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeAlertFilter === 'low_stock') return m.stock_qty <= 20;
    if (activeAlertFilter === 'expiring') {
      if (!m.expiry_date) return false;
      const exp = new Date(m.expiry_date);
      const now = new Date();
      const diffMonths = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
      return diffMonths <= 3;
    }

    return true;
  });

  // ── Load therapeutic classes once ─────────────────────────────────────────
  useEffect(() => {
    api.get('/medicines/catalog/classes').then(r => setClasses(r.data)).catch(() => { });
  }, []);

  // ── Fetch catalog when deps change ────────────────────────────────────────
  const fetchCatalog = useCallback(async () => {
    if (!showCatalog) return;
    setCatalogLoading(true);
    try {
      const params: Record<string, string | number> = {
        search: debouncedCatalogSearch, page: catalogPage, limit: 20,
      };
      if (catalogClass) params.therapeutic_class = catalogClass;
      const res = await api.get('/medicines/catalog', { params });
      setCatalogData(res.data);
    } catch (e) { console.error(e); }
    finally { setCatalogLoading(false); }
  }, [showCatalog, debouncedCatalogSearch, catalogPage, catalogClass]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);
  useEffect(() => { setCatalogPage(1); }, [debouncedCatalogSearch, catalogClass]);

  const [submitting, setSubmitting] = useState(false);

  // ── Inventory handlers ────────────────────────────────────────────────────
  const openAddModal = () => { setEditingMed(null); setFormData(emptyForm()); setShowAddModal(true); };
  const handleEdit = (med: Medicine) => {
    setEditingMed(med);
    setFormData({
      name: med.name, salt: med.salt, brand: med.brand, unit: med.unit,
      mrp: med.mrp, price: med.price, gst_rate: med.gst_rate,
      hsn_code: med.hsn_code, stock_qty: med.stock_qty, is_active: med.is_active,
      expiry_date: med.expiry_date ? med.expiry_date.slice(0, 7) : '',
      rack_location: med.rack_location || '',
    });
    setShowAddModal(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wholesaler) return;
    setSubmitting(true);
    try {
      const expiryIso = formData.expiry_date ? new Date(formData.expiry_date + '-01').toISOString() : null;
      const payload = { ...formData, expiry_date: expiryIso };
      if (editingMed) { await updateMedicine(editingMed.id, payload); }
      else { await addMedicine({ ...payload, wholesaler_id: wholesaler.id }); }
      setShowAddModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Catalog handlers ──────────────────────────────────────────────────────
  const openImport = (item: CatalogMedicine) => {
    setImportItem(item);
    setImportSuccess(null);
    setImportExpiry('');
    setImportForm({ mrp: item.mrp, price: parseFloat((item.mrp * 0.75).toFixed(2)), stock_qty: 100, gst_rate: 12, hsn_code: '3004', rack_location: '' });
  };
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importItem) return;
    setImportLoading(true);
    try {
      const expiry = importExpiry ? new Date(importExpiry + '-01').toISOString() : undefined;
      const { rack_location: rl, ...restImport } = importForm;
      const res = await api.post('/medicines/import', { catalog_id: importItem.id, ...restImport, rack_location: rl || undefined, expiry_date: expiry });
      addMedicineToStore(res.data);
      setImportSuccess(importItem.name);
      setImportItem(null);
    } catch (err: any) { alert(err.response?.data?.error || 'Import failed'); }
    finally { setImportLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Pro Rack Locator Banner (for non-Pro users) ─────────────────── */}
      {!isPro && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <Crown size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-amber-900">🔍 Medicine Rack Locator — Pro Feature</h3>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Upgrade to <span className="font-bold">Pro</span> to assign rack/shelf locations to every medicine. Search to instantly find which rack any medicine is in!
            </p>
          </div>
          <a href="#/settings" className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl hover:shadow-lg shadow-sm transition-all">
            Upgrade
          </a>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Inventory</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Manage {myMedicines.length} products across {new Set(myMedicines.map(m => m.brand)).size} brands
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text" placeholder={isPro ? 'Search by name, brand, rack...' : 'Search inventory...'}
              className="w-full sm:w-72 pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 outline-none shadow-sm transition-all"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Catalog import button */}
          <button
            onClick={() => { setShowCatalog(true); setImportSuccess(null); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all"
            title="Browse & import from 2.5 lakh medicine catalog"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Catalog</span>
          </button>
          {/* Manual add */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Add Custom</span>
          </button>
        </div>
      </div>

      {/* ── Alerts & Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setActiveAlertFilter('all')}
          className={`flex-1 sm:flex-none flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${activeAlertFilter === 'all'
            ? 'bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-100/50'
            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
            }`}
        >
          <div className={`p-2 rounded-xl ${activeAlertFilter === 'all' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <Package2 size={18} />
          </div>
          <div className="text-left leading-tight">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeAlertFilter === 'all' ? 'text-indigo-600' : 'text-slate-500'}`}>All Items</p>
            <p className={`text-sm font-black ${activeAlertFilter === 'all' ? 'text-indigo-900' : 'text-slate-700'}`}>{myMedicines.length}</p>
          </div>
        </button>

        <button
          onClick={() => setActiveAlertFilter('low_stock')}
          className={`flex-1 sm:flex-none flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${activeAlertFilter === 'low_stock'
            ? 'bg-orange-50 border-orange-200 shadow-sm shadow-orange-100/50'
            : 'bg-white border-slate-200 hover:border-orange-200 hover:bg-slate-50'
            }`}
        >
          <div className={`p-2 rounded-xl ${activeAlertFilter === 'low_stock' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="text-left leading-tight">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeAlertFilter === 'low_stock' ? 'text-orange-600' : 'text-slate-500'}`}>Low Stock</p>
            <p className={`text-sm font-black ${activeAlertFilter === 'low_stock' ? 'text-orange-900' : 'text-slate-700'}`}>{lowStockCount}</p>
          </div>
        </button>

        <button
          onClick={() => setActiveAlertFilter('expiring')}
          className={`flex-1 sm:flex-none flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${activeAlertFilter === 'expiring'
            ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100/50'
            : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'
            }`}
        >
          <div className={`p-2 rounded-xl ${activeAlertFilter === 'expiring' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            <AlertCircle size={18} />
          </div>
          <div className="text-left leading-tight">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeAlertFilter === 'expiring' ? 'text-red-600' : 'text-slate-500'}`}>Expiring Soon</p>
            <p className={`text-sm font-black ${activeAlertFilter === 'expiring' ? 'text-red-900' : 'text-slate-700'}`}>{expiringCount}</p>
          </div>
        </button>
      </div>

      {/* ── Inventory Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 font-bold tracking-wider">Product Name</th>
              <th className="px-6 py-4 font-bold tracking-wider">Brand</th>
              {isPro && <th className="px-6 py-4 font-bold tracking-wider"><div className="flex items-center gap-1.5"><MapPin size={12} className="text-orange-400" />Rack</div></th>}
              <th className="px-6 py-4 font-bold tracking-wider">Pricing</th>
              <th className="px-6 py-4 font-bold tracking-wider">GST</th>
              <th className="px-6 py-4 font-bold tracking-wider">Stock</th>
              <th className="px-6 py-4 font-bold tracking-wider">Status</th>
              <th className="px-6 py-4 text-right font-bold tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMedicines.slice(0, 100).map(med => {
              const margin = (((med.mrp - med.price) / med.mrp) * 100).toFixed(1);
              return (
                <tr key={med.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const t = getMedType(med.unit, (med as any).pack_size);
                        const { Icon, bg, color } = MED_ICON[t];
                        return (
                          <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center border border-slate-100 transition-colors shrink-0`}>
                            <Icon size={18} />
                          </div>
                        );
                      })()}
                      <div>
                        <span className="font-bold text-slate-900 block">{med.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{med.salt}</span>
                        {(med as any).therapeutic_class && (
                          <span className="text-[10px] text-blue-400 font-medium block">{(med as any).therapeutic_class}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-bold uppercase border border-slate-200 w-fit">
                        {med.brand}
                      </span>
                      {(med as any).pack_size && (
                        <span className="text-[10px] text-slate-400">{(med as any).pack_size}</span>
                      )}
                    </div>
                  </td>
                  {isPro && (
                    <td className="px-6 py-4">
                      {med.rack_location ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-xl shadow-sm">
                          <MapPin size={13} className="text-orange-500" />
                          <span className="text-xs font-bold text-orange-700 tracking-wide">{med.rack_location}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Not set</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">₹{med.price.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 line-through">₹{med.mrp.toFixed(2)}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded border border-emerald-100">
                        {margin}% Margin
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{med.gst_rate}%</span>
                      <span className="text-[10px] text-slate-400 font-mono">HSN: {med.hsn_code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center font-bold text-sm ${med.stock_qty <= 20 ? 'text-orange-600' : 'text-slate-700'}`}>
                      {med.stock_qty <= 20 && <AlertTriangle size={14} className="mr-1.5" />}
                      {med.stock_qty}
                    </div>
                    {med.expiry_date && (() => {
                      const exp = new Date(med.expiry_date);
                      const now = new Date();
                      const diffMonths = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
                      const label = exp.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
                      return (
                        <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded w-fit block ${diffMonths <= 0 ? 'bg-red-50 text-red-600 border border-red-200' :
                          diffMonths <= 3 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                            'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}>
                          EXP: {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleMedicineStatus(med.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all
                        ${med.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {med.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setBatchModalMed(med)}
                        title="Manage Batches"
                        className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Layers size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(med)}
                        title="Edit Details"
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete ${med.name}?`)) {
                            try {
                              await removeMedicine(med.id);
                            } catch (err: any) {
                              alert(err?.response?.data?.error || 'Failed to delete medicine');
                            }
                          }
                        }}
                        title="Delete Medicine"
                        className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredMedicines.length > 100 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-xs font-medium">
            Showing first 100 of {filteredMedicines.length} results. Use search to filter.
          </div>
        )}
        {filteredMedicines.length === 0 && (
          <div className="p-16 text-center text-slate-500">
            <Pill size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-medium">No medicines in inventory.</p>
            <button onClick={() => setShowCatalog(true)}
              className="mt-4 inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
              <BookOpen size={15} /> Import from 2.5 lakh catalog
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CATALOG BROWSER MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showCatalog && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>

            {/* Catalog header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <PackageSearch size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Medicine Catalog</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {catalogData
                      ? `${catalogData.total.toLocaleString()} medicines available · search to filter`
                      : 'Loading catalog…'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCatalog(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Import success banner */}
            {importSuccess && (
              <div className="mx-6 mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 shrink-0">
                <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                <p className="text-emerald-800 text-sm font-medium">
                  <span className="font-bold">{importSuccess}</span> added to your inventory!
                </p>
                <button onClick={() => setImportSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
              </div>
            )}

            {/* Search + class filter */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  autoFocus type="text"
                  placeholder="Search by name, composition, manufacturer…"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                />
              </div>
              <select
                className="sm:w-56 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none bg-white transition-all"
                value={catalogClass} onChange={e => setCatalogClass(e.target.value)}
              >
                <option value="">All Therapeutic Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {catalogLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={36} className="text-blue-500 animate-spin" />
                </div>
              ) : catalogData && catalogData.items.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 z-20 shadow-sm">
                    <tr>
                      <th className="px-5 py-3 font-bold tracking-wider">Medicine</th>
                      <th className="px-5 py-3 font-bold tracking-wider hidden md:table-cell">Composition</th>
                      <th className="px-5 py-3 font-bold tracking-wider hidden lg:table-cell">Category</th>
                      <th className="px-5 py-3 font-bold tracking-wider">MRP</th>
                      <th className="px-5 py-3 font-bold tracking-wider">Pack</th>
                      <th className="px-5 py-3 text-right font-bold tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catalogData.items.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const t = getMedType(item.unit, item.pack_size);
                              const { Icon, bg, color } = MED_ICON[t];
                              return (
                                <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center group-hover:opacity-80 transition-opacity shrink-0`}>
                                  <Icon size={14} />
                                </div>
                              );
                            })()}
                            <div>
                              <span className="font-bold text-slate-900 text-[13px] block">{item.name}</span>
                              {item.is_discontinued && <span className="text-[10px] text-red-500 font-bold">DISCONTINUED</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <p className="text-slate-600 text-[12px] max-w-[200px] truncate"
                            title={[item.salt, item.composition2].filter(Boolean).join(' + ')}>
                            {[item.salt, item.composition2].filter(Boolean).join(' + ') || '—'}
                          </p>
                          {item.brand && <span className="text-[10px] text-slate-400">{item.brand}</span>}
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell">
                          {item.therapeutic_class
                            ? <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-100 uppercase">{item.therapeutic_class}</span>
                            : '—'}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">₹{item.mrp.toFixed(2)}</td>
                        <td className="px-5 py-3 text-[11px] text-slate-500">
                          {(() => {
                            const t = getMedType(item.unit, item.pack_size);
                            const { color } = MED_ICON[t];
                            const label = getPackLabel(item.pack_size, item.unit);
                            return label
                              ? <span className={`font-semibold ${color}`}>{label}</span>
                              : <span className="text-slate-400">—</span>;
                          })()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {importedNames.has(item.name.toLowerCase().trim()) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                              <CheckCircle size={12} /> Added
                            </span>
                          ) : (
                            <button
                              onClick={() => openImport(item)}
                              disabled={item.is_discontinued}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Download size={12} /> Add
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <PackageSearch size={48} className="mb-3 text-slate-200" />
                  <p className="font-medium">No results for "{catalogSearch}"</p>
                  <p className="text-sm mt-1">Try a different name or composition</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {catalogData && catalogData.pages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Page {catalogData.page} of {catalogData.pages.toLocaleString()} &nbsp;·&nbsp; {catalogData.total.toLocaleString()} total
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={catalogPage <= 1} onClick={() => setCatalogPage(p => p - 1)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={16} />
                  </button>
                  <input type="number" min={1} max={catalogData.pages} value={catalogPage}
                    onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= catalogData.pages) setCatalogPage(v); }}
                    className="w-16 text-center border border-slate-200 rounded-lg py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button disabled={catalogPage >= catalogData.pages} onClick={() => setCatalogPage(p => p + 1)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        , document.body)}

      {/* ══════════════════════════════════════════════════════════════════
          IMPORT CONFIGURE MODAL (layers on top of catalog)
      ═══════════════════════════════════════════════════════════════════ */}
      {importItem && createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configure & Add to Inventory</h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate font-medium">{importItem.name}</p>
              </div>
              <button onClick={() => setImportItem(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Medicine info */}
            <div className="mx-6 mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex gap-2 text-blue-800 text-xs">
                <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                <div>
                  <p className="font-bold">{[importItem.salt, importItem.composition2].filter(Boolean).join(' + ') || 'Composition not listed'}</p>
                  {importItem.therapeutic_class && <p className="mt-0.5 text-blue-600">{importItem.therapeutic_class}</p>}
                  {importItem.pack_size && <p className="mt-0.5 text-blue-400">{importItem.pack_size}</p>}
                  {importItem.uses && <p className="mt-1 text-blue-500 line-clamp-2">{importItem.uses}</p>}
                </div>
              </div>
            </div>

            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">MRP (₹)</label>
                  <input type="number" required step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-bold"
                    value={importForm.mrp}
                    onChange={e => setImportForm(f => ({ ...f, mrp: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Your Price (₹)</label>
                  <input type="number" required step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-bold text-blue-600"
                    value={importForm.price}
                    onChange={e => setImportForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  />
                  {importForm.mrp > 0 && importForm.price > 0 && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                      {(((importForm.mrp - importForm.price) / importForm.mrp) * 100).toFixed(1)}% margin
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Opening Stock</label>
                  <input type="number" required min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-medium"
                    value={importForm.stock_qty}
                    onChange={e => setImportForm(f => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">GST %</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                    value={importForm.gst_rate}
                    onChange={e => setImportForm(f => ({ ...f, gst_rate: parseInt(e.target.value) }))}>
                    {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">HSN Code</label>
                  <input type="text"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-mono"
                    value={importForm.hsn_code}
                    onChange={e => setImportForm(f => ({ ...f, hsn_code: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                    value={importExpiry ? importExpiry.split('-')[1] : ''}
                    onChange={e => {
                      const yr = importExpiry ? importExpiry.split('-')[0] : String(new Date().getFullYear());
                      setImportExpiry(e.target.value ? `${yr}-${e.target.value}` : '');
                    }}
                  >
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                    value={importExpiry ? importExpiry.split('-')[0] : ''}
                    onChange={e => {
                      const mo = importExpiry ? importExpiry.split('-')[1] : '01';
                      setImportExpiry(e.target.value ? `${e.target.value}-${mo}` : '');
                    }}
                  >
                    <option value="">Year</option>
                    {EXP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {/* Rack Location — Pro only (Import modal) */}
              {isPro && (
                <div>
                  <label className="block text-xs font-bold text-orange-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MapPin size={12} /> Rack / Shelf Location
                    <span className="ml-auto px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md">PRO</span>
                  </label>
                  <input type="text" placeholder='e.g. Rack B - Shelf 1'
                    className="w-full px-4 py-2.5 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400/40 outline-none bg-orange-50/50 focus:bg-white text-sm font-bold text-orange-800 placeholder-orange-300"
                    value={importForm.rack_location}
                    onChange={e => setImportForm(f => ({ ...f, rack_location: e.target.value }))}
                  />
                </div>
              )}
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setImportItem(null)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                  Back
                </button>
                <button type="submit" disabled={importLoading}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70">
                  {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {importLoading ? 'Adding…' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}

      {/* ══════════════════════════════════════════════════════════════════
          MANUAL ADD / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingMed ? 'Edit Product' : 'Add Custom Product'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Product Name</label>
                <input type="text" required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Composition / Salt</label>
                  <input type="text"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                    value={formData.salt} onChange={e => setFormData({ ...formData, salt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Manufacturer</label>
                  <input type="text"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                    value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">MRP (₹)</label>
                  <input type="number" required step="0.01"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-bold"
                    value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Your Price (₹)</label>
                  <input type="number" required step="0.01"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-bold text-blue-600"
                    value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">GST %</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm font-medium"
                    value={formData.gst_rate} onChange={e => setFormData({ ...formData, gst_rate: parseInt(e.target.value) })}>
                    {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {!editingMed && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                        value={formData.expiry_date ? formData.expiry_date.split('-')[1] : ''}
                        onChange={e => {
                          const yr = formData.expiry_date ? formData.expiry_date.split('-')[0] : String(new Date().getFullYear());
                          setFormData({ ...formData, expiry_date: e.target.value ? `${yr}-${e.target.value}` : '' });
                        }}
                      >
                        <option value="">Month</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                        value={formData.expiry_date ? formData.expiry_date.split('-')[0] : ''}
                        onChange={e => {
                          const mo = formData.expiry_date ? formData.expiry_date.split('-')[1] : '01';
                          setFormData({ ...formData, expiry_date: e.target.value ? `${e.target.value}-${mo}` : '' });
                        }}
                      >
                        <option value="">Year</option>
                        {EXP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className={editingMed ? "col-span-2" : ""}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">HSN Code</label>
                  <input type="text" required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-mono"
                    value={formData.hsn_code} onChange={e => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {!editingMed ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Stock</label>
                    <input type="number" required min="0"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                      value={formData.stock_qty} onChange={e => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-2 h-full">
                    <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-indigo-700 font-medium leading-tight">Stock and Expiry are managed via the <span className="font-bold">Batches</span> button in the table.</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unit Type</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm font-medium"
                    value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {/* Rack Location — Pro only */}
              {isPro && (
                <div className="relative">
                  <label className="block text-xs font-bold text-orange-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MapPin size={12} /> Rack / Shelf Location
                    <span className="ml-auto px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md">PRO</span>
                  </label>
                  <input type="text" placeholder='e.g. Rack A - Shelf 3'
                    className="w-full px-4 py-2.5 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400/40 outline-none transition-all bg-orange-50/50 focus:bg-white text-sm font-bold text-orange-800 placeholder-orange-300"
                    value={formData.rack_location}
                    onChange={e => setFormData({ ...formData, rack_location: e.target.value })}
                  />
                </div>
              )}
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Saving…' : (editingMed ? 'Save Changes' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}
      {/* Medicine Batches Modal */}
      <MedicineBatchesModal
        isOpen={!!batchModalMed}
        onClose={() => setBatchModalMed(null)}
        medicine={batchModalMed}
      />

    </div>
  );
};

