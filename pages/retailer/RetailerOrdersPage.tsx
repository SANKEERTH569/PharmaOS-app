
import React, { useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Clock, CheckCircle, Package, XCircle, Store } from 'lucide-react';
import { Order, OrderStatus } from '../../types';

export const RetailerOrdersPage = () => {
  const { orders, fetchOrders } = useDataStore();
  const { retailer } = useAuthStore();

  // Always refresh orders when visiting this page
  useEffect(() => { fetchOrders(); }, []);

  const myOrders = orders.filter(o => o.retailer_id === retailer?.id);

  const getSupplierName = (order: Order) =>
    order.wholesaler?.name || 'Supplier';

  const StatusIcon = ({ status }: { status: OrderStatus }) => {
      switch (status) {
          case 'PENDING': return <Clock size={16} className="text-amber-500" />;
          case 'ACCEPTED': return <CheckCircle size={16} className="text-blue-500" />;
          case 'DISPATCHED': return <Package size={16} className="text-purple-500" />;
          case 'DELIVERED': return <CheckCircle size={16} className="text-emerald-500" />;
          default: return <XCircle size={16} className="text-rose-500" />;
      }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-20">
       <h1 className="text-2xl font-black text-slate-900">My Orders</h1>

       <div className="space-y-4">
          {myOrders.map(order => (
             <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="font-bold text-slate-900 text-lg">Order #{order.id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 w-fit px-2 py-1 rounded-md">
                         <Store size={12} /> {getSupplierName(order)}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                   </div>
                   <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <StatusIcon status={order.status} />
                      <span className="text-xs font-bold uppercase text-slate-700">{order.status}</span>
                   </div>
                </div>
                
                <div className="space-y-2 mb-4 border-t border-slate-50 pt-4">
                   {order.items.slice(0, 2).map(item => (
                       <div key={item.id} className="flex justify-between text-sm">
                           <span className="text-slate-600 font-medium">{item.qty} x {item.medicine_name}</span>
                           <span className="font-bold text-slate-800">₹{item.total_price.toFixed(2)}</span>
                       </div>
                   ))}
                   {order.items.length > 2 && (
                       <p className="text-xs text-slate-400 italic font-medium">+ {order.items.length - 2} more items</p>
                   )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</p>
                    <p className="text-xl font-black text-slate-900">₹{order.total_amount.toFixed(2)}</p>
                </div>
             </div>
          ))}

          {myOrders.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                  <p>You haven't placed any orders yet.</p>
              </div>
          )}
       </div>
    </div>
  );
};
