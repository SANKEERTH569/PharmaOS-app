import React from 'react';
import { Order, Retailer } from '../types';
import { Printer, X, ShieldCheck, CreditCard, Truck, Package, MapPin, User, Hash, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';
import html2pdf from 'html2pdf.js';

interface CombinedPrintModalProps {
    order: Order;
    retailer: Retailer;
    onClose: () => void;
}

// ── Shared Helpers ──────────────────────────────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n: number): string {
    const num = Math.round(n);
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numToWords(num % 100) : '');
    if (num < 100000) return numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numToWords(num % 1000) : '');
    if (num < 10000000) return numToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numToWords(num % 100000) : '');
    return numToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numToWords(num % 10000000) : '');
}

function amountInWords(amount: number): string {
    const r = Math.floor(amount), p = Math.round((amount - r) * 100);
    return numToWords(r) + ' Rupees' + (p > 0 ? ' and ' + numToWords(p) + ' Paise' : '') + ' Only';
}

function buildGstSummary(items: Order['items']) {
    const map = new Map<number, { taxable: number; cgst: number; sgst: number }>();
    for (const item of items) {
        const rate = item.gst_rate ?? 0;
        const half = (item.tax_amount ?? 0) / 2;
        const ex = map.get(rate) || { taxable: 0, cgst: 0, sgst: 0 };
        map.set(rate, { taxable: ex.taxable + (item.taxable_value ?? 0), cgst: ex.cgst + half, sgst: ex.sgst + half });
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([rate, v]) => ({ rate, ...v }));
}

function fmtExp(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
}

export const CombinedPrintModal: React.FC<CombinedPrintModalProps> = ({ order, retailer, onClose }) => {
    const { wholesaler } = useAuthStore();
    const [isDownloading, setIsDownloading] = useState(false);

    const gstSummary = buildGstSummary(order.items);
    const totalCGST = gstSummary.reduce((s, r) => s + r.cgst, 0);
    const totalSGST = gstSummary.reduce((s, r) => s + r.sgst, 0);
    const grossTotal = order.items.reduce((s, i) => s + (i.taxable_value ?? 0), 0);
    const totalDiscount = order.items.reduce((s, i) => s + (i.discount_amount ?? 0), 0);
    const netPayable = grossTotal + totalCGST + totalSGST;

    const invoiceDate = new Date(order.created_at);
    const dueDate = new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const handleDownloadPdf = () => {
        setIsDownloading(true);
        const element = document.getElementById('combined-print');
        if (!element) {
            setIsDownloading(false);
            return;
        }

        const opt = {
            margin: 0,
            filename: `Invoice-Challan-${order.invoice_no || order.id.slice(-6)}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsDownloading(false);
        }).catch(() => {
            setIsDownloading(false);
        });
    };

    return (
        <>
            <style>{`
        @media print {
          /* Force A4 portrait and remove browser margins completely */
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          #combined-print, #combined-print * { visibility: visible !important; }
          #combined-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important; /* Total A4 height */
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: stretch !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Ensure each half strictly takes 50% height without overflowing */
          .print-half {
            height: 148.5mm !important; 
            width: 210mm !important;
            padding: 5mm 10mm !important; /* Added side padding to prevent cut off */
            box-sizing: border-box !important;
            overflow: hidden !important; /* hide overflow to strictly enforce 1 page */
            margin: 0 auto !important;
          }
          .cut-line {
            border-top: 1px dashed #ccc !important;
            width: 100% !important;
            margin: 0 !important;
            position: absolute !important;
            top: 148.5mm !important;
            left: 0 !important;
            z-index: 100;
          }
          .cut-line::after {
            content: "✂ CUT HERE";
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 10px;
            font-size: 8px;
            color: #ccc;
          }
          #combined-print .print\\:hidden { display: none !important; }
        }
      `}</style>

            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] print:shadow-none print:bg-transparent"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Toolbar ── */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl print:hidden shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D2B5E] to-slate-800 flex items-center justify-center shadow-inner">
                                <Printer className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <span className="block font-bold text-slate-900 text-lg">Print Combined Document</span>
                                <span className="block text-slate-500 text-xs">A4 Format: Invoice (Top) + Challan (Bottom)</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                <Download size={18} /> {isDownloading ? 'Generating...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2B5E] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#0a2147] transition-all shadow-lg shadow-[#0D2B5E]/20"
                            >
                                <Printer size={18} /> Print
                            </button>
                            <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto print:overflow-hidden bg-slate-100 p-4 lg:p-8 print:p-0 flex justify-center w-full">
                        <div id="combined-print" className="bg-white w-[210mm] shadow-xl print:shadow-none print:w-full flex flex-col relative shrink-0 overflow-hidden box-border">

                            {/* ── TOP HALF: INVOICE ── */}
                            <div className="h-[148.5mm] w-full p-[8mm] print:p-0 relative flex flex-col box-border">

                                <div className="border border-slate-200 rounded-xl overflow-hidden print:border print:rounded-none shadow-sm flex-1 flex flex-col">
                                    {/* ══ HEADER ══ */}
                                    <div className="bg-gradient-to-r from-[#0D2B5E] to-[#1a4a99] px-4 py-2 flex justify-between items-start shrink-0">
                                        <div>
                                            <h1 className="text-lg font-black text-white uppercase tracking-tight italic leading-tight">{wholesaler?.name}</h1>
                                            <p className="text-blue-200 text-[7px] font-bold uppercase tracking-widest mt-0.5">Pharmaceutical Wholesale Distributor</p>
                                            <div className="mt-1 text-blue-100 text-[8px] space-y-0.5">
                                                <p className="max-w-[300px] truncate">{wholesaler?.address}</p>
                                                <p>Ph: {wholesaler?.phone}{wholesaler?.email ? ` | ${wholesaler.email}` : ''}</p>
                                                <div className="flex gap-4 mt-0.5">
                                                    <span className="font-bold">GSTIN: <span className="text-white">{wholesaler?.gstin || '—'}</span></span>
                                                    <span className="font-bold">DL: <span className="text-white">{wholesaler?.dl_number || '—'}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">TAX INVOICE</h2>
                                            <p className="text-blue-200 text-[7px] font-bold uppercase tracking-widest">Original / Master Copy</p>
                                            <div className="mt-1 space-y-0.5">
                                                <div className="flex gap-2 justify-end items-center">
                                                    <span className="text-blue-300 text-[7px] font-bold uppercase">Invoice No.:</span>
                                                    <span className="font-black text-[8px] text-white font-mono bg-white/10 px-1 rounded">{order.invoice_no || 'DRAFT'}</span>
                                                </div>
                                                <div className="flex gap-2 justify-end items-center">
                                                    <span className="text-blue-300 text-[7px] font-bold uppercase">Date:</span>
                                                    <span className="font-black text-[8px] text-white">{fmt(invoiceDate)}</span>
                                                </div>
                                                <div className="flex gap-2 justify-end items-center">
                                                    <span className="text-blue-300 text-[7px] font-bold uppercase">Due:</span>
                                                    <span className="font-black text-[8px] text-rose-300">{fmt(dueDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ══ BILLING ══ */}
                                    <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-50/50 border-b border-slate-200 shrink-0">
                                        <div className="bg-white rounded flex flex-col justify-center px-2 py-1">
                                            <p className="text-[6px] text-slate-400 uppercase font-black tracking-[0.15em]">Consignee (Bill To)</p>
                                            <p className="text-xs font-black text-[#0D2B5E] uppercase leading-tight mt-0.5">{retailer?.shop_name || retailer?.name}</p>
                                            <div className="mt-0.5 text-slate-500 text-[8px] space-y-0.5 leading-tight flex flex-row justify-between pr-4">
                                                <div>
                                                    <p className="truncate font-bold text-slate-800">{retailer?.name} • Ph: {retailer?.phone}</p>
                                                    <p className="truncate max-w-[200px]">{retailer?.address || '—'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-700">GSTIN: {retailer?.gstin || 'UNREGISTERED'}</p>
                                                    <p>DL: {retailer?.dl_number || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row flex-wrap justify-end gap-x-4 gap-y-1 items-center px-2 py-1">
                                            {[
                                                { label: 'Order Ref', value: `#${order.id.slice(-8).toUpperCase()}`, mono: true },
                                                { label: 'Pay Terms', value: order.payment_terms || 'NET 15', blue: true },
                                                { label: 'Status', value: order.status, green: true },
                                            ].map(({ label, value, mono, blue, green }) => (
                                                <div key={label} className="flex gap-2 items-center text-[8px]">
                                                    <span className="text-slate-400 font-bold uppercase">{label}:</span>
                                                    <span className={`font-black ${blue ? 'text-blue-600' : green ? 'text-emerald-600' : 'text-slate-900'} ${mono ? 'font-mono bg-slate-100 px-1 rounded' : ''}`}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ══ LINE ITEMS ══ */}
                                    <div className="px-3 py-1 flex-1 overflow-hidden flex flex-col">
                                        {/* Table wrapped safely */}
                                        <table className="w-full text-[7px] border-collapse relative">
                                            <thead className="sticky top-0 bg-white">
                                                <tr className="bg-[#0D2B5E] text-white">
                                                    <th className="px-1 py-1 text-center font-black">#</th>
                                                    <th className="px-1 py-1 text-center font-black">HSN</th>
                                                    <th className="px-1.5 py-1 text-left font-black uppercase">Product Description</th>
                                                    <th className="px-1 py-1 text-right font-black">Exp.</th>
                                                    <th className="px-1 py-1 text-right font-black">MRP</th>
                                                    <th className="px-1 py-1 text-right font-black">Qty</th>
                                                    <th className="px-1 py-1 text-right font-black">Rate</th>
                                                    <th className="px-1 py-1 text-right font-black">Amount</th>
                                                    <th className="px-1 py-1 text-center font-black">GST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {order.items.slice(0, 8).map((item, idx) => { // hard limit items for layout safety in MVP
                                                    const mrp = item.mrp ?? 0;
                                                    const rate = item.unit_price ?? 0;
                                                    const amount = item.taxable_value ?? (rate * item.qty);
                                                    return (
                                                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                            <td className="px-1 py-1 text-center text-slate-400 font-bold">{idx + 1}</td>
                                                            <td className="px-1 py-1 text-center font-mono text-slate-500">{item.hsn_code || '3004'}</td>
                                                            <td className="px-1.5 py-1 font-black text-slate-900 uppercase truncate max-w-[150px]">{item.medicine_name}</td>
                                                            <td className="px-1 py-1 text-right font-mono text-slate-500">{fmtExp(item.expiry_date)}</td>
                                                            <td className="px-1 py-1 text-right text-slate-500">₹{mrp.toFixed(2)}</td>
                                                            <td className="px-1 py-1 text-right font-black text-slate-900">{item.qty}</td>
                                                            <td className="px-1 py-1 text-right font-bold text-slate-700">₹{rate.toFixed(2)}</td>
                                                            <td className="px-1 py-1 text-right font-black text-slate-900">₹{amount.toFixed(2)}</td>
                                                            <td className="px-1 py-1 text-center font-bold text-[#0D2B5E]">{item.gst_rate ?? 0}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-100 border-t border-slate-300">
                                                    <td colSpan={5} className="px-1.5 py-1 font-black text-right text-slate-500 uppercase text-[6px] tracking-wider">
                                                        {order.items.length > 8 ? `+${order.items.length - 8} items clipped ` : ''} Total Items: {order.items.length} | Total Qty: {order.items.reduce((s, i) => s + i.qty, 0)}
                                                    </td>
                                                    <td></td>
                                                    <td></td>
                                                    <td className="px-1 py-1 text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        {order.items.length > 8 && <div className="text-[6px] text-center text-rose-500 mt-1 italic print:hidden">Warning: Large order truncated for combined preview view.</div>}
                                    </div>

                                    {/* ══ FOOTER: GST + TOTALS ══ */}
                                    <div className="grid grid-cols-12 gap-2 px-3 py-1.5 border-t border-slate-200 shrink-0">
                                        {/* Left (GST + Amount in words) */}
                                        <div className="col-span-8 flex flex-row gap-4 items-start">

                                            <div className="bg-slate-50 border border-slate-200 p-1 flex-1">
                                                <p className="text-[6px] font-black uppercase text-slate-400 mb-0.5 tracking-widest text-center border-b border-slate-200 pb-0.5">GST Summary</p>
                                                <table className="w-full text-[6px]">
                                                    <thead>
                                                        <tr className="text-slate-500">
                                                            <th className="text-left font-black">RATE</th>
                                                            <th className="text-right font-black">TAXABLE</th>
                                                            <th className="text-right font-black">CGST</th>
                                                            <th className="text-right font-black">SGST</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {gstSummary.map(row => (
                                                            <tr key={row.rate}>
                                                                <td className="font-bold text-slate-700">{row.rate}%</td>
                                                                <td className="text-right">₹{row.taxable.toFixed(2)}</td>
                                                                <td className="text-right">₹{row.cgst.toFixed(2)}</td>
                                                                <td className="text-right">₹{row.sgst.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t border-slate-300 bg-slate-100">
                                                            <td className="font-black text-[6px] uppercase text-slate-900">TOT</td>
                                                            <td className="text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                                                            <td className="text-right font-black text-[#0D2B5E]">₹{totalCGST.toFixed(2)}</td>
                                                            <td className="text-right font-black text-[#0D2B5E]">₹{totalSGST.toFixed(2)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <div className="p-1 border border-blue-100 bg-blue-50/50">
                                                    <p className="text-[6px] text-blue-600 font-black uppercase tracking-widest leading-none mb-0.5 flex gap-1"><CreditCard size={8} /> Bank Transfer PayTo</p>
                                                    <div className="text-[7px] text-slate-700 font-bold space-y-[1px] leading-none">
                                                        <p>{wholesaler?.bank_name} • A/C: {wholesaler?.bank_account}</p>
                                                        <p>IFSC: {wholesaler?.ifsc} {wholesaler?.upi_id ? `• UPI: ${wholesaler.upi_id}` : ''}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[6px] text-slate-400 font-black uppercase tracking-widest leading-none mb-0.5">Amount in Words</p>
                                                    <p className="text-[7px] font-black text-slate-900 italic uppercase leading-none">{amountInWords(netPayable)}</p>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Right (Totals summary) */}
                                        <div className="col-span-4 flex flex-col justify-between border-l border-slate-100 pl-3">
                                            <div className="space-y-0.5 mt-0.5">
                                                {[
                                                    { label: 'Gross Total', value: `₹${grossTotal.toFixed(2)}` },
                                                    { label: 'Discount', value: totalDiscount > 0 ? `-₹${totalDiscount.toFixed(2)}` : '₹0.00', green: totalDiscount > 0 },
                                                    { label: 'CGST', value: `₹${totalCGST.toFixed(2)}` },
                                                    { label: 'SGST', value: `₹${totalSGST.toFixed(2)}` },
                                                ].map(({ label, value, green }) => (
                                                    <div key={label} className="flex justify-between text-[7px] border-b border-slate-50 pb-0.5">
                                                        <span className="text-slate-400 font-bold uppercase">{label}</span>
                                                        <span className={`font-black ${green ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-0.5 border-t border-[#0D2B5E] flex justify-between items-center bg-slate-50 px-1 rounded-sm">
                                                    <span className="text-[7px] font-black text-[#0D2B5E] italic uppercase leading-none">Net Payable:</span>
                                                    <span className="text-sm font-black text-[#0D2B5E] tracking-tighter leading-none">
                                                        ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right mt-1">
                                                <p className="text-[6px] font-black text-[#0D2B5E] uppercase border-t border-slate-300 pt-0.5">Authorized Signatory</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* ── CUT LINE ── */}
                            <div className="print-half-divider border-t border-dashed border-slate-300 w-full relative z-10 my-0 print:border-slate-400 opacity-60">
                                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[8px] text-slate-500 font-bold tracking-widest hidden print:block">
                                    ✂ CUT HERE
                                </div>
                            </div>

                            {/* ── BOTTOM HALF: DELIVERY CHALLAN ── */}
                            <div className="h-[148.5mm] w-full p-[8mm] print:p-0 relative flex flex-col box-border">

                                <div className="border-2 border-emerald-100 print:border-none p-3 lg:p-4 flex-1 flex flex-col pt-0">
                                    {/* Header */}
                                    <div className="flex justify-between items-end mb-3 pb-2 border-b border-emerald-500 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                                <Package size={20} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <h1 className="text-lg font-black text-emerald-900 uppercase tracking-tight italic leading-tight">{wholesaler?.name}</h1>
                                                <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest leading-none">Delivery Challan / Proof of Delivery</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-3 leading-none">
                                            <div>
                                                <p className="text-[6px] text-slate-400 font-black uppercase">Consignment No</p>
                                                <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">DC-{order.id.slice(-6)}</p>
                                            </div>
                                            <div className="border-l border-slate-200 pl-3">
                                                <p className="text-[6px] text-slate-400 font-black uppercase">Challan Date</p>
                                                <p className="text-[10px] font-black text-slate-900 tracking-tighter">{new Date().toLocaleDateString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shipping Info */}
                                    <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
                                        <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 flex flex-col gap-1.5">
                                            <div className="flex items-start gap-1.5">
                                                <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[6px] text-slate-400 font-black uppercase tracking-widest leading-none">Shipping Destination</p>
                                                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none mt-0.5">{retailer?.shop_name || retailer?.name}</p>
                                                    <p className="text-[8px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[200px] truncate">{retailer?.address || 'Address Not Provided'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <User size={10} className="text-slate-400 shrink-0" />
                                                <p className="text-[8px] font-bold text-slate-700 leading-none">Attn: {retailer?.name} <span className="text-slate-400 mx-1">|</span> {retailer?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="p-2 border border-emerald-100 rounded-lg bg-white relative overflow-hidden">
                                            <div className="absolute -right-4 -top-4 opacity-5">
                                                <Truck size={64} />
                                            </div>
                                            <div className="space-y-1 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase w-16">Reference:</span>
                                                    <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-1 rounded">Invoice {order.invoice_no || order.id.slice(-6)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 border-t border-slate-50 pt-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase w-16">Package Size:</span>
                                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{order.items.length} Items</span>
                                                </div>
                                                <div className="flex items-center gap-2 border-t border-slate-50 pt-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase w-16">Est. Value:</span>
                                                    <span className="text-[9px] font-bold text-slate-600 italic">₹{order.total_amount.toLocaleString()} <span className="text-[6px] font-normal">(Do not collect cash unless C.O.D)</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package Contents Grid format for space saving */}
                                    <div className="flex-1 overflow-hidden flex flex-col mb-1 relative border border-slate-200">
                                        <p className="text-[7px] font-black text-white bg-slate-900 uppercase tracking-widest px-2 py-1 flex items-center gap-1.5 absolute top-0 inset-x-0 z-10 hidden">
                                            <Hash size={8} /> Consignment Contents Checklist
                                        </p>
                                        <div className="grid grid-cols-2 gap-px bg-slate-200 text-xs overflow-auto">
                                            {order.items.slice(0, 10).map((item, idx) => (
                                                <div key={item.id} className="bg-white flex items-center justify-between p-1.5">
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="bg-slate-100 text-slate-400 text-[6px] font-bold px-1 rounded-sm w-4 text-center shrink-0">{idx + 1}</span>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="font-black text-slate-900 uppercase text-[8px] truncate leading-tight w-full" title={item.medicine_name}>{item.medicine_name.length > 25 ? item.medicine_name.substring(0, 25) + '...' : item.medicine_name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 ml-1 border-l border-slate-100 pl-2">
                                                        <div className="text-center w-8">
                                                            <p className="text-[6px] text-slate-400 uppercase font-bold leading-none">Qty</p>
                                                            <p className="text-[10px] font-black text-emerald-600 leading-none mt-0.5">{item.qty}</p>
                                                        </div>
                                                        <div className="w-4 h-4 rounded-sm border-2 border-slate-300"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {order.items.length > 10 && <div className="text-[7px] text-center font-bold text-slate-500 bg-slate-100 py-1 border-t border-slate-200">+{order.items.length - 10} additional items in package. Refer to main invoice above for full list.</div>}
                                    </div>

                                    {/* Confirmation Area */}
                                    <div className="grid grid-cols-2 gap-4 mt-2 shrink-0">
                                        <div className="rounded-lg bg-slate-50 border border-slate-200 h-14 flex flex-col justify-end p-2 relative">
                                            <div className="absolute top-1 left-2 text-[6px] text-slate-400 font-bold uppercase">Logistics Copy</div>
                                            <p className="text-[7px] text-slate-500 font-bold uppercase text-center border-t border-slate-300 pt-1 border-dashed mt-auto w-3/4 mx-auto">Delivery Executive Sign</p>
                                        </div>
                                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 h-14 flex flex-col justify-end p-2 relative">
                                            <div className="absolute top-1 left-2 text-[6px] text-emerald-500 font-bold uppercase">Retailer Copy</div>
                                            <p className="text-[7px] text-emerald-700 font-black uppercase text-center border-t border-emerald-300 pt-1 border-dashed mt-auto w-3/4 mx-auto">Receiver Seal & Signature</p>
                                        </div>
                                    </div>
                                    <p className="text-center text-[6px] text-slate-400 italic mt-0.5 shrink-0">I confirm the receipt of the package containing the above mentioned items in sealed condition.</p>
                                </div>

                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
