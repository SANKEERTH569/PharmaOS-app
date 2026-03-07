import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { DailyInvoiceModal } from '../components/DailyInvoiceModal';

export const DailyInvoicePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const retailerId = searchParams.get('retailerId') || '';
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const { orders, retailers } = useDataStore();
    const { wholesaler } = useAuthStore();

    const myOrders = useMemo(() => {
        if (!wholesaler) return [];
        return orders.filter(o => o.wholesaler_id === wholesaler.id);
    }, [orders, wholesaler]);

    const dailyOrders = useMemo(() => {
        if (!retailerId || !date) return [];
        return myOrders.filter(o => {
            if (o.retailer_id !== retailerId) return false;
            const orderDate = new Date(o.created_at).toISOString().slice(0, 10);
            return orderDate === date;
        });
    }, [myOrders, retailerId, date]);

    const retailer = useMemo(() => {
        return retailers.find(r => r.id === retailerId) ?? null;
    }, [retailers, retailerId]);

    if (!retailer || dailyOrders.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Daily Invoice Not Found</h2>
                    <p className="text-sm text-slate-400 font-medium">No orders found for this retailer on the selected date.</p>
                </div>
                <button
                    onClick={() => navigate('/orders')}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    <ArrowLeft size={16} /> Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-0 animate-slide-up">
            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/orders')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <ArrowLeft size={16} /> Back to Orders
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                            Daily Consolidated Invoice
                        </h1>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">
                            {retailer.shop_name || retailer.name} • {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {dailyOrders.length} order{dailyOrders.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const url = window.location.href;
                            if (navigator.share) {
                                navigator.share({ title: `Daily Invoice - ${retailer.name}`, url });
                            } else {
                                navigator.clipboard.writeText(url);
                            }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <Share2 size={14} /> Share
                    </button>
                </div>
            </div>

            {/* ── Invoice Content ── */}
            <div className="flex justify-center">
                <div className="w-full max-w-[900px]">
                    <DailyInvoiceModal
                        orders={dailyOrders}
                        retailer={retailer}
                        date={date}
                        onClose={() => navigate('/orders')}
                        variant="inline"
                    />
                </div>
            </div>
        </div>
    );
};
