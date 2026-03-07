
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, CheckCircle, XCircle, Truck, Package, Eye, ArrowRight, Download, FileText, Printer, ClipboardList, IndianRupee, Calendar, ChevronDown, RefreshCw, Loader2, AlertCircle, CheckCheck } from 'lucide-react';
import { OrderStatus, Order, PaymentMethod } from '../types';
import { DeliveryReceiptModal } from '../components/DeliveryReceiptModal';
import { CombinedPrintModal } from '../components/CombinedPrintModal';

export const OrdersPage = () => {
  const { orders, updateOrderStatus, retailers, fetchOrders } = useDataStore();
  const { wholesaler } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelivery, setOrderToDelivery] = useState<Order | null>(null);
  const [orderToCombinedPrint, setOrderToCombinedPrint] = useState<Order | null>(null);

  // Daily Invoice state
  const [showDailyPicker, setShowDailyPicker] = useState(false);
  const [dailyRetailerId, setDailyRetailerId] = useState<string>('');
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showDailyInvoice, setShowDailyInvoice] = useState(false);
  const dailyPickerRef = useRef<HTMLDivElement>(null);

  // Always refresh orders when visiting this page
  useEffect(() => { fetchOrders(); }, []);

  // Delivery Payment Modal State
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'PAID'>('CREDIT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Action feedback state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-dismiss messages
  useEffect(() => {
    if (actionError || successMsg) {
      const t = setTimeout(() => { setActionError(null); setSuccessMsg(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionError, successMsg]);

  // Filter orders for current wholesaler
  const myOrders = orders.filter(o => o.wholesaler_id === wholesaler?.id);

  const filteredOrders = myOrders.filter(order => {
    const matchesFilter = filter === 'ALL' || order.status === filter;
    const matchesSearch = order.retailer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Unique retailers who have orders (for daily invoice picker)
  const retailersWithOrders = useMemo(() => {
    const seen = new Set<string>();
    return myOrders.reduce((acc, o) => {
      if (!seen.has(o.retailer_id)) {
        seen.add(o.retailer_id);
        const r = retailers.find(r => r.id === o.retailer_id);
        if (r) acc.push(r);
      }
      return acc;
    }, [] as typeof retailers);
  }, [myOrders, retailers]);

  // Daily invoice orders
  const dailyInvoiceOrders = useMemo(() => {
    if (!dailyRetailerId || !dailyDate) return [];
    return myOrders.filter(o => {
      if (o.retailer_id !== dailyRetailerId) return false;
      const orderDate = new Date(o.created_at).toISOString().slice(0, 10);
      return orderDate === dailyDate;
    });
  }, [myOrders, dailyRetailerId, dailyDate]);

  const dailyInvoiceRetailer = useMemo(() => {
    return retailers.find(r => r.id === dailyRetailerId);
  }, [retailers, dailyRetailerId]);

  const handleGenerateDailyInvoice = () => {
    if (dailyInvoiceOrders.length > 0 && dailyInvoiceRetailer) {
      navigate(`/orders/daily-invoice?retailerId=${dailyRetailerId}&date=${dailyDate}`);
    }
  };

  // Close daily picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dailyPickerRef.current && !dailyPickerRef.current.contains(e.target as Node)) {
        setShowDailyPicker(false);
      }
    };
    if (showDailyPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDailyPicker]);

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

  const handleAction = async (id: string, action: OrderStatus) => {
    if (!wholesaler || actionLoading) return;
    setActionError(null);

    if (action === 'DELIVERED') {
      const order = orders.find(o => o.id === id);
      if (order) {
        setDeliveryOrder(order);
        setPaymentAmount(order.total_amount.toString());
        setShowDeliveryConfirm(true);
        setSelectedOrder(null);
      }
      return;
    }

    setActionLoading(true);
    try {
      await updateOrderStatus(id, action, wholesaler.id);
      setSelectedOrder(null);
      setSuccessMsg(`Order ${action === 'ACCEPTED' ? 'accepted' : action === 'REJECTED' ? 'rejected' : action === 'DISPATCHED' ? 'dispatched' : action.toLowerCase()} successfully!`);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to update order. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelivery = async () => {
    if (!deliveryOrder || !wholesaler || actionLoading) return;
    setActionError(null);
    setActionLoading(true);

    try {
      if (paymentMode === 'PAID') {
        await updateOrderStatus(deliveryOrder.id, 'DELIVERED', wholesaler.id, {
          amount: parseFloat(paymentAmount),
          method: paymentMethod
        });
      } else {
        await updateOrderStatus(deliveryOrder.id, 'DELIVERED', wholesaler.id);
      }
      setShowDeliveryConfirm(false);
      setDeliveryOrder(null);
      setPaymentMode('CREDIT');
      setSuccessMsg('Order delivered successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to confirm delivery. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const openInvoice = (order: Order) => {
    navigate(`/orders/${order.id}/invoice`);
  };

  const openDeliveryReceipt = (order: Order) => {
    setOrderToDelivery(order);
  };

  const openCombinedPrint = (order: Order) => {
    setOrderToCombinedPrint(order);
  };

  const OrderDetailModal = ({ order, onClose }: { order: Order, onClose: () => void }) => {
    const retailer = retailers.find(r => r.id === order.retailer_id);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order #{order.invoice_no || order.id.slice(-8).toUpperCase()}</h2>
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
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-3">Medicine</th>
                      <th className="px-3 py-3 text-right">MRP</th>
                      <th className="px-3 py-3 text-right">Rate</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">GST</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{item.medicine_name}</div>
                          {item.hsn_code && <div className="text-[10px] text-slate-400 font-mono">HSN: {item.hsn_code}</div>}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-500 text-xs">₹{(item.mrp ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">₹{item.unit_price.toFixed(2)}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">{item.qty}</td>
                        <td className="px-3 py-3 text-right text-blue-600 text-xs font-bold">{item.gst_rate}%</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">₹{(item.total_price ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 text-xs">
                    <tr className="border-t border-slate-200">
                      <td colSpan={5} className="px-3 py-2 text-right text-slate-500 font-medium">Subtotal (Taxable)</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">₹{order.sub_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right text-slate-500 font-medium">Tax (GST)</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600">₹{order.tax_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-t-2 border-slate-300">
                      <td colSpan={5} className="px-3 py-3 text-right font-black text-slate-900">Total Amount</td>
                      <td className="px-3 py-3 text-right font-black text-slate-900 text-base">₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Invoice & Print Actions */}
            {order.invoice_no && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-blue-800">Invoice: {order.invoice_no}</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { onClose(); openInvoice(order); }} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
                    <Printer size={12} className="inline mr-1" />View Invoice
                  </button>
                  <button onClick={() => { onClose(); openCombinedPrint(order); }} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
                    <ClipboardList size={12} className="inline mr-1" />Print All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
            {actionError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium animate-in slide-in-from-top-1">
                <AlertCircle size={16} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all text-sm">
                Close
              </button>

              {order.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleAction(order.id, 'REJECTED')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all text-sm border border-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleAction(order.id, 'ACCEPTED')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold hover:shadow-lg shadow-slate-900/20 rounded-xl transition-all text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                    Accept Order
                  </button>
                </>
              )}

              {order.status === 'ACCEPTED' && (
                <button
                  onClick={() => handleAction(order.id, 'DISPATCHED')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg shadow-blue-500/20 rounded-xl transition-all text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Truck size={16} className="mr-2" />}
                  Dispatch Package
                </button>
              )}

              {order.status === 'DISPATCHED' && (
                <button
                  onClick={() => handleAction(order.id, 'DELIVERED')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-lg shadow-emerald-500/20 rounded-xl transition-all text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Package size={16} className="mr-2" />}
                  Mark Delivered
                </button>
              )}
            </div>
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
        <div className="flex items-center gap-3">
          {/* Daily Invoice Button */}
          <div className="relative" ref={dailyPickerRef}>
            <button
              onClick={() => setShowDailyPicker(!showDailyPicker)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg shadow-amber-500/20 transition-all"
            >
              <Calendar size={16} /> Daily Invoice <ChevronDown size={14} className={`transition-transform ${showDailyPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Daily Invoice Picker Popover */}
            {showDailyPicker && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Generate Daily Invoice</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Retailer</label>
                    <select
                      value={dailyRetailerId}
                      onChange={e => setDailyRetailerId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 outline-none bg-slate-50"
                    >
                      <option value="">Select a retailer...</option>
                      {retailersWithOrders.map(r => (
                        <option key={r.id} value={r.id}>{r.shop_name || r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={e => setDailyDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 outline-none bg-slate-50"
                    />
                  </div>

                  {dailyRetailerId && dailyDate && (
                    <div className={`p-2 rounded-lg text-xs font-bold ${dailyInvoiceOrders.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                      {dailyInvoiceOrders.length > 0
                        ? `✓ ${dailyInvoiceOrders.length} order${dailyInvoiceOrders.length !== 1 ? 's' : ''} found — ₹${dailyInvoiceOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()} total`
                        : '✗ No orders found for this retailer on this date'
                      }
                    </div>
                  )}

                  <button
                    onClick={handleGenerateDailyInvoice}
                    disabled={dailyInvoiceOrders.length === 0 || !dailyInvoiceRetailer}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FileText size={16} /> Generate Invoice
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 bg-white border border-slate-200/80 text-blue-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Toast notifications */}
      {(actionError || successMsg) && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-200 ${actionError
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
          {actionError ? <AlertCircle size={16} className="shrink-0" /> : <CheckCheck size={16} className="shrink-0" />}
          <span className="flex-1">{actionError || successMsg}</span>
          <button
            onClick={() => { setActionError(null); setSuccessMsg(null); }}
            className="text-current opacity-60 hover:opacity-100 ml-2"
          >
            &times;
          </button>
        </div>
      )}

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
                    <div className="font-bold text-slate-900 font-mono text-xs">#{order.invoice_no || order.id.slice(-8).toUpperCase()}</div>
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
                    <div className="flex justify-end items-center gap-1.5">
                      {/* Quick status actions */}
                      {order.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(order.id, 'ACCEPTED')}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Accept Order"
                          >
                            <CheckCircle size={13} className="inline mr-0.5 -mt-0.5" />Accept
                          </button>
                          <button
                            onClick={() => handleAction(order.id, 'REJECTED')}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject Order"
                          >
                            <XCircle size={13} className="inline mr-0.5 -mt-0.5" />Reject
                          </button>
                        </>
                      )}
                      {order.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleAction(order.id, 'DISPATCHED')}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Dispatch"
                        >
                          <Truck size={13} className="inline mr-0.5 -mt-0.5" />Dispatch
                        </button>
                      )}
                      {order.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleAction(order.id, 'DELIVERED')}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Mark Delivered"
                        >
                          <Package size={13} className="inline mr-0.5 -mt-0.5" />Deliver
                        </button>
                      )}

                      {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'DISPATCHED') && (
                        <div className="w-px h-5 bg-slate-200 mx-0.5" />
                      )}

                      {/* Document actions */}
                      {order.invoice_no && (
                        <>
                          <button
                            onClick={() => openInvoice(order)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Invoice"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => openCombinedPrint(order)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print Both (Invoice + Challan)"
                          >
                            <ClipboardList size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openDeliveryReceipt(order)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Delivery Challan"
                      >
                        <Truck size={16} />
                      </button>
                      <button
                        onClick={() => { setActionError(null); setSelectedOrder(order); }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
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

      {orderToCombinedPrint && (
        <CombinedPrintModal
          order={orderToCombinedPrint}
          retailer={
            retailers.find(r => r.id === orderToCombinedPrint.retailer_id) ?? {
              id: orderToCombinedPrint.retailer_id,
              name: orderToCombinedPrint.retailer?.name ?? orderToCombinedPrint.retailer_name,
              shop_name: orderToCombinedPrint.retailer?.shop_name ?? orderToCombinedPrint.retailer_name,
              phone: '',
              address: '',
              gstin: '',
              credit_limit: 0,
              current_balance: 0,
              is_active: true,
            }
          }
          onClose={() => setOrderToCombinedPrint(null)}
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

              {actionError && (
                <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium animate-in slide-in-from-top-1">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={() => { setShowDeliveryConfirm(false); setActionError(null); }}
                  className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelivery}
                  disabled={actionLoading}
                  className={`flex-1 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${paymentMode === 'PAID' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {actionLoading ? 'Processing...' : `Confirm ${paymentMode === 'PAID' ? '& Pay' : 'Delivery'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
