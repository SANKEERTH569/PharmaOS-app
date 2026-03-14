import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, Pill, Edit, BookOpen,
  ChevronLeft, ChevronRight, X, Download, CheckCircle, Trash2,
  Loader2, Info, PackageSearch, AlertCircle, Package,
  FlaskConical, Syringe, Droplets, Wind, Package2,
  TrendingUp, Calendar, AlertTriangle, BarChart2, Truck, Upload, FileSpreadsheet,
} from 'lucide-react';
import { MainWholesalerMedicine, CatalogMedicine, CatalogPage } from '../../types';
import api from '../../utils/api';
import { BulkImportModal } from './BulkImportModal';

// ── Medicine type helpers ─────────────────────────────────────────────────────
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

const MED_ICON: Record<MedType, { Icon: React.ElementType; bg: string; color: string }> = {
  tablet:    { Icon: Pill,         bg: 'bg-blue-50',    color: 'text-blue-400'    },
  syrup:     { Icon: FlaskConical, bg: 'bg-amber-50',   color: 'text-amber-400'   },
  injection: { Icon: Syringe,      bg: 'bg-red-50',     color: 'text-red-400'     },
  cream:     { Icon: Droplets,     bg: 'bg-emerald-50', color: 'text-emerald-400' },
  inhaler:   { Icon: Wind,         bg: 'bg-purple-50',  color: 'text-purple-400'  },
  powder:    { Icon: Package2,     bg: 'bg-slate-50',   color: 'text-slate-400'   },
};

// ── Constants ─────────────────────────────────────────────────────────────────
const UNITS = ['strip', 'bottle', 'box', 'tube', 'vial', 'inhaler', 'sachet'];
const GST_OPTIONS = [0, 5, 12, 18, 28];
const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
];
const EXP_YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i);

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const emptyForm = () => ({
  medicine_name: '', brand: '', mrp: '', price: '', stock_qty: '', expiry_date: '', is_active: true,
  gst_rate: 12, hsn_code: '3004', unit_type: 'strip',
});

export const MainWholesalerCatalogPage = () => {
  // ── My catalog state ──────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<MainWholesalerMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // ── Add/Edit modal state ──────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMed, setEditingMed] = useState<MainWholesalerMedicine | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Global catalog browser state ──────────────────────────────────────────
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogClass, setCatalogClass] = useState('');
  const [catalogData, setCatalogData] = useState<CatalogPage | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);

  // ── Analytics state ───────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<{
    supply_orders: { total: number; pending: number; accepted: number; dispatched: number; delivered: number; cancelled: number };
    revenue: { total: number; this_month: number; last_month: number };
    catalog: { total: number; active: number; low_stock: number; near_expiry: number };
    top_products: Array<{ medicine_name: string; total_qty: number; total_revenue: number }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ── Alert filter state ────────────────────────────────────────────────────
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | 'low_stock' | 'expiring'>('all');

  // ── Import configure state ────────────────────────────────────────────────
  const [importItem, setImportItem] = useState<CatalogMedicine | null>(null);
  const [importForm, setImportForm] = useState({ mrp: '', price: '', stock_qty: '', gst_rate: 5, hsn_code: '3004', unit_type: 'strip' });
  const [importExpiry, setImportExpiry] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // ── Bulk import state ──────────────────────────────────────────────────────
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; medicine: string; error: string }>;
  } | null>(null);

  const debouncedCatalogSearch = useDebounce(catalogSearch, 400);

  // ── Derived ───────────────────────────────────────────────────────────────
  const importedNames = new Set(medicines.map(m => m.medicine_name.toLowerCase().trim()));

  const lowStockCount = medicines.filter(m => m.stock_qty != null && m.stock_qty <= 20).length;
  const expiringCount = medicines.filter(m => {
    if (!m.expiry_date) return false;
    const exp = new Date(m.expiry_date);
    const now = new Date();
    const diffMonths = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
    return diffMonths <= 3;
  }).length;

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.brand || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeAlertFilter === 'low_stock') return m.stock_qty != null && m.stock_qty <= 20;
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

  // ── Fetch my catalog ──────────────────────────────────────────────────────
  const fetchMedicines = async () => {
    try {
      const { data } = await api.get('/main-wholesalers/medicines');
      setMedicines(data);
    } catch (err) {
      console.error('Failed to fetch catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicines(); }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/main-wholesalers/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };
  useEffect(() => { fetchAnalytics(); }, []);

  // ── Add/Edit handlers ─────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingMed(null);
    setFormData(emptyForm());
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (med: MainWholesalerMedicine) => {
    setEditingMed(med);
    const expDate = med.expiry_date ? med.expiry_date.split('T')[0] : '';
    const expYearMonth = expDate ? expDate.slice(0, 7) : '';
    setFormData({
      medicine_name: med.medicine_name,
      brand: med.brand || '',
      mrp: med.mrp ? med.mrp.toString() : '',
      price: med.price.toString(),
      stock_qty: med.stock_qty != null ? med.stock_qty.toString() : '',
      expiry_date: expYearMonth,
      is_active: med.is_active,
      gst_rate: med.gst_rate ?? 12,
      hsn_code: med.hsn_code || '3004',
      unit_type: med.unit_type || 'strip',
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.medicine_name.trim() || !formData.price.trim()) {
      return setFormError('Medicine name and selling price are required.');
    }
    setSaving(true);
    try {
      const expiryIso = formData.expiry_date ? new Date(formData.expiry_date + '-01').toISOString() : null;
      const payload = {
        medicine_name: formData.medicine_name,
        brand: formData.brand,
        mrp: formData.mrp || null,
        price: formData.price,
        stock_qty: formData.stock_qty !== '' ? parseInt(formData.stock_qty) : null,
        expiry_date: expiryIso,
        is_active: formData.is_active,
        gst_rate: formData.gst_rate,
        hsn_code: formData.hsn_code,
        unit_type: formData.unit_type,
      };
      if (editingMed) {
        await api.patch(`/main-wholesalers/medicines/${editingMed.id}`, payload);
      } else {
        await api.post('/main-wholesalers/medicines', payload);
      }
      await fetchMedicines();
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your catalog?`)) return;
    try {
      await api.delete(`/main-wholesalers/medicines/${id}`);
      setMedicines(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete medicine.');
    }
  };

  const handleToggleStatus = async (med: MainWholesalerMedicine) => {
    try {
      await api.patch(`/main-wholesalers/medicines/${med.id}`, { is_active: !med.is_active });
      setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, is_active: !m.is_active } : m));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  // ── Import from catalog ───────────────────────────────────────────────────
  const openImport = (item: CatalogMedicine) => {
    setImportItem(item);
    setImportSuccess(null);
    setImportExpiry('');
    setImportForm({
      mrp: item.mrp ? item.mrp.toString() : '',
      price: item.mrp ? (item.mrp * 0.75).toFixed(2) : '',
      stock_qty: '',
      gst_rate: 12,
      hsn_code: '3004',
      unit_type: 'strip',
    });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importItem) return;
    if (!importForm.price.trim()) return;
    setImportLoading(true);
    try {
      const expiry = importExpiry ? new Date(importExpiry + '-01').toISOString() : null;
      const { data } = await api.post('/main-wholesalers/medicines', {
        medicine_name: importItem.name,
        brand: importItem.brand || null,
        mrp: importForm.mrp || null,
        price: importForm.price,
        is_active: true,
        stock_qty: importForm.stock_qty ? parseInt(importForm.stock_qty) : null,
        expiry_date: expiry,
        gst_rate: importForm.gst_rate,
        hsn_code: importForm.hsn_code,
        unit_type: importForm.unit_type,
      });
      setMedicines(prev => [data, ...prev]);
      setImportSuccess(importItem.name);
      setImportItem(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  // ── Bulk import handlers ──────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    setBulkResults(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const { data } = await api.post('/bulk-import/medicines', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResults(data);
      if (data.success > 0) {
        await fetchMedicines(); // Refresh the list
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bulk import failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/bulk-import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'medicine_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download template');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Manage {medicines.length} products across {new Set(medicines.map(m => m.brand).filter(Boolean)).size} brands
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text" placeholder="Search catalog..."
              className="w-full sm:w-72 pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 outline-none shadow-sm transition-all"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Bulk import button */}
          <button
            onClick={() => { setShowBulkImport(true); setBulkFile(null); setBulkResults(null); }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-sm transition-all"
            title="Bulk import medicines from Excel/CSV"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Bulk Import</span>
          </button>
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

      {/* ── Analytics Cards ──────────────────────────────────────────── */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-7 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : analytics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center"><Pill size={15} className="text-teal-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Products</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{analytics.catalog.active}</p>
              <p className="text-xs text-slate-400 mt-1">{analytics.catalog.total} total in catalog</p>
            </div>
            <div className={`bg-white rounded-2xl border p-5 shadow-sm ${analytics.catalog.low_stock > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200/60'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${analytics.catalog.low_stock > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <Package size={15} className={analytics.catalog.low_stock > 0 ? 'text-amber-600' : 'text-slate-500'} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Low Stock</span>
              </div>
              <p className={`text-3xl font-extrabold ${analytics.catalog.low_stock > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{analytics.catalog.low_stock}</p>
              <p className="text-xs text-slate-400 mt-1">items with stock &lt; 10</p>
            </div>
            <div className={`bg-white rounded-2xl border p-5 shadow-sm ${analytics.catalog.near_expiry > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200/60'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${analytics.catalog.near_expiry > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                  <Calendar size={15} className={analytics.catalog.near_expiry > 0 ? 'text-rose-600' : 'text-slate-500'} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Near Expiry</span>
              </div>
              <p className={`text-3xl font-extrabold ${analytics.catalog.near_expiry > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{analytics.catalog.near_expiry}</p>
              <p className="text-xs text-slate-400 mt-1">expiring within 30 days</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center"><TrendingUp size={15} className="text-indigo-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Revenue</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {analytics.revenue.total >= 100000 ? `₹${(analytics.revenue.total / 100000).toFixed(1)}L` : analytics.revenue.total >= 1000 ? `₹${(analytics.revenue.total / 1000).toFixed(1)}K` : `₹${analytics.revenue.total.toFixed(0)}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">{analytics.supply_orders.delivered} delivered orders</p>
            </div>
          </div>
          {analytics.supply_orders.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/60 px-6 py-4 shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Supply Orders</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{analytics.supply_orders.total} total</span>
              </div>
              <div className="flex flex-wrap gap-2 ml-auto">
                {analytics.supply_orders.pending > 0 && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg">{analytics.supply_orders.pending} Pending</span>}
                {analytics.supply_orders.accepted > 0 && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg">{analytics.supply_orders.accepted} Accepted</span>}
                {analytics.supply_orders.dispatched > 0 && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg">{analytics.supply_orders.dispatched} Dispatched</span>}
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">{analytics.supply_orders.delivered} Delivered</span>
              </div>
            </div>
          )}
        </>
      )}

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
            <p className={`text-sm font-black ${activeAlertFilter === 'all' ? 'text-indigo-900' : 'text-slate-700'}`}>{medicines.length}</p>
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
              <th className="px-6 py-4 font-bold tracking-wider">Pricing</th>
              <th className="px-6 py-4 font-bold tracking-wider">GST</th>
              <th className="px-6 py-4 font-bold tracking-wider">Stock</th>
              <th className="px-6 py-4 font-bold tracking-wider">Status</th>
              <th className="px-6 py-4 text-right font-bold tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-16 text-center">
                <Loader2 size={32} className="mx-auto text-indigo-400 animate-spin mb-3" />
                <p className="text-slate-400 font-medium">Loading catalog...</p>
              </td></tr>
            ) : filteredMedicines.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-16 text-center">
                <Pill size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="font-medium text-slate-500">
                  {medicines.length === 0 ? 'No products in your catalog.' : `No results for "${search}".`}
                </p>
                {medicines.length === 0 && (
                  <button onClick={() => setShowCatalog(true)}
                    className="mt-4 inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                    <BookOpen size={15} /> Import from 2.5 lakh catalog
                  </button>
                )}
              </td></tr>
            ) : (
              filteredMedicines.slice(0, 100).map(med => {
                const margin = med.mrp && med.mrp > 0
                  ? (((med.mrp - med.price) / med.mrp) * 100).toFixed(1)
                  : null;
                return (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Product Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const t = getMedType(med.unit_type, med.medicine_name);
                          const { Icon, bg, color } = MED_ICON[t];
                          return (
                            <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center border border-slate-100 transition-colors shrink-0`}>
                              <Icon size={18} />
                            </div>
                          );
                        })()}
                        <div>
                          <span className="font-bold text-slate-900 block">{med.medicine_name}</span>
                        </div>
                      </div>
                    </td>
                    {/* Brand */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 text-[10px] font-bold uppercase border border-slate-200 w-fit">
                          {med.brand || '—'}
                        </span>
                        {med.unit_type && (
                          <span className="text-[10px] text-slate-400">{med.unit_type}</span>
                        )}
                      </div>
                    </td>
                    {/* Pricing */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">₹{med.price.toFixed(2)}</span>
                          {med.mrp && <span className="text-xs text-slate-400 line-through">₹{med.mrp.toFixed(2)}</span>}
                        </div>
                        {margin && (
                          <span className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded border border-emerald-100">
                            {margin}% Margin
                          </span>
                        )}
                      </div>
                    </td>
                    {/* GST */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{med.gst_rate}%</span>
                        <span className="text-[10px] text-slate-400 font-mono">HSN: {med.hsn_code}</span>
                      </div>
                    </td>
                    {/* Stock + Expiry combined */}
                    <td className="px-6 py-4">
                      <div className={`flex items-center font-bold text-sm ${med.stock_qty != null && med.stock_qty <= 20 ? 'text-orange-600' : 'text-slate-700'}`}>
                        {med.stock_qty != null && med.stock_qty <= 20 && <AlertTriangle size={14} className="mr-1.5" />}
                        {med.stock_qty != null ? med.stock_qty : <span className="text-slate-300 text-xs italic font-normal">—</span>}
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
                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(med)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all
                          ${med.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {med.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(med)}
                          title="Edit"
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id, med.medicine_name)}
                          title="Delete"
                          className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filteredMedicines.length > 100 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-xs font-medium">
            Showing first 100 of {filteredMedicines.length} results. Use search to filter.
          </div>
        )}
      </div>

      {/* ── Top Selling Products ─────────────────────────────────────── */}
      {analytics && analytics.top_products.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <BarChart2 size={18} className="text-indigo-600" />
            <h2 className="font-extrabold text-slate-900">Top Selling Products</h2>
            <span className="text-xs text-slate-400 ml-auto">Based on delivered supply orders</span>
          </div>
          <div className="divide-y divide-slate-50">
            {analytics.top_products.slice(0, 8).map((p, i) => (
              <div key={p.medicine_name} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{p.medicine_name}</p>
                  <p className="text-xs text-slate-400">{p.total_qty} units sold</p>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm shrink-0">
                  {p.total_revenue >= 100000 ? `₹${(p.total_revenue / 100000).toFixed(1)}L` : p.total_revenue >= 1000 ? `₹${(p.total_revenue / 1000).toFixed(1)}K` : `₹${p.total_revenue.toFixed(0)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <span className="font-bold">{importSuccess}</span> added to your catalog!
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
                <h2 className="text-lg font-bold text-slate-900">Configure & Add to Catalog</h2>
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
                </div>
              </div>
            </div>

            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">MRP (₹) <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-bold"
                    value={importForm.mrp}
                    onChange={e => setImportForm(f => ({ ...f, mrp: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">B2B Price (₹) <span className="text-rose-500">*</span></label>
                  <input type="number" required step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-bold text-blue-600"
                    value={importForm.price}
                    onChange={e => setImportForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                  {importForm.mrp && parseFloat(importForm.mrp) > 0 && importForm.price && parseFloat(importForm.price) > 0 && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                      {(((parseFloat(importForm.mrp) - parseFloat(importForm.price)) / parseFloat(importForm.mrp)) * 100).toFixed(1)}% margin
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Stock Qty</label>
                  <input type="number" min="0" step="1"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white text-sm font-bold"
                    value={importForm.stock_qty}
                    onChange={e => setImportForm(f => ({ ...f, stock_qty: e.target.value }))}
                    placeholder="e.g. 500"
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
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unit Type</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium"
                    value={importForm.unit_type}
                    onChange={e => setImportForm(f => ({ ...f, unit_type: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setImportItem(null)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                  Back
                </button>
                <button type="submit" disabled={importLoading}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70">
                  {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {importLoading ? 'Adding…' : 'Add to Catalog'}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingMed ? 'Edit Product' : 'Add Custom Product'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Product Name</label>
                <input type="text" required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                  value={formData.medicine_name} onChange={e => setFormData({ ...formData, medicine_name: e.target.value })}
                  placeholder="e.g. Dolo 650mg Tablet"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Brand / Manufacturer <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <input type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
                  value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Micro Labs"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">MRP (₹) <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                  <input type="number" step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-bold"
                    value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">B2B Price (₹) <span className="text-rose-500">*</span></label>
                  <input type="number" required step="0.01" min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-bold text-blue-600"
                    value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">HSN Code</label>
                  <input type="text"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-mono"
                    value={formData.hsn_code} onChange={e => setFormData({ ...formData, hsn_code: e.target.value })}
                    placeholder="3004"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unit Type</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm font-medium"
                    value={formData.unit_type} onChange={e => setFormData({ ...formData, unit_type: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Stock Qty <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" min="0" step="1"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-bold"
                    value={formData.stock_qty} onChange={e => setFormData({ ...formData, stock_qty: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
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
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="isActiveCustom"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveCustom" className="text-sm text-slate-700 select-none">Available for ordering (Active)</label>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Saving…' : (editingMed ? 'Save Changes' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}

      {/* ══════════════════════════════════════════════════════════════════
          BULK IMPORT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <BulkImportModal
        show={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        file={bulkFile}
        setFile={setBulkFile}
        uploading={bulkUploading}
        results={bulkResults}
        onImport={handleBulkImport}
        onDownloadTemplate={downloadTemplate}
      />
    </div>
  );
};
