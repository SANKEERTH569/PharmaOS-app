
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { 
  ArrowLeft, Phone, MapPin, Edit, IndianRupee, 
  CreditCard, TrendingUp, History, FileText,
  Calendar
} from 'lucide-react';
import { PaymentMethod } from '../types';

export const RetailerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRetailer, ledgerEntries, payments, recordPayment, getWholesalerRetailerBalance } = useDataStore();
  const { wholesaler } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PAYMENTS'>('LEDGER');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const retailer = getRetailer(id || '');

  if (!retailer) {
    return <div className="p-10 text-center text-slate-500">Retailer not found</div>;
  }

  // Filter ledger and payments by wholesaler
  const retailerLedger = ledgerEntries
    .filter(l => l.retailer_id === retailer.id && l.wholesaler_id === wholesaler?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const retailerPayments = payments
    .filter(p => p.retailer_id === retailer.id && p.wholesaler_id === wholesaler?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && wholesaler) {
      recordPayment(retailer.id, parseFloat(amount), method, wholesaler.id, "Manual Entry from Profile");
      setShowPaymentModal(false);
      setAmount('');
      setMethod('CASH');
    }
  };

  // Dynamic balance calculation
  const currentBalance = wholesaler ? getWholesalerRetailerBalance(retailer.id, wholesaler.id) : 0;
  const percentUsed = (currentBalance / retailer.credit_limit) * 100;
  const isHighRisk = percentUsed > 80;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/retailers')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{retailer.shop_name}</h1>
          <p className="text-slate-500 text-sm">{retailer.name}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Current Balance</p>
              <h2 className={`text-3xl font-bold mt-2 ${isHighRisk ? 'text-rose-600' : 'text-slate-900'}`}>₹{currentBalance.toLocaleString()}</h2>
            </div>
            <div className={`p-3 rounded-xl ${isHighRisk ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              <IndianRupee size={24} />
            </div>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 relative z-10">
            <div 
              className={`h-2.5 rounded-full transition-all duration-1000 ${percentUsed > 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-medium text-slate-400 relative z-10">
             <span>Used: {percentUsed.toFixed(0)}%</span>
             <span>Limit: ₹{retailer.credit_limit.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <Phone size={16} />
                 </div>
                 <span className="text-slate-700 font-medium">{retailer.phone}</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <MapPin size={16} />
                 </div>
                 <span className="text-slate-700 font-medium text-sm truncate">{retailer.address || 'No address'}</span>
               </div>
            </div>
            <button className="mt-4 text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline w-fit">
              <Edit size={14} /> Edit Details
            </button>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg shadow-slate-900/10 flex flex-col justify-center items-center gap-4 text-white">
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <CreditCard size={18} /> Record Payment
          </button>
          <div className="text-xs text-slate-400 text-center">
            Last payment: {retailer.last_payment_date ? new Date(retailer.last_payment_date).toLocaleDateString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Transaction History Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 py-5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2
              ${activeTab === 'LEDGER' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <History size={18} /> Ledger History
          </button>
          <button 
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex-1 py-5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2
              ${activeTab === 'PAYMENTS' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <TrendingUp size={18} /> Payments
          </button>
        </div>

        <div className="flex-1">
          {activeTab === 'LEDGER' && (
             <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                 <tr>
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Description</th>
                   <th className="px-6 py-4 text-center">Type</th>
                   <th className="px-6 py-4 text-right">Amount</th>
                   <th className="px-6 py-4 text-right">Balance</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {retailerLedger.map((entry) => (
                   <tr key={entry.id} className="hover:bg-slate-50/50">
                     <td className="px-6 py-4 text-slate-500 font-medium">{new Date(entry.created_at).toLocaleDateString()}</td>
                     <td className="px-6 py-4 text-slate-700">{entry.description}</td>
                     <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${entry.type === 'DEBIT' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {entry.type}
                        </span>
                     </td>
                     <td className={`px-6 py-4 text-right font-bold ${entry.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {entry.type === 'DEBIT' ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-slate-900">
                        - 
                     </td>
                   </tr>
                 ))}
                 {retailerLedger.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-12 text-center text-slate-400">No ledger activity recorded yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Payment ID</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {retailerPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500 font-medium">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{payment.id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-600">
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs font-bold uppercase">{payment.status}</span>
                    </td>
                  </tr>
                ))}
                {retailerPayments.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-12 text-center text-slate-400">No payments recorded yet.</td>
                   </tr>
                 )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

       {/* Payment Modal */}
       {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handlePayment} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Amount</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-slate-900"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                <select 
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
