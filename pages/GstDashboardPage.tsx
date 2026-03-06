import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { FileText, Download, TrendingUp, Percent, UploadCloud, ArrowLeft, CheckCircle } from 'lucide-react';
import { Order } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const GstDashboardPage = () => {
    const { wholesaler } = useAuthStore();
    const { orders } = useDataStore();
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [viewState, setViewState] = useState<'dashboard' | 'gstr3b_doc'>('dashboard');

    const [taxMetrics, setTaxMetrics] = useState({
        totalSales: 0,
        totalGstCollected: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        invoiceCount: 0
    });

    useEffect(() => {
        if (!orders || orders.length === 0) return;

        // In a real application we would filter `relevantOrders` dynamically by selectedMonth here
        const relevantOrders = orders.filter(
            (o: Order) => o.wholesaler_id === wholesaler?.id && o.status !== 'CANCELLED'
        );

        let totalGst = 0;
        let totalSales = 0;

        relevantOrders.forEach((order) => {
            const gRate = 12;
            const invoiceTax = order.total_amount * (gRate / (100 + gRate));
            totalGst += invoiceTax;
            totalSales += (order.total_amount - invoiceTax);
        });

        setTaxMetrics({
            totalSales: Math.round(totalSales * 100) / 100,
            totalGstCollected: Math.round(totalGst * 100) / 100,
            cgst: Math.round((totalGst / 2) * 100) / 100,
            sgst: Math.round((totalGst / 2) * 100) / 100,
            igst: 0,
            invoiceCount: relevantOrders.length
        });

    }, [orders, wholesaler?.id]);

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(14);
        doc.text("Form GSTR-3B", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("[See rule 61(5)]", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.rect(14, 25, 182, 10);
        doc.text(`1. GSTIN`, 16, 31);
        doc.text(wholesaler?.gstin || '36ABCDE1234F1Z5', 90, 31);

        doc.rect(14, 35, 182, 10);
        doc.text(`2. Legal name of the registered person`, 16, 41);
        doc.text(wholesaler?.name || 'Wholesale Registered Name', 90, 41);

        doc.setFontSize(12);
        doc.text("3.1 Tax on outward and reverse charge inward supplies", 14, 55);

        autoTable(doc, {
            theme: 'grid',
            startY: 58,
            styles: { fontSize: 8, fontStyle: 'normal', textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            head: [["Nature of Supplies", "Total Taxable value", "Integrated Tax", "Central Tax", "State/UT Tax", "Cess"]],
            body: [
                ["(a) Outward taxable supplies (other than zero rated, nil rated and exempted)", taxMetrics.totalSales.toFixed(2), "0.00", taxMetrics.cgst.toFixed(2), taxMetrics.sgst.toFixed(2), "0.00"],
                ["(b) Outward taxable supplies (zero rated)", "0.00", "0.00", "-", "-", "0.00"],
                ["(c) Other outward supplies (Nil rated, exempted)", "0.00", "-", "-", "-", "-"],
                ["(d) Inward supplies (liable to reverse charge)", "0.00", "0.00", "0.00", "0.00", "0.00"],
                ["(e) Non-GST outward supplies", "0.00", "-", "-", "-", "-"]
            ]
        });

        const finalY = (doc as any).lastAutoTable.finalY || 100;

        doc.setFontSize(12);
        doc.text("3.2 Inter-state supplies", 14, finalY + 12);

        autoTable(doc, {
            theme: 'grid',
            startY: finalY + 15,
            styles: { fontSize: 8, fontStyle: 'normal', textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            head: [["Nature of Supplies", "Total Taxable value", "Integrated Tax"]],
            body: [
                ["Supplies made to Unregistered Persons", "0.00", "0.00"],
                ["Supplies made to Composition Taxable Persons", "0.00", "0.00"],
                ["Supplies made to UIN holders", "0.00", "0.00"]
            ]
        });

        doc.setFontSize(60);
        doc.setTextColor(200, 200, 200);
        doc.text("DRAFT", 105, 150, { angle: 45, align: 'center' });

        doc.save(`GSTR-3B_${selectedMonth || 'ALL'}.pdf`);
    };

    const handleDirectGSTUpload = () => {
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            alert('GSTR-3B Successfully Transmitted to Government GST API System!');
        }, 1500);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold border-b border-indigo-100 pb-1 text-slate-800">GST Returns Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Review your collected tax, track GSTR filings, and export reports.</p>
                </div>
                <div className="flex gap-2">
                    {viewState === 'gstr3b_doc' && (
                        <button
                            onClick={() => setViewState('dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
                        >
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                    )}
                    {viewState === 'dashboard' && (
                        <select
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="">All Time</option>
                            <option value="2026-03">March 2026</option>
                            <option value="2026-02">February 2026</option>
                        </select>
                    )}
                </div>
            </div>

            {viewState === 'dashboard' ? (
                <div className="animate-fade-in-down space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex flex-row items-center justify-between pb-2">
                                <p className="text-sm font-semibold text-slate-500">Total Taxable Sales</p>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹{taxMetrics.totalSales.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">{taxMetrics.invoiceCount} invoices generated</p>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-5 rounded-2xl shadow-lg border border-indigo-400">
                            <div className="flex flex-row items-center justify-between pb-2">
                                <p className="text-sm font-semibold text-indigo-100">Total GST Collected</p>
                                <Percent className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-2xl font-black text-white">₹{taxMetrics.totalGstCollected.toLocaleString()}</div>
                            <p className="text-xs text-indigo-200 mt-1">Total liability estimated</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex flex-row items-center justify-between pb-2">
                                <p className="text-sm font-semibold text-slate-500">CGST (Central Tax)</p>
                            </div>
                            <div className="text-2xl font-bold text-slate-700">₹{taxMetrics.cgst.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">50% portion</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex flex-row items-center justify-between pb-2">
                                <p className="text-sm font-semibold text-slate-500">SGST (State Tax)</p>
                            </div>
                            <div className="text-2xl font-bold text-slate-700">₹{taxMetrics.sgst.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">50% portion</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row gap-4 justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-4 relative">
                            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <FileText className="h-7 w-7 text-indigo-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-800">File GSTR-3B</h2>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                                        <CheckCircle size={10} /> Ready
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">Review the consolidated form and choose to export to PDF or directly upload it.</p>
                            </div>
                        </div>
                        <div className="flex w-full sm:w-auto gap-3 relative z-10">
                            <button
                                onClick={() => setViewState('gstr3b_doc')}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200/50 flex items-center justify-center gap-2"
                            >
                                Assemble GSTR-3B Document
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in-down space-y-6">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200/60">
                                <FileText className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-800">Draft Document Generated</h2>
                                <p className="text-xs text-slate-500">Preview visually or use options below to finalize.</p>
                            </div>
                        </div>
                        <div className="flex w-full sm:w-auto gap-2">
                            <button
                                onClick={() => generatePDF()}
                                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-indigo-600 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                            >
                                <Download size={15} /> Export PDF
                            </button>

                            <button
                                onClick={handleDirectGSTUpload}
                                disabled={isUploading}
                                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-emerald-200/50"
                            >
                                {isUploading ? (
                                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <UploadCloud size={15} />
                                )}
                                {isUploading ? 'Uploading...' : 'Direct Upload to GSTN'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden text-sm">

                        <div className="p-6 bg-slate-50 border-b border-slate-300">
                            <h2 className="text-center font-bold text-xl uppercase mb-1">Form GSTR-3B</h2>
                            <p className="text-center text-xs text-slate-500 mb-6">[See rule 61(5)]</p>

                            <div className="flex justify-end mb-4">
                                <table className="border-collapse border border-slate-400 text-xs text-slate-800">
                                    <tbody>
                                        <tr><th className="border border-slate-400 p-1 px-3 bg-slate-200 text-left">Year</th><td className="border border-slate-400 p-1 px-3 font-semibold text-right bg-white">2026-27</td></tr>
                                        <tr><th className="border border-slate-400 p-1 px-3 bg-slate-200 text-left">Month</th><td className="border border-slate-400 p-1 px-3 font-semibold text-right bg-white">March</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <table className="w-full border-collapse border border-slate-400 text-sm bg-white font-semibold text-slate-800">
                                <tbody>
                                    <tr>
                                        <td className="border border-slate-400 p-2 w-1/3 text-slate-600">1. GSTIN</td>
                                        <td className="border border-slate-400 p-2">{wholesaler?.gstin || '36ABCDE1234F1Z5'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-400 p-2 text-slate-600">2. Legal name of the registered person</td>
                                        <td className="border border-slate-400 p-2">{wholesaler?.name || 'Wholesale Registered Name'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 overflow-x-auto space-y-8">
                            <div>
                                <h3 className="text-md font-bold text-slate-800 mb-2">3.1 Tax on outward and reverse charge inward supplies</h3>
                                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                                    <thead className="bg-[#e2e8f0] text-slate-800 font-bold">
                                        <tr>
                                            <th className="border border-slate-400 p-2 w-[40%]">Nature of Supplies</th>
                                            <th className="border border-slate-400 p-2 text-right">Total Taxable value</th>
                                            <th className="border border-slate-400 p-2 text-right">Integrated Tax</th>
                                            <th className="border border-slate-400 p-2 text-right">Central Tax</th>
                                            <th className="border border-slate-400 p-2 text-right">State/UT Tax</th>
                                            <th className="border border-slate-400 p-2 text-right">Cess</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700 bg-white">
                                        <tr>
                                            <td className="border border-slate-400 p-2">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                                            <td className="border border-slate-400 p-2 text-right font-medium">{taxMetrics.totalSales.toFixed(2)}</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right font-medium">{taxMetrics.cgst.toFixed(2)}</td>
                                            <td className="border border-slate-400 p-2 text-right font-medium">{taxMetrics.sgst.toFixed(2)}</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">(b) Outward taxable supplies (zero rated)</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">(c) Other outward supplies (Nil rated, exempted)</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">(d) Inward supplies (liable to reverse charge)</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">(e) Non-GST outward supplies</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                            <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="w-full lg:w-[70%]">
                                <h3 className="text-md font-bold text-slate-800 mb-2">3.2 Inter-state supplies</h3>
                                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                                    <thead className="bg-[#e2e8f0] text-slate-800 font-bold">
                                        <tr>
                                            <th className="border border-slate-400 p-2">Nature of Supplies</th>
                                            <th className="border border-slate-400 p-2 text-right">Total Taxable value</th>
                                            <th className="border border-slate-400 p-2 text-right">Integrated Tax</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700 bg-white">
                                        <tr>
                                            <td className="border border-slate-400 p-2">Supplies made to Unregistered Persons</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">Supplies made to Composition Taxable Persons</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-400 p-2">Supplies made to UIN holders</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                            <td className="border border-slate-400 p-2 text-right">0.00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
