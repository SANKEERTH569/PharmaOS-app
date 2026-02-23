
import React, { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { Filter, Download } from 'lucide-react';

export const LedgerPage = () => {
  const { ledgerEntries, retailers } = useDataStore();
  const { wholesaler } = useAuthStore();
  const [filterRetailer, setFilterRetailer] = useState<string>('ALL');

  // Filter entries specific to this wholesaler
  const myLedgerEntries = ledgerEntries.filter(l => l.wholesaler_id === wholesaler?.id);

  const filteredEntries = filterRetailer === 'ALL'
    ? myLedgerEntries
    : myLedgerEntries.filter(e => e.retailer_id === filterRetailer);

  // Sort by date desc
  const sortedEntries = [...filteredEntries].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">General Ledger</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Full transaction history for {wholesaler?.name}.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative">
            <select
              className="pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-slate-700 shadow-sm w-full"
              value={filterRetailer}
              onChange={(e) => setFilterRetailer(e.target.value)}
            >
              <option value="ALL">All Retailers</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>{r.shop_name}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>

          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Transaction Time</th>
                <th className="px-6 py-4 font-bold tracking-wider">Retailer</th>
                <th className="px-6 py-4 font-bold tracking-wider">Description</th>
                <th className="px-6 py-4 text-center font-bold tracking-wider">Type</th>
                <th className="px-6 py-4 text-right font-bold tracking-wider">Amount</th>
                <th className="px-6 py-4 text-right font-bold tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedEntries.map((entry) => {
                const retailer = retailers.find(r => r.id === entry.retailer_id);
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-slate-900 font-medium">{new Date(entry.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {retailer?.shop_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{entry.description}</p>
                      {entry.reference_id && <span className="text-xs text-slate-400 font-mono">Ref: {entry.reference_id}</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${entry.type === 'DEBIT' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${entry.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {entry.type === 'DEBIT' ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{entry.balance_after.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedEntries.length === 0 && (
            <div className="p-16 text-center text-slate-500">
              No ledger entries found for your account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
