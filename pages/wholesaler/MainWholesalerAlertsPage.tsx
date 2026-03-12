import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Package, Calendar, Search,
  ArrowRight, Clock, ShieldAlert, TrendingDown, CheckCircle2,
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

  const TABS: { key: AlertType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalAlerts },
    { key: 'expired', label: 'Expired', count: alerts.expired.length },
    { key: 'near_expiry', label: 'Expiring Soon', count: alerts.nearExpiry.length },
    { key: 'out_of_stock', label: 'Out of Stock', count: alerts.outOfStock.length },
    { key: 'low_stock', label: 'Low Stock', count: alerts.lowStock.length },
  ];

  const SUMMARY_CARDS = [
    { label: 'Expired', count: alerts.expired.length, accent: 'border-l-rose-500', text: 'text-rose-600', icon: <AlertTriangle size={15} className="text-rose-400" /> },
    { label: 'Expiring Soon', count: alerts.nearExpiry.length, accent: 'border-l-amber-400', text: 'text-amber-600', icon: <Clock size={15} className="text-amber-400" /> },
    { label: 'Out of Stock', count: alerts.outOfStock.length, accent: 'border-l-red-500', text: 'text-red-600', icon: <Package size={15} className="text-red-400" /> },
    { label: 'Low Stock', count: alerts.lowStock.length, accent: 'border-l-orange-400', text: 'text-orange-500', icon: <TrendingDown size={15} className="text-orange-400" /> },
  ];

  const getFilteredItems = () => {
    const items: (Medicine & { alertTag: string; severity: 'critical' | 'warning' | 'info'; detail: string })[] = [];

    if (activeTab === 'all' || activeTab === 'expired')
      alerts.expired.forEach(m => items.push({ ...m, alertTag: 'Expired', severity: 'critical', detail: `${Math.abs(m.daysLeft)}d ago` }));
    if (activeTab === 'all' || activeTab === 'near_expiry')
      alerts.nearExpiry.forEach(m => items.push({ ...m, alertTag: `${m.daysLeft}d left`, severity: m.daysLeft <= 30 ? 'warning' : 'info', detail: `Expires ${new Date(m.expiry_date!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` }));
    if (activeTab === 'all' || activeTab === 'out_of_stock')
      alerts.outOfStock.forEach(m => items.push({ ...m, alertTag: 'No Stock', severity: 'critical', detail: 'Zero units' }));
    if (activeTab === 'all' || activeTab === 'low_stock')
      alerts.lowStock.forEach(m => items.push({ ...m, alertTag: `${m.stock_qty} units`, severity: 'warning', detail: 'Low stock' }));

    if (search.trim()) {
      const q = search.toLowerCase();
      return items.filter(i => i.medicine_name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q));
    }
    return items;
  };

  const filteredItems = getFilteredItems();

  const severityStyles: Record<string, string> = {
    critical: 'bg-rose-50 text-rose-700 border border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Alerts & Expiry Tracker</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts !== 1 ? 's' : ''} need attention`
              : 'All items are healthy'}
          </p>
        </div>
        <button
          onClick={() => navigate('/wholesaler/catalog')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Package size={13} /> Manage Catalog <ArrowRight size={12} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map(c => (
          <div key={c.label} className={cn('bg-white border border-slate-200 border-l-4 rounded-xl p-4', c.accent)}>
            <div className="flex items-center justify-between mb-2">
              {c.icon}
              <span className={cn('text-2xl font-bold', c.text)}>{c.count}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide p-0.5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56 px-1 pb-1 sm:pb-0 sm:pr-1">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-sm">No alerts found</p>
          <p className="text-slate-400 text-xs mt-1">All medicines in this category look healthy</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {filteredItems.map((item, idx) => (
            <div key={item.id + item.alertTag + idx} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap shrink-0', severityStyles[item.severity])}>
                  {item.alertTag}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.medicine_name}</p>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    {item.brand && <span className="text-xs text-slate-400">{item.brand}</span>}
                    <span className="text-xs text-slate-400">₹{item.price}</span>
                    {item.expiry_date && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(item.expiry_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {item.stock_qty !== null && (
                      <span className="text-xs text-slate-400">Qty: {item.stock_qty}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 whitespace-nowrap ml-4 shrink-0">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
