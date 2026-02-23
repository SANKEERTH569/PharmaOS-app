
import React from 'react';
import { Order, Retailer } from '../types';
import { Printer, X, Truck, Package, MapPin, User, Hash } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface DeliveryReceiptModalProps {
  order: Order;
  retailer: Retailer;
  onClose: () => void;
}

export const DeliveryReceiptModal: React.FC<DeliveryReceiptModalProps> = ({ order, retailer, onClose }) => {
  const { wholesaler } = useAuthStore();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:rounded-none print:h-auto print:absolute print:inset-0 print:z-[70]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls - Fixed Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Truck className="text-white w-5 h-5" />
             </div>
             <span className="font-bold text-emerald-900">Delivery Challan Viewer</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
            >
              <Printer size={16} /> Print Challan
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Body - Scrollable */}
        <div className="p-10 overflow-y-auto bg-white rounded-b-2xl print:p-0 print:overflow-visible">
          <div className="border-4 border-emerald-100 p-8 print:border-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-emerald-500">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <Package size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-emerald-900 uppercase tracking-tight italic">{wholesaler?.name}</h1>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivery Challan / Proof of Delivery</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-black uppercase">Consignment No</p>
                  <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">DC-{order.id.split('-').pop()}</p>
               </div>
            </div>

            {/* Shipping Info */}
            <div className="grid grid-cols-2 gap-8 mb-10">
               <div className="space-y-4">
                  <div className="flex items-start gap-3">
                     <div className="mt-1 p-1 bg-slate-100 rounded-md text-slate-400">
                        <MapPin size={16} />
                     </div>
                     <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Ship To</p>
                        <p className="text-sm font-black text-slate-900 uppercase">{retailer?.shop_name || retailer?.name || '—'}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{retailer?.address || 'Address Not Provided'}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="mt-1 p-1 bg-slate-100 rounded-md text-slate-400">
                        <User size={16} />
                     </div>
                     <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Contact Person</p>
                        <p className="text-sm font-black text-slate-900">{retailer?.name || '—'}</p>
                        <p className="text-xs text-slate-500">{retailer?.phone || '—'}</p>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Dispatch Date:</span>
                        <span className="text-xs font-black text-slate-900">{new Date().toLocaleDateString()}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Ref Order:</span>
                        <span className="text-xs font-black text-slate-900">#{order.id}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Total Items:</span>
                        <span className="text-xs font-black text-slate-900">{order.items.length} Units</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Package Contents */}
            <div className="mb-10">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <Hash size={12} /> Consignment Contents Checklist
               </h3>
               <table className="w-full text-xs border-collapse">
                  <thead>
                     <tr className="bg-emerald-900 text-white">
                        <th className="p-3 text-left w-10">#</th>
                        <th className="p-3 text-left uppercase tracking-wider">Medicine Name & Salt</th>
                        <th className="p-3 text-center uppercase tracking-wider w-24">Qty (Units)</th>
                        <th className="p-3 text-center uppercase tracking-wider w-32">Box Verification</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 border border-slate-100">
                     {order.items.map((item, idx) => (
                        <tr key={item.id}>
                           <td className="p-4 text-slate-400 font-bold border-r border-slate-50">{idx + 1}</td>
                           <td className="p-4 border-r border-slate-50">
                              <p className="font-black text-slate-900 uppercase">{item.medicine_name}</p>
                              <p className="text-[9px] text-slate-400 font-medium italic">Pack: Strip/Bottle</p>
                           </td>
                           <td className="p-4 text-center font-black text-emerald-700 text-lg border-r border-slate-50">
                              {item.qty}
                           </td>
                           <td className="p-4 text-center">
                              <div className="w-6 h-6 border-2 border-slate-200 rounded mx-auto"></div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Confirmation Area */}
            <div className="grid grid-cols-2 gap-10 mt-16 pt-10 border-t-2 border-emerald-500">
               <div>
                  <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 h-32 flex flex-col justify-end">
                     <p className="text-[9px] text-slate-400 font-black uppercase text-center border-t border-slate-200 pt-2">Logistics Executive Signature</p>
                  </div>
               </div>
               <div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-200 h-32 flex flex-col justify-end">
                     <p className="text-[9px] text-emerald-600 font-black uppercase text-center border-t border-emerald-200 pt-2">Retailer Receiver Signature & Stamp</p>
                  </div>
                  <p className="mt-2 text-[8px] text-slate-400 italic text-center">Confirming receipt of goods in sound condition</p>
               </div>
            </div>

            <div className="mt-10 text-center">
               <p className="text-[9px] text-slate-400 font-medium italic">This is a system generated delivery document. No signature is required for dispatch verification.</p>
               <p className="text-[10px] font-black text-emerald-800 mt-2 uppercase tracking-widest">Efficient Pharma Supply Chain Solutions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
