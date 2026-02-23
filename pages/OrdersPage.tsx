
import React, { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, CheckCircle, XCircle, Truck, Package, Eye, ArrowRight, Download, FileText, Printer, ClipboardList, IndianRupee } from 'lucide-react';
import { OrderStatus, Order, PaymentMethod } from '../types';
import { InvoiceModal } from '../components/InvoiceModal';
import { DeliveryReceiptModal } from '../components/DeliveryReceiptModal';

export const OrdersPage = () => {
  const { orders, updateOrderStatus, retailers, fetchOrders } = useDataStore();
  const { wholesaler } = useAuthStore();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToInvoice, setOrderToInvoice] = useState<Order | null>(null);
  const [orderToDelivery, setOrderToDelivery] = useState<Order | null>(null);

  // Always refresh orders when visiting this page
  useEffect(() => { fetchOrders(); }, []);

  // Delivery Payment Modal State
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'PAID'>('CREDIT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Filter orders for current wholesaler
  const myOrders = orders.filter(o => o.wholesaler_id === wholesaler?.id);

  const filteredOrders = myOrders.filter(order => {
    const matchesFilter = filter === 'ALL' || order.status === filter;
    const matchesSearch = order.retailer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-200',
      DISPATCHED: 'bg-purple-100 text-purple-700 border-purple-200',
      DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
      CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const handleAction = (id: string, action: OrderStatus) => {
    if (!wholesaler) return;

    if (action === 'DELIVERED') {
      const order = orders.find(o => o.id === id);
      if (order) {
        setDeliveryOrder(order);
        setPaymentAmount(order.total_amount.toString());
        setShowDeliveryConfirm(true);
        // Close detail modal if open
        setSelectedOrder(null);
      }
    } else {
      updateOrderStatus(id, action, wholesaler.id);
      setSelectedOrder(null);
    }
  };

  const confirmDelivery = () => {
    if (!deliveryOrder || !wholesaler) return;

    if (paymentMode === 'PAID') {
      updateOrderStatus(deliveryOrder.id, 'DELIVERED', wholesaler.id, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod
      });
    } else {
      updateOrderStatus(deliveryOrder.id, 'DELIVERED', wholesaler.id);
    }

    setShowDeliveryConfirm(false);
    setDeliveryOrder(null);
    setPaymentMode('CREDIT');
  };

  const openInvoice = (order: Order) => {
    setOrderToInvoice(order);
  };

  const openDeliveryReceipt = (order: Order) => {
    setOrderToDelivery(order);
  };

  const OrderDetailModal = ({ order, onClose }: { order: Order, onClose: () => void }) => {
    const retailer = retailers.find(r => r.id === order.retailer_id);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order #{order.id}</h2>
              <p className="text-slate-500 text-sm mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
              <span className="text-2xl leading-none">&times;</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Status & Retailer */}
            <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Retailer</p>
                <p className="font-bold text-slate-900">{order.retailer_name}</p>
                <p className="text-sm text-slate-500">{retailer?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                <StatusBadge status={order.status} />
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 text-sm">Order Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.medicine_name}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{item.unit_price}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">₹{item.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700">Total Amount</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-base">₹{order.total_amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all text-sm">
              Close
            </button>

            {order.status === 'PENDING' && (
              <>
                <button
                  onClick={() => handleAction(order.id, 'REJECTED')}
                  className="px-5 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all text-sm border border-rose-100"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction(order.id, 'ACCEPTED')}
                  className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold hover:shadow-lg shadow-slate-900/20 rounded-xl transition-all text-sm flex items-center"
                >
                  <CheckCircle size={16} className="mr-2" /> Accept Order
                </button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <button
                onClick={() => handleAction(order.id, 'DISPATCHED')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg shadow-blue-500/20 rounded-xl transition-all text-sm flex items-center"
              >
                <Truck size={16} className="mr-2" /> Dispatch Package
              </button>
            )}

            {order.status === 'DISPATCHED' && (
              <button
                onClick={() => handleAction(order.id, 'DELIVERED')}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-lg shadow-emerald-500/20 rounded-xl transition-all text-sm flex items-center"
              >
                <Package size={16} className="mr-2" /> Mark Delivered
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-slate-400 font-medium mt-1 text-sm">Track and manage all orders.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {['ALL', 'PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap ${filter === tab
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search order ID or retailer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 outline-none transition-all placeholder-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Order Details</th>
                <th className="px-6 py-4 font-bold tracking-wider">Retailer</th>
                <th className="px-6 py-4 font-bold tracking-wider">Amount</th>
                <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                <th className="px-6 py-4 text-right font-bold tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">#{order.id}</div>
                    <div className="text-slate-400 text-xs mt-0.5 font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{order.retailer_name}</div>
                    {order.invoice_no && <div className="text-blue-600 text-xs mt-0.5 font-mono bg-blue-50 w-fit px-1 rounded">{order.invoice_no}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">₹{order.total_amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDeliveryReceipt(order)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Delivery Challan"
                      >
                        <Truck size={18} />
                      </button>
                      {order.invoice_no && (
                        <button
                          onClick={() => openInvoice(order)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Invoice"
                        >
                          <Printer size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No orders found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {orderToInvoice && (
        <InvoiceModal
          order={orderToInvoice}
          retailer={
            retailers.find(r => r.id === orderToInvoice.retailer_id) ?? {
              id: orderToInvoice.retailer_id,
              name: orderToInvoice.retailer?.name ?? orderToInvoice.retailer_name,
              shop_name: orderToInvoice.retailer?.shop_name ?? orderToInvoice.retailer_name,
              phone: '',
              address: '',
              gstin: '',
              credit_limit: 0,
              current_balance: 0,
              is_active: true,
            }
          }
          onClose={() => setOrderToInvoice(null)}
        />
      )}

      {orderToDelivery && (
        <DeliveryReceiptModal
          order={orderToDelivery}
          retailer={
            retailers.find(r => r.id === orderToDelivery.retailer_id) ?? {
              id: orderToDelivery.retailer_id,
              name: orderToDelivery.retailer?.name ?? orderToDelivery.retailer_name,
              shop_name: orderToDelivery.retailer?.shop_name ?? orderToDelivery.retailer_name,
              phone: '',
              address: '',
              gstin: '',
              credit_limit: 0,
              current_balance: 0,
              is_active: true,
            }
          }
          onClose={() => setOrderToDelivery(null)}
        />
      )}

      {/* Delivery Confirmation Modal */}
      {showDeliveryConfirm && deliveryOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Confirm Delivery</h3>
                <p className="text-xs text-slate-500 mt-1">Order #{deliveryOrder.id} • {deliveryOrder.retailer_name}</p>
              </div>
              <button onClick={() => setShowDeliveryConfirm(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6">
              <div className="flex bg-slate-50 p-1.5 rounded-xl mb-6">
                <button
                  onClick={() => setPaymentMode('CREDIT')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${paymentMode === 'CREDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Add to Credit
                </button>
                <button
                  onClick={() => setPaymentMode('PAID')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${paymentMode === 'PAID' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Payment Received
                </button>
              </div>

              <div className="text-center mb-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Invoice Amount</p>
                <p className="text-3xl font-black text-slate-900">₹{deliveryOrder.total_amount.toLocaleString()}</p>
              </div>

              {paymentMode === 'PAID' && (
                <div className="space-y-4 mb-6 animate-in slide-in-from-top-2 fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Received Amount</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment Mode</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeliveryConfirm(false)}
                  className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelivery}
                  className={`flex-1 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${paymentMode === 'PAID' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
                >
                  <CheckCircle size={18} /> Confirm {paymentMode === 'PAID' ? '& Pay' : 'Delivery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
