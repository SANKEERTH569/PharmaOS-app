import React, { useState, useCallback } from 'react';
import { Order, Retailer } from '../types';
import { Printer, X, ShieldCheck, CreditCard, Truck, Package, MapPin, User, Hash, Download, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { downloadPdf } from '../utils/pdfHelper';

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

    const handleDownloadPdf = useCallback(() => {
        setIsDownloading(true);
        downloadPdf({
            elementId: 'combined-print',
            filename: `Invoice-Challan-${order.invoice_no || order.id.slice(-6)}.pdf`,
        })
            .then(() => setIsDownloading(false))
            .catch((err) => { console.error('Combined PDF failed:', err); setIsDownloading(false); });
    }, [order]);

    const handlePrint = useCallback(() => {
        const el = document.getElementById('combined-print');
        if (!el) return;
        const win = window.open('', '_blank', 'width=800,height=1100');
        if (!win) { window.print(); return; }
        win.document.write(`<!DOCTYPE html><html><head><title>Invoice+Challan ${order.invoice_no || ''}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.cut-line{border-top:1px dashed #ccc;position:relative}.cut-line::after{content:"✂ CUT HERE";position:absolute;top:-6px;left:50%;transform:translateX(-50%);background:white;padding:0 10px;font-size:8px;color:#999}</style>
        </head><body>${el.outerHTML}</body></html>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 600);
    }, [order]);

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh]"
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
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {isDownloading ? 'Generating...' : 'Download PDF'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#0D2B5E] text-white rounded-xl text-sm font-bold hover:bg-[#0a2147] transition-all shadow-sm"
                        >
                            <Printer size={16} /> Print
                        </button>
                        <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto bg-slate-100 p-4 lg:p-8 flex justify-center w-full rounded-b-2xl">
                    <div id="combined-print" className="bg-white w-[210mm] shadow-xl flex flex-col relative shrink-0 overflow-hidden box-border">

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
                                            {order.items.map((item, idx) => {
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
                                                    Total Items: {order.items.length} | Total Qty: {order.items.reduce((s, i) => s + i.qty, 0)}
                                                </td>
                                                <td></td>
                                                <td></td>
                                                <td className="px-1 py-1 text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>

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
                                                <div className="flex items-start gap-1.5">
                                                    <div className="flex-1">
                                                        <p className="text-[6px] text-blue-600 font-black uppercase tracking-widest leading-none mb-0.5 flex gap-1"><CreditCard size={8} /> Bank & UPI PayTo</p>
                                                        <div className="text-[7px] text-slate-700 font-bold space-y-[1px] leading-none">
                                                            <p>{wholesaler?.bank_name} • A/C: {wholesaler?.bank_account}</p>
                                                            <p>IFSC: {wholesaler?.ifsc} {wholesaler?.upi_id ? `• UPI: ${wholesaler.upi_id}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    {wholesaler?.upi_id && (
                                                        <div className="shrink-0 text-center">
                                                            <img
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(`upi://pay?pa=${wholesaler.upi_id}&pn=${encodeURIComponent(wholesaler.name || 'Merchant')}&am=${netPayable.toFixed(2)}&cu=INR`)}`}
                                                                alt="UPI QR"
                                                                className="w-[44px] h-[44px] rounded border border-blue-200"
                                                            />
                                                            <p className="text-[5px] font-bold text-blue-600 mt-0.5">Scan to Pay</p>
                                                        </div>
                                                    )}
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
                                        {order.items.map((item, idx) => (
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
    );
};
