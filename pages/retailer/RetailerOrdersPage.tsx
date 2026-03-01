import React, { useEffect, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Clock, CheckCircle, Package, XCircle, Store, ChevronDown, ChevronUp, Loader2, Filter, Receipt, ShoppingBag, Truck, RefreshCw } from 'lucide-react';
import { Order, OrderStatus } from '../../types';

export const RetailerOrdersPage = () => {
   const { orders, fetchOrders, cancelOrder } = useDataStore();
   const { retailer } = useAuthStore();

   const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
   const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
   const [cancellingId, setCancellingId] = useState<string | null>(null);

   // Always refresh orders when visiting this page
   useEffect(() => { fetchOrders(); }, []);

   const myOrders = orders.filter(o => o.retailer_id === retailer?.id);
   const filteredOrders = filter === 'ALL' ? myOrders : myOrders.filter(o => o.status === filter);

   const toggleExpand = (id: string) => setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));

   const handleCancelOrder = async (orderId: string) => {
      if (!window.confirm('Are you sure you want to cancel this order?')) return;
      setCancellingId(orderId);
      try {
         await cancelOrder(orderId);
      } catch (err: any) {
         alert(err?.response?.data?.error || 'Failed to cancel order');
      } finally {
         setCancellingId(null);
      }
   };

   const getSupplierName = (order: any) =>
      order.wholesaler?.name || 'Supplier';

   const StatusBadge = ({ status }: { status: OrderStatus }) => {
      switch (status) {
         case 'PENDING': return <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-200/50 shadow-sm"><Clock size={14} strokeWidth={2.5} /><span className="text-[11px] font-black uppercase tracking-widest">Pending</span></div>;
         case 'ACCEPTED': return <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-200/50 shadow-sm"><CheckCircle size={14} strokeWidth={2.5} /><span className="text-[11px] font-black uppercase tracking-widest">Accepted</span></div>;
         case 'DISPATCHED': return <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-200/50 shadow-sm"><Truck size={14} strokeWidth={2.5} /><span className="text-[11px] font-black uppercase tracking-widest">Dispatched</span></div>;
         case 'DELIVERED': return <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-200/50 shadow-sm"><CheckCircle size={14} strokeWidth={2.5} /><span className="text-[11px] font-black uppercase tracking-widest">Delivered</span></div>;
         default: return <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl border border-rose-200/50 shadow-sm"><XCircle size={14} strokeWidth={2.5} /><span className="text-[11px] font-black uppercase tracking-widest">{status}</span></div>;
      }
   };

   return (
      <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-24">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100 shrink-0">
                  <Receipt size={24} strokeWidth={2} />
               </div>
               <div>
                  <h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">My Orders</h1>
                  <p className="text-slate-500 font-medium text-sm">Track and manage your recent purchases</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  onClick={() => fetchOrders()}
                  className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-[20px] border border-slate-200/60 shadow-sm shadow-slate-100 text-indigo-600 text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all"
               >
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">Refresh</span>
               </button>
               <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-[20px] border border-slate-200/60 shadow-sm shadow-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                     <Filter size={16} className="text-slate-400" />
                  </div>
                  <select
                     value={filter}
                     onChange={e => setFilter(e.target.value as OrderStatus | 'ALL')}
                     className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer pr-4 focus:ring-0 appearance-none"
                  >
                     <option value="ALL">All Orders ({myOrders.length})</option>
                     <option value="PENDING">Pending</option>
                     <option value="ACCEPTED">Accepted</option>
                     <option value="DISPATCHED">Dispatched</option>
                     <option value="DELIVERED">Delivered</option>
                     <option value="CANCELLED">Cancelled</option>
                     <option value="REJECTED">Rejected</option>
                  </select>
                  <ChevronDown size={14} className="text-slate-400 pointer-events-none -ml-2" />
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map(order => {
               const isExpanded = expandedOrders[order.id];
               const visibleItems = isExpanded ? order.items : order.items.slice(0, 2);

               return (
                  <div key={order.id} className="bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col group">
                     <div className="flex justify-between items-start mb-5">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-lg tracking-tight">#{order.invoice_no || order.id.slice(-6).toUpperCase()}</span>
                           </div>
                           <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           <div className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50/80 px-2 py-1 rounded border border-indigo-100 mt-1">
                              <Store size={12} /> {getSupplierName(order)}
                           </div>
                        </div>
                        <StatusBadge status={order.status} />
                     </div>

                     <div className="space-y-3 mb-5 border-t border-slate-100 pt-5 flex-1 p-1">
                        {visibleItems.map(item => (
                           <div key={item.id} className="flex items-start gap-4 text-sm group/item">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                 <Package size={14} className="text-slate-400 group-hover/item:text-emerald-500 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <span className="block text-slate-700 font-semibold truncate leading-tight group-hover/item:text-emerald-700 transition-colors">{item.medicine_name}</span>
                                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">Qty: {item.qty}</span>
                              </div>
                              <span className="font-black text-slate-800">₹{item.total_price.toFixed(2)}</span>
                           </div>
                        ))}
                        {order.items.length > 2 && (
                           <button
                              onClick={() => toggleExpand(order.id)}
                              className="w-full flex justify-center items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 mt-3 py-2.5 rounded-xl border border-emerald-100/50 transition-colors"
                           >
                              {isExpanded ? (
                                 <><ChevronUp size={14} /> Show Less</>
                              ) : (
                                 <><ChevronDown size={14} /> + {order.items.length - 2} more items</>
                              )}
                           </button>
                        )}
                     </div>

                     <div className="pt-5 border-t border-slate-100 flex justify-between items-center mt-auto">
                        <div className="flex-1">
                           {order.status === 'PENDING' ? (
                              <button
                                 onClick={() => handleCancelOrder(order.id)}
                                 disabled={cancellingId === order.id}
                                 className="text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50 border border-rose-100"
                              >
                                 {cancellingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} strokeWidth={2.5} />} Cancel
                              </button>
                           ) : (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-400" /> Order locked</span>
                           )}
                        </div>
                        <div className="text-right pl-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
                           <p className="text-2xl font-black text-slate-800 leading-none">₹{order.total_amount.toFixed(2)}</p>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         {filteredOrders.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-slate-200/60 border-dashed max-w-2xl mx-auto mt-10 shadow-sm">
               <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <ShoppingBag size={40} className="text-slate-300" />
               </div>
               <p className="text-2xl font-black text-slate-800 mb-2">No orders found</p>
               <p className="text-slate-500 font-medium max-w-sm mb-8">You haven't placed any orders that match the selected filter yet.</p>
               {filter !== 'ALL' && (
                  <button onClick={() => setFilter('ALL')} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors">
                     View All Orders
                  </button>
               )}
            </div>
         )}
      </div>
   );
};
