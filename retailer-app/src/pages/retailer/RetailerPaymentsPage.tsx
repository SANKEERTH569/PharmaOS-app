import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Banknote, Smartphone, FileText, Building2,
  Calendar, TrendingUp, ArrowDownLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import api from '../../utils/api';
import { Payment, PaymentMethod } from '../../types';

const methodConfig: Record<PaymentMethod, { icon: any; label: string; color: string; bg: string }> = {
  CASH: { icon: Banknote, label: 'Cash', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  UPI: { icon: Smartphone, label: 'UPI', color: 'text-violet-600', bg: 'bg-violet-50' },
  CHEQUE: { icon: FileText, label: 'Cheque', color: 'text-amber-600', bg: 'bg-amber-50' },
  BANK_TRANSFER: { icon: Building2, label: 'Bank Transfer', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export const RetailerPaymentsPage: React.FC = () => {
  const { retailer } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'ALL'>('ALL');

  useEffect(() => {
    api.get('/payments/my').then(res => {
      setPayments(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filterMethod === 'ALL' ? payments : payments.filter(p => p.method === filterMethod);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Group by month
  const groupByMonth = (entries: Payment[]) => {
    const groups: Record<string, Payment[]> = {};
    for (const entry of entries) {
      const month = new Date(entry.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      (groups[month] = groups[month] || []).push(entry);
    }
    return groups;
  };
  const monthGroups = groupByMonth(filtered);

  return (
    <div className="space-y-5">
      {/* Summary Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl shadow-emerald-600/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-emerald-200" />
            <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider">Payment Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-emerald-200 uppercase">Total Paid</p>
              <p className="text-2xl font-bold">₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-200 uppercase">Transactions</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Method Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilterMethod('ALL')}
          className={cn("text-[10px] font-bold px-3.5 py-1.5 rounded-lg border whitespace-nowrap transition-all",
            filterMethod === 'ALL' ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
          All
        </button>
        {(Object.keys(methodConfig) as PaymentMethod[]).map(m => {
          const cfg = methodConfig[m];
          return (
            <button key={m} onClick={() => setFilterMethod(m)}
              className={cn("text-[10px] font-bold px-3.5 py-1.5 rounded-lg border whitespace-nowrap transition-all",
                filterMethod === m ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Payment History */}
      {loading ? (
        <div className="text-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 bg-white rounded-2xl border border-slate-100/80 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No payments found</p>
          <p className="text-xs text-slate-400 mt-1">Your payment history will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {Object.entries(monthGroups).map(([month, entries]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{month}</span>
                <span className="text-[10px] font-bold text-slate-400 ml-auto">₹{entries.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
                {entries.map((payment, idx) => {
                  const cfg = methodConfig[payment.method] || methodConfig.CASH;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.bg, cfg.bg.replace('bg-', 'border-').replace('50', '100/50'))}>
                        <Icon size={16} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">Payment via {cfg.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {payment.notes && ` · ${payment.notes}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">₹{payment.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className={cn("text-[9px] font-semibold uppercase",
                          payment.status === 'COMPLETED' ? "text-emerald-500" : payment.status === 'PENDING' ? "text-amber-500" : "text-rose-500")}>
                          {payment.status}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
