import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, FileText } from 'lucide-react';
import { CombinedPrintModal } from '../components/CombinedPrintModal';

export const CombinedPrintPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { orders, retailers } = useDataStore();
    const { wholesaler } = useAuthStore();

    const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);

    const retailer = useMemo(() => {
        if (!order) return null;
        return retailers.find(r => r.id === order.retailer_id) ?? {
            id: order.retailer_id,
            name: order.retailer?.name ?? order.retailer_name,
            shop_name: order.retailer?.shop_name ?? order.retailer_name,
            phone: '',
            address: '',
            gstin: '',
            credit_limit: 0,
            current_balance: 0,
            is_active: true,
        };
    }, [order, retailers]);

    if (!order || !retailer) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Document Not Found</h2>
                    <p className="text-sm text-slate-400 font-medium">The order you're looking for doesn't exist or has been removed.</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-0 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-[900px]">
                    <CombinedPrintModal
                        order={order}
                        retailer={retailer}
                        onClose={() => navigate(-1)}
                        variant="inline"
                    />
                </div>
            </div>
        </div>
    );
};
