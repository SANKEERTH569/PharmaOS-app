import React, { useEffect, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Store, ChevronDown, ChevronUp, Loader2, ArrowDownLeft, ArrowUpRight, CreditCard, Activity, Building2 } from 'lucide-react';

export const RetailerLedgerPage = () => {
    const { retailerLedgerSummary, fetchRetailerLedgerSummary, retailerLedgerHistory, fetchRetailerLedgerHistory } = useDataStore();
    const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchRetailerLedgerSummary();
    }, []);

    const toggleExpand = async (wholesalerId: string) => {
        if (expandedAgency === wholesalerId) {
            setExpandedAgency(null);
            return;
        }

        setExpandedAgency(wholesalerId);

        // Fetch history if not already loaded
        if (!retailerLedgerHistory[wholesalerId]) {
            setLoadingHistory(prev => ({ ...prev, [wholesalerId]: true }));
            await fetchRetailerLedgerHistory(wholesalerId);
            setLoadingHistory(prev => ({ ...prev, [wholesalerId]: false }));
        }
    };

    if (!retailerLedgerSummary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-500 font-black tracking-widest uppercase text-sm">Loading Accounts...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 shrink-0">
                        <Activity size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">Ledger & Payments</h1>
                        <p className="text-slate-500 font-medium text-sm">Manage outstanding balances and credit</p>
                    </div>
                </div>
            </div>

            {/* Outstanding Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8 mb-10">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[32px] p-8 relative overflow-hidden shadow-xl shadow-rose-600/20 text-white">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                            <ArrowUpRight size={24} className="text-rose-100" />
                        </div>
                        <p className="text-rose-100 font-extrabold uppercase tracking-widest text-xs mb-2">
                            Total Outstanding Balance
                        </p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight">₹{retailerLedgerSummary.global_current_balance.toLocaleString()}</h2>
                    </div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                </div>

                <div className="bg-gradient-to-br from-[#042F2E] via-[#064E3B] to-[#0D9488] rounded-[32px] p-8 relative overflow-hidden shadow-xl shadow-emerald-900/20 text-white">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                            <CreditCard size={24} className="text-emerald-300" />
                        </div>
                        <p className="text-emerald-100/80 font-extrabold uppercase tracking-widest text-xs mb-2">
                            Total Approved Credit Limit
                        </p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm">₹{retailerLedgerSummary.global_credit_limit.toLocaleString()}</h2>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                </div>
            </div>

            {/* Agencies List */}
            <div className="space-y-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                    Agency Accounts
                </h2>

                <div className="space-y-5">
                    {retailerLedgerSummary.agencies.map((agency, idx) => {
                        const isExpanded = expandedAgency === agency.wholesaler_id;
                        const history = retailerLedgerHistory[agency.wholesaler_id];
                        const isLoading = loadingHistory[agency.wholesaler_id];

                        return (
                            <div key={agency.wholesaler_id} className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 overflow-hidden" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div
                                    onClick={() => toggleExpand(agency.wholesaler_id)}
                                    className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-6 cursor-pointer group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-100/50 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                                            <Building2 size={24} strokeWidth={1.5} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-extrabold text-slate-800 text-lg tracking-tight group-hover:text-emerald-700 transition-colors">{agency.name}</h3>
                                                {agency.is_primary && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/50 flex flex-row items-center gap-1 shadow-sm"><Store size={10} /> Primary</span>
                                                )}
                                            </div>
                                            <p className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-[11px] text-slate-500 font-bold tracking-widest border border-slate-100">{agency.phone}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                                            <p className={`text-2xl font-black leading-none tracking-tight ${agency.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                ₹{agency.balance.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                                                isExpanded ? <ChevronUp size={20} strokeWidth={2.5} /> : <ChevronDown size={20} strokeWidth={2.5} />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded History */}
                                {isExpanded && (
                                    <div className="bg-slate-50/50 border-t border-slate-100 p-6 sm:p-8">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <Activity size={12} /> Recent Transactions
                                        </h4>

                                        {!history || isLoading ? (
                                            <div className="flex justify-center py-10">
                                                <Loader2 size={24} className="animate-spin text-emerald-500" />
                                            </div>
                                        ) : history.length === 0 ? (
                                            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <p className="text-slate-500 text-sm font-bold tracking-wide">No transactions found with this agency.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {history.map(entry => {
                                                    const isDebit = entry.type === 'DEBIT';
                                                    return (
                                                        <div key={entry.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 rounded-[20px] border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                            <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                                                <div className={`mt-0.5 w-10 h-10 flex items-center justify-center rounded-xl shadow-inner shrink-0 ${isDebit ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                                                                    {isDebit ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[15px] font-extrabold text-slate-800 leading-tight">{entry.description}</p>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        {entry.reference_id && <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Ref: {entry.reference_id}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                                                                <p className={`text-lg font-black tracking-tight ${isDebit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                    {isDebit ? '+' : '-'}₹{entry.amount.toLocaleString()}
                                                                </p>
                                                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5 inline-block bg-slate-50 px-2 py-0.5 rounded">Bal: ₹{entry.balance_after.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {retailerLedgerSummary.agencies.length === 0 && (
                    <div className="p-16 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border-2 border-slate-200/60 border-dashed shadow-sm mt-8 relative overflow-hidden">
                        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <Building2 size={40} strokeWidth={1.5} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 mb-2">No agencies linked</p>
                        <p className="text-slate-500 font-medium max-w-sm">You haven't added any agencies yet. Connect with agencies to start ordering and track your balances here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
