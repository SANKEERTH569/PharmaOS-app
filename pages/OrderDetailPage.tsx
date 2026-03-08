import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { OrderStatus, PaymentMethod } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Truck, Package, Printer, ClipboardList, Loader2, AlertCircle, IndianRupee } from 'lucide-react';
import { CombinedPrintModal } from '../components/CombinedPrintModal';

export const OrderDetailPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { orders, retailers, updateOrderStatus, removeOrderItem, fetchOrders } = useDataStore();
    const { wholesaler } = useAuthStore();

    const [order, setOrder] = useState(orders.find(o => o.id === orderId));
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Delivery State (similar to modal)
    const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'PAID'>('CREDIT');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    // Delivery State (similar to modal)

    // Removing items
    const [removingItemId, setRemovingItemId] = useState<string | null>(null);

    // Keep local state in sync with store (e.g. if updated via websocket)
    useEffect(() => {
        const foundOrder = orders.find(o => o.id === orderId);
        if (foundOrder) {
            setOrder(foundOrder);
        } else if (!order) {
            // Order not found in current state, attempt to refresh
            fetchOrders();
        }
    }, [orders, orderId, fetchOrders]);

    // Clear success/error messages automatically
    useEffect(() => {
        if (actionError || successMsg) {
            const t = setTimeout(() => { setActionError(null); setSuccessMsg(null); }, 5000);
            return () => clearTimeout(t);
        }
    }, [actionError, successMsg]);

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium">Loading order details...</p>
            </div>
        );
    }

    const retailer = retailers.find(r => r.id === order.retailer_id);

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
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const handleAction = async (action: OrderStatus) => {
        if (!wholesaler || actionLoading) return;
        setActionError(null);

        if (action === 'DELIVERED') {
            setPaymentAmount(order.total_amount.toString());
            setShowDeliveryConfirm(true);
            return;
        }

        setActionLoading(true);
        try {
            await updateOrderStatus(order.id, action, wholesaler.id);
            setSuccessMsg(`Order ${action === 'ACCEPTED' ? 'accepted' : action === 'REJECTED' ? 'rejected' : action === 'DISPATCHED' ? 'dispatched' : action.toLowerCase()} successfully!`);
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Failed to update order. Please try again.';
            setActionError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDelivery = async () => {
        if (!wholesaler || actionLoading) return;
        setActionError(null);
        setActionLoading(true);

        try {
            if (paymentMode === 'PAID') {
                await updateOrderStatus(order.id, 'DELIVERED', wholesaler.id, {
                    amount: parseFloat(paymentAmount),
                    method: paymentMethod
                });
            } else {
                await updateOrderStatus(order.id, 'DELIVERED', wholesaler.id);
            }
            setShowDeliveryConfirm(false);
            setPaymentMode('CREDIT');
            setSuccessMsg('Order delivered successfully!');
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Failed to confirm delivery. Please try again.';
            setActionError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to remove this item from the order?')) return;
        setRemovingItemId(itemId);
        setActionError(null);
        try {
            await removeOrderItem(order.id, itemId);
            setSuccessMsg('Item removed successfully');

            const updatedOrder = useDataStore.getState().orders.find(o => o.id === order.id);
            if (updatedOrder?.status === 'CANCELLED') {
                navigate('/orders');
            }
        } catch (err: any) {
            setActionError(err.response?.data?.error || err.message || 'Failed to remove item');
        } finally {
            setRemovingItemId(null);
        }
    };

    return (
        <div className="animate-slide-up relative flex flex-col min-h-full">
            <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col pb-8">
                {/* Header (Scrolls with page) */}
                <div className="p-6 md:p-8 shrink-0 relative bg-white rounded-3xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                    Order #{order.invoice_no || order.id.slice(-8).toUpperCase()}
                                </h1>
                                <StatusBadge status={order.status} />
                            </div>
                            <p className="text-slate-500 font-medium">Placed on {new Date(order.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6 lg:space-y-8 flex-1">
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Retailer Details</p>
                                <p className="text-lg font-bold text-slate-900">{order.retailer_name}</p>
                                <p className="text-slate-500 text-sm mt-0.5">{retailer?.phone || 'No phone available'}</p>
                            </div>
                        </div>

                        {order.invoice_no && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <Printer className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="w-full">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Documents</p>
                                    <p className="text-lg font-bold text-slate-900 mb-2">Invoice: {order.invoice_no}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => navigate(`/orders/${order.id}/invoice`)}
                                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-transparent rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Printer size={14} /> View Invoice
                                        </button>
                                        <button
                                            onClick={() => navigate(`/orders/${order.id}/combined-print`)}
                                            className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-transparent rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <ClipboardList size={14} /> Print All
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Order Items ({order.items.length})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Medicine</th>
                                        <th className="px-6 py-4 text-right">MRP</th>
                                        <th className="px-6 py-4 text-right">Rate</th>
                                        <th className="px-6 py-4 text-right">Qty</th>
                                        <th className="px-6 py-4 text-right">GST</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        {(order.status === 'PENDING' || order.status === 'ACCEPTED') && order.items.length > 0 && (
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {order.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{item.medicine_name}</div>
                                                {item.hsn_code && <div className="text-[10px] text-slate-400 font-mono mt-0.5">HSN: {item.hsn_code}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-medium">₹{(item.mrp ?? 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-slate-700 font-medium">₹{item.unit_price.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900">{item.qty}</td>
                                            <td className="px-6 py-4 text-right text-indigo-600 text-xs font-bold">{item.gst_rate}%</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900">₹{(item.total_price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            {(order.status === 'PENDING' || order.status === 'ACCEPTED') && (
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        disabled={removingItemId === item.id}
                                                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-full transition-colors focus:outline-none disabled:opacity-50"
                                                        title="Remove item"
                                                    >
                                                        {removingItemId === item.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Actions Area */}
            <div className="sticky bottom-0 lg:bottom-4 z-40 mt-auto w-full max-w-5xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden">
                    {actionError && (
                        <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm font-medium">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{actionError}</span>
                        </div>
                    )}

                    <div className="p-4 md:px-6 md:py-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6">
                        {/* Totals */}
                        <div className="flex bg-slate-50 p-4 rounded-2xl border border-slate-200/60 overflow-x-auto scrollbar-hide w-full xl:w-auto items-center gap-8">
                            <div className="shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subtotal (Taxable)</p>
                                <p className="text-xl font-bold text-slate-700">₹{order.sub_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 shrink-0"></div>
                            <div className="shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tax (GST)</p>
                                <p className="text-xl font-bold text-blue-600">₹{order.tax_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 shrink-0"></div>
                            <div className="shrink-0">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Amount Pay</p>
                                <p className="text-3xl font-black text-emerald-600 leading-none">₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                            {order.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => handleAction('REJECTED')}
                                        disabled={actionLoading}
                                        className="px-6 py-3.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all text-sm border border-rose-100 disabled:opacity-50 min-w[120px] flex justify-center items-center"
                                    >
                                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Reject Order'}
                                    </button>
                                    <button
                                        onClick={() => handleAction('ACCEPTED')}
                                        disabled={actionLoading}
                                        className="px-8 py-3.5 bg-slate-900 text-white font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                                        Accept Order
                                    </button>
                                </>
                            )}

                            {order.status === 'ACCEPTED' && (
                                <button
                                    onClick={() => handleAction('DISPATCHED')}
                                    disabled={actionLoading}
                                    className="px-8 py-3.5 bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Truck size={16} className="mr-2" />}
                                    Dispatch Package
                                </button>
                            )}

                            {order.status === 'DISPATCHED' && (
                                <button
                                    onClick={() => handleAction('DELIVERED')}
                                    disabled={actionLoading}
                                    className="px-8 py-3.5 bg-emerald-600 text-white font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Package size={16} className="mr-2" />}
                                    Mark Delivered
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Confirmation Modal */}
            {showDeliveryConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Confirm Delivery</h3>
                                <p className="text-xs text-slate-500 mt-1">Order #{order.id} • {order.retailer_name}</p>
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
                                <p className="text-3xl font-black text-slate-900">₹{order.total_amount.toLocaleString()}</p>
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
