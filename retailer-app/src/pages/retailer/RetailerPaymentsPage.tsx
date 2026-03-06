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
        className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
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
          className={cn("text-[10px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors",
            filterMethod === 'ALL' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
          All
        </button>
        {(Object.keys(methodConfig) as PaymentMethod[]).map(m => {
          const cfg = methodConfig[m];
          return (
            <button key={m} onClick={() => setFilterMethod(m)}
              className={cn("text-[10px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors",
                filterMethod === m ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Payment History */}
      {loading ? (
        <div className="text-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No payments found</p>
          <p className="text-xs text-slate-400 mt-1">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(monthGroups).map(([month, entries]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{month}</span>
                <span className="text-[10px] text-slate-300 ml-auto">₹{entries.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {entries.map((payment, idx) => {
                  const cfg = methodConfig[payment.method] || methodConfig.CASH;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon size={16} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">Payment via {cfg.label}</p>
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
