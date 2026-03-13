import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Building2,
  ChevronDown, ChevronRight, TrendingUp, Calendar, Filter,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../utils/cn';

export const RetailerLedgerPage: React.FC = () => {
  const { retailerLedgerSummary, retailerLedgerHistory, fetchRetailerLedgerSummary, fetchRetailerLedgerHistory } = useDataStore();
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  useEffect(() => { fetchRetailerLedgerSummary().catch(() => {}); }, []);

  const summary = retailerLedgerSummary;
  const agencies = summary?.agencies || [];
  const totalOutstanding = summary?.global_current_balance || 0;
  const totalLimit = summary?.global_credit_limit || 0;
  const hasLimit = totalLimit > 0;
  const available = hasLimit ? Math.max(0, totalLimit - totalOutstanding) : null;
  const utilization = hasLimit ? Math.min((totalOutstanding / totalLimit) * 100, 100) : 0;

  const handleAgencyClick = (wholesalerId: string) => {
    if (selectedAgency === wholesalerId) { setSelectedAgency(null); return; }
    setSelectedAgency(wholesalerId);
    if (!retailerLedgerHistory[wholesalerId]) fetchRetailerLedgerHistory(wholesalerId).catch(() => {});
  };

  const currentHistory = selectedAgency ? (retailerLedgerHistory[selectedAgency] || []) : [];
  const filteredHistory = filter === 'ALL' ? currentHistory : currentHistory.filter(e => e.type === filter);

  // Group by date
  const groupByDate = (entries: typeof currentHistory) => {
    const groups: Record<string, typeof currentHistory> = {};
    for (const entry of entries) {
      const date = new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      (groups[date] = groups[date] || []).push(entry);
    }
    return groups;
  };

  const dateGroups = groupByDate(filteredHistory);

  return (
    <div className="space-y-5">
      {/* Credit Overview Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl shadow-blue-600/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-blue-200" />
            <span className="text-xs font-medium text-blue-200 uppercase tracking-wider">Credit Overview</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mb-1">
                {hasLimit ? 'Available Credit' : 'Credit Limit'}
              </p>
              <p className="text-2xl font-bold">
                {hasLimit ? `₹${available!.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'No Limit'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-rose-300">₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-blue-200">Utilization</span>
              <span className="font-semibold">{hasLimit ? `${utilization.toFixed(0)}%` : '—'}</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${utilization}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn("h-full rounded-full", utilization > 80 ? "bg-rose-400" : utilization > 50 ? "bg-amber-400" : "bg-emerald-400")}
              />
            </div>
            <p className="text-[10px] text-blue-200">
              Total Limit: {hasLimit ? `₹${totalLimit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'No limit set'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Agency List */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Agencies</h3>
        <div className="space-y-2.5">
          {agencies.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 bg-white rounded-2xl border border-slate-100/80 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Building2 size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No agencies connected</p>
              <p className="text-xs text-slate-400 mt-1">Connect agencies to see your ledger</p>
            </motion.div>
          ) : (
            agencies.map((agency: any) => {
              const isSelected = selectedAgency === agency.wholesaler_id;
              return (
                <motion.div key={agency.wholesaler_id} layout className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <button onClick={() => handleAgencyClick(agency.wholesaler_id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-blue-50/20 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                      <Building2 size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{agency.wholesaler_name || agency.name || 'Agency'}</p>
                      {agency.is_primary && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg mt-0.5 inline-block border border-amber-200/50">Primary</span>}
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", agency.outstanding > 0 ? "text-rose-600" : "text-emerald-600")}>
                        ₹{(agency.outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">outstanding</p>
                    </div>
                    {isSelected ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </button>

                  {/* Transaction History */}
                  {isSelected && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-slate-100/60">
                      {/* Filter */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100/60">
                        <Filter size={12} className="text-slate-400" />
                        {['ALL', 'CREDIT', 'DEBIT'].map(f => (
                          <button key={f} onClick={() => setFilter(f as any)}
                            className={cn("text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all",
                              filter === f ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
                            {f === 'ALL' ? 'All' : f === 'CREDIT' ? 'Credits' : 'Debits'}
                          </button>
                        ))}
                      </div>

                      {filteredHistory.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-400 font-medium">No transactions found</div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                          {Object.entries(dateGroups).map(([date, entries]) => (
                            <div key={date}>
                              <div className="sticky top-0 px-4 py-2 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100/60">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={10} />{date}</span>
                              </div>
                              {entries.map((entry: any) => (
                                <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", entry.type === 'DEBIT' ? "bg-rose-50 border border-rose-100/50" : "bg-emerald-50 border border-emerald-100/50")}>
                                    {entry.type === 'DEBIT' ? <ArrowUpRight size={14} className="text-rose-600" /> : <ArrowDownLeft size={14} className="text-emerald-600" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{entry.description}</p>
                                    {entry.reference_id && <p className="text-[10px] text-slate-400 font-medium">Ref: {entry.reference_id}</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className={cn("text-sm font-bold", entry.type === 'DEBIT' ? "text-rose-600" : "text-emerald-600")}>
                                      {entry.type === 'DEBIT' ? '+' : '-'}₹{entry.amount.toFixed(0)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">Bal: ₹{entry.balance_after?.toFixed(0) || '—'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
