import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Package, Calendar, Search, Filter,
  ArrowRight, Clock, ShieldAlert, TrendingDown, CheckCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../utils/cn';

interface Medicine {
  id: string;
  medicine_name: string;
  brand: string | null;
  mrp: number | null;
  price: number;
  stock_qty: number | null;
  expiry_date: string | null;
  is_active: boolean;
}

type AlertType = 'all' | 'expired' | 'near_expiry' | 'low_stock' | 'out_of_stock';

const ALERT_TABS: { key: AlertType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All Alerts', icon: <ShieldAlert size={14} />, color: 'text-slate-600' },
  { key: 'expired', label: 'Expired', icon: <AlertTriangle size={14} />, color: 'text-rose-600' },
  { key: 'near_expiry', label: 'Expiring Soon', icon: <Clock size={14} />, color: 'text-amber-600' },
  { key: 'out_of_stock', label: 'Out of Stock', icon: <Package size={14} />, color: 'text-red-600' },
  { key: 'low_stock', label: 'Low Stock', icon: <TrendingDown size={14} />, color: 'text-orange-600' },
];

function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 86400));
}

export const MainWholesalerAlertsPage = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AlertType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/main-wholesalers/medicines')
      .then(({ data }) => setMedicines(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const alerts = useMemo(() => {
    const expired: (Medicine & { daysLeft: number })[] = [];
    const nearExpiry: (Medicine & { daysLeft: number })[] = [];
    const outOfStock: Medicine[] = [];
    const lowStock: Medicine[] = [];

    medicines.filter(m => m.is_active).forEach(m => {
      const days = daysUntilExpiry(m.expiry_date);
      if (days !== null && days <= 0) expired.push({ ...m, daysLeft: days });
      else if (days !== null && days <= 90) nearExpiry.push({ ...m, daysLeft: days });

      if (m.stock_qty !== null && m.stock_qty === 0) outOfStock.push(m);
      else if (m.stock_qty !== null && m.stock_qty > 0 && m.stock_qty < 10) lowStock.push(m);
    });

    nearExpiry.sort((a, b) => a.daysLeft - b.daysLeft);
    expired.sort((a, b) => a.daysLeft - b.daysLeft);
    lowStock.sort((a, b) => (a.stock_qty ?? 0) - (b.stock_qty ?? 0));

    return { expired, nearExpiry, outOfStock, lowStock };
  }, [medicines]);

  const totalAlerts = alerts.expired.length + alerts.nearExpiry.length + alerts.outOfStock.length + alerts.lowStock.length;

  const getFilteredItems = (): (Medicine & { alertTag: string; alertColor: string; alertBg: string; detail: string })[] => {
    const items: (Medicine & { alertTag: string; alertColor: string; alertBg: string; detail: string })[] = [];

    const addExpired = () => alerts.expired.forEach(m => items.push({
      ...m, alertTag: 'EXPIRED', alertColor: 'text-rose-700', alertBg: 'bg-rose-50 border-rose-200',
      detail: `Expired ${Math.abs(m.daysLeft)} day${Math.abs(m.daysLeft) !== 1 ? 's' : ''} ago`,
    }));
    const addNearExpiry = () => alerts.nearExpiry.forEach(m => items.push({
      ...m, alertTag: `${m.daysLeft}d LEFT`, alertColor: 'text-amber-700', alertBg: 'bg-amber-50 border-amber-200',
      detail: `Expires in ${m.daysLeft} day${m.daysLeft !== 1 ? 's' : ''}`,
    }));
    const addOutOfStock = () => alerts.outOfStock.forEach(m => items.push({
      ...m, alertTag: 'NO STOCK', alertColor: 'text-red-700', alertBg: 'bg-red-50 border-red-200',
      detail: 'Stock is zero',
    }));
    const addLowStock = () => alerts.lowStock.forEach(m => items.push({
      ...m, alertTag: `${m.stock_qty} LEFT`, alertColor: 'text-orange-700', alertBg: 'bg-orange-50 border-orange-200',
      detail: `Only ${m.stock_qty} units remaining`,
    }));

    if (activeTab === 'all' || activeTab === 'expired') addExpired();
    if (activeTab === 'all' || activeTab === 'near_expiry') addNearExpiry();
    if (activeTab === 'all' || activeTab === 'out_of_stock') addOutOfStock();
    if (activeTab === 'all' || activeTab === 'low_stock') addLowStock();

    if (search.trim()) {
      const q = search.toLowerCase();
      return items.filter(i => i.medicine_name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q));
    }
    return items;
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Alerts & Expiry Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalAlerts > 0
              ? <span className="text-amber-600 font-semibold">{totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} need attention</span>
              : <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={13} /> All clear — no alerts</span>
            }
          </p>
        </div>
        <button
          onClick={() => navigate('/wholesaler/catalog')}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <Package size={13} /> Manage Catalog <ArrowRight size={12} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Expired', count: alerts.expired.length, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: <AlertTriangle size={16} className="text-rose-500" /> },
          { label: 'Expiring Soon', count: alerts.nearExpiry.length, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <Clock size={16} className="text-amber-500" /> },
          { label: 'Out of Stock', count: alerts.outOfStock.length, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <Package size={16} className="text-red-500" /> },
          { label: 'Low Stock', count: alerts.lowStock.length, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <TrendingDown size={16} className="text-orange-500" /> },
        ].map(c => (
          <div key={c.label} className={cn('rounded-2xl border p-4', c.bg, c.border)}>
            <div className="flex items-center justify-between mb-2">{c.icon}<span className={cn('text-2xl font-black', c.color)}>{c.count}</span></div>
            <p className={cn('text-xs font-bold', c.color)}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {ALERT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {tab.icon}{tab.label}
              {tab.key === 'all' && totalAlerts > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full">{totalAlerts}</span>}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search medicines..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center">
          <CheckCircle size={36} className="text-emerald-300 mx-auto mb-2" />
          <p className="text-slate-500 font-semibold text-sm">No alerts in this category</p>
          <p className="text-slate-400 text-xs mt-1">All medicines look healthy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <div key={item.id + item.alertTag} className={cn('bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between hover:shadow-sm transition-all')}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('px-2 py-1 rounded-lg text-[10px] font-black border whitespace-nowrap', item.alertBg, item.alertColor)}>
                  {item.alertTag}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{item.medicine_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                    {item.brand && <span>{item.brand}</span>}
                    <span>₹{item.price}</span>
                    {item.expiry_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(item.expiry_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {item.stock_qty !== null && <span>Stock: {item.stock_qty}</span>}
                  </div>
                </div>
              </div>
              <p className={cn('text-xs font-semibold whitespace-nowrap ml-3', item.alertColor)}>{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
