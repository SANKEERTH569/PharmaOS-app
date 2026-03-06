import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Order, Retailer, OrderItem } from '../types';
import { Printer, X, CreditCard, Download, Calendar, FileText, Loader2, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import html2pdf from 'html2pdf.js';

interface DailyInvoiceModalProps {
    orders: Order[];
    retailer: Retailer;
    date: string; // YYYY-MM-DD
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

interface MergedItem {
    medicine_id: string;
    medicine_name: string;
    hsn_code: string;
    expiry_date?: string | null;
    mrp: number;
    unit_price: number;
    gst_rate: number;
    qty: number;
    discount_percent: number;
    discount_amount: number;
    taxable_value: number;
    tax_amount: number;
    total_price: number;
}

function mergeItems(orders: Order[]): MergedItem[] {
    const map = new Map<string, MergedItem>();
    for (const order of orders) {
        for (const item of order.items) {
            const key = item.medicine_id;
            const existing = map.get(key);
            if (existing) {
                existing.qty += item.qty;
                existing.discount_amount += (item.discount_amount ?? 0);
                existing.taxable_value += (item.taxable_value ?? 0);
                existing.tax_amount += (item.tax_amount ?? 0);
                existing.total_price += (item.total_price ?? 0);
            } else {
                map.set(key, {
                    medicine_id: item.medicine_id,
                    medicine_name: item.medicine_name,
                    hsn_code: item.hsn_code || '3004',
                    expiry_date: item.expiry_date,
                    mrp: item.mrp ?? 0,
                    unit_price: item.unit_price ?? 0,
                    gst_rate: item.gst_rate ?? 0,
                    qty: item.qty,
                    discount_percent: item.discount_percent ?? 0,
                    discount_amount: item.discount_amount ?? 0,
                    taxable_value: item.taxable_value ?? 0,
                    tax_amount: item.tax_amount ?? 0,
                    total_price: item.total_price ?? 0,
                });
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
}

function buildGstSummary(items: MergedItem[]) {
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

export const DailyInvoiceModal: React.FC<DailyInvoiceModalProps> = ({ orders, retailer, date, onClose }) => {
    const { wholesaler } = useAuthStore();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsOpen(true));
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setTimeout(onClose, 300);
    }, [onClose]);

    const mergedItems = useMemo(() => mergeItems(orders), [orders]);
    const gstSummary = useMemo(() => buildGstSummary(mergedItems), [mergedItems]);

    const totalCGST = gstSummary.reduce((s, r) => s + r.cgst, 0);
    const totalSGST = gstSummary.reduce((s, r) => s + r.sgst, 0);
    const grossTotal = mergedItems.reduce((s, i) => s + (i.taxable_value ?? 0), 0);
    const totalDiscount = mergedItems.reduce((s, i) => s + (i.discount_amount ?? 0), 0);
    const netPayable = grossTotal + totalCGST + totalSGST;
    const totalQty = mergedItems.reduce((s, i) => s + i.qty, 0);

    const invoiceDate = new Date(date);
    const dueDate = new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dailyInvoiceNo = `DAILY-${date}-${retailer.id.slice(-4).toUpperCase()}`;

    const handleDownloadPdf = useCallback(() => {
        setIsDownloading(true);
        const element = document.getElementById('daily-invoice-print');
        if (!element) { setIsDownloading(false); return; }
        html2pdf().set({
            margin: 0,
            filename: `Daily-Invoice-${date}-${retailer.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(element).save().then(() => setIsDownloading(false)).catch(() => setIsDownloading(false));
    }, [date, retailer]);

    const handlePrint = useCallback(() => {
        const el = document.getElementById('daily-invoice-print');
        if (!el) return;
        const win = window.open('', '_blank', 'width=800,height=1100');
        if (!win) { window.print(); return; }
        win.document.write(`<!DOCTYPE html><html><head><title>Daily Invoice ${date}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;min-height:297mm;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style>
        </head><body>${el.outerHTML}</body></html>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 600);
    }, [date]);

    return (
        <div className="fixed inset-0 z-[60]" style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
            {/* Scrim */}
            <div
                className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out"
                style={{ opacity: isOpen ? 1 : 0 }}
                onClick={handleClose}
            />
            {/* Drawer panel */}
            <div
                className="absolute top-0 right-0 h-full w-full sm:w-[85vw] md:w-[75vw] lg:w-[60vw] xl:w-[50vw] max-w-[900px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out border-l border-slate-200"
                style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
            >
                    {/* ── Toolbar ── */}
                    <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <button onClick={handleClose} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <ChevronRight size={18} />
                            </button>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <Calendar className="text-white w-4 h-4" />
                            </div>
                            <div>
                                <span className="block font-bold text-slate-900 text-sm leading-tight">Daily Consolidated Invoice</span>
                                <span className="block text-slate-400 text-xs">
                                    {retailer.shop_name || retailer.name} • {orders.length} order{orders.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {isDownloading ? 'Saving...' : 'PDF'}
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0D2B5E] text-white rounded-lg text-xs font-bold hover:bg-[#0a2147] transition-colors shadow-sm"
                            >
                                <Printer size={14} /> Print
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto bg-slate-50 flex-1 p-3 sm:p-4 flex justify-center w-full">
                        <div id="daily-invoice-print" className="bg-white w-full shadow-lg flex flex-col relative overflow-hidden box-border p-4 sm:p-6 rounded-lg border border-slate-200">

                            {/* ══ HEADER ══ */}
                            <div className="bg-gradient-to-r from-[#0D2B5E] to-[#1a4a99] px-5 py-3 flex justify-between items-start rounded-t-lg">
                                <div>
                                    <h1 className="text-xl font-black text-white uppercase tracking-tight italic leading-tight">{wholesaler?.name}</h1>
                                    <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest mt-0.5">Pharmaceutical Wholesale Distributor</p>
                                    <div className="mt-1.5 text-blue-100 text-[9px] space-y-0.5">
                                        <p className="max-w-[350px]">{wholesaler?.address}</p>
                                        <p>Ph: {wholesaler?.phone}{wholesaler?.email ? ` | ${wholesaler.email}` : ''}</p>
                                        <div className="flex gap-4 mt-0.5">
                                            <span className="font-bold">GSTIN: <span className="text-white">{wholesaler?.gstin || '—'}</span></span>
                                            <span className="font-bold">DL: <span className="text-white">{wholesaler?.dl_number || '—'}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">DAILY INVOICE</h2>
                                    <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest">Consolidated / Whole Day Summary</p>
                                    <div className="mt-1.5 space-y-1">
                                        <div className="flex gap-2 justify-end items-center">
                                            <span className="text-blue-300 text-[8px] font-bold uppercase">Ref No.:</span>
                                            <span className="font-black text-[9px] text-white font-mono bg-white/10 px-1.5 rounded">{dailyInvoiceNo}</span>
                                        </div>
                                        <div className="flex gap-2 justify-end items-center">
                                            <span className="text-blue-300 text-[8px] font-bold uppercase">Date:</span>
                                            <span className="font-black text-[9px] text-white">{fmt(invoiceDate)}</span>
                                        </div>
                                        <div className="flex gap-2 justify-end items-center">
                                            <span className="text-blue-300 text-[8px] font-bold uppercase">Due:</span>
                                            <span className="font-black text-[9px] text-rose-300">{fmt(dueDate)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ══ BILLING + ORDER REFS ══ */}
                            <div className="grid grid-cols-3 gap-3 px-4 py-3 bg-slate-50/50 border-b border-slate-200">
                                <div className="col-span-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                    <p className="text-[7px] text-slate-400 uppercase font-black tracking-[0.15em]">Consignee (Bill To)</p>
                                    <p className="text-sm font-black text-[#0D2B5E] uppercase leading-tight mt-0.5">{retailer?.shop_name || retailer?.name}</p>
                                    <div className="mt-1 text-slate-500 text-[9px] space-y-0.5 leading-tight flex flex-row justify-between pr-4">
                                        <div>
                                            <p className="font-bold text-slate-800">{retailer?.name} • Ph: {retailer?.phone}</p>
                                            <p className="max-w-[250px]">{retailer?.address || '—'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-700">GSTIN: {retailer?.gstin || 'UNREGISTERED'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <p className="text-[7px] text-amber-600 uppercase font-black tracking-[0.15em] flex items-center gap-1">
                                        <FileText size={10} /> Orders Consolidated
                                    </p>
                                    <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                                        {orders.map((order, idx) => (
                                            <div key={order.id} className="flex justify-between items-center text-[8px]">
                                                <span className="font-mono font-bold text-amber-800">
                                                    {idx + 1}. {order.invoice_no || `#${order.id.slice(-6)}`}
                                                </span>
                                                <span className="text-amber-600 font-bold">₹{order.total_amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-amber-300 mt-1 pt-1 flex justify-between text-[8px]">
                                        <span className="font-black text-amber-900 uppercase tracking-wider">{orders.length} Orders</span>
                                        <span className="font-black text-amber-900">₹{orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ══ LINE ITEMS TABLE ══ */}
                            <div className="px-4 py-2 flex-1">
                                <table className="w-full text-[8px] border-collapse">
                                    <thead>
                                        <tr className="bg-[#0D2B5E] text-white">
                                            <th className="px-1.5 py-1.5 text-center font-black">#</th>
                                            <th className="px-1.5 py-1.5 text-center font-black">HSN</th>
                                            <th className="px-2 py-1.5 text-left font-black uppercase">Product Description</th>
                                            <th className="px-1.5 py-1.5 text-right font-black">Exp.</th>
                                            <th className="px-1.5 py-1.5 text-right font-black">MRP</th>
                                            <th className="px-1.5 py-1.5 text-right font-black">Qty</th>
                                            <th className="px-1.5 py-1.5 text-right font-black">Rate</th>
                                            <th className="px-1.5 py-1.5 text-right font-black">Amount</th>
                                            <th className="px-1.5 py-1.5 text-center font-black">GST</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {mergedItems.map((item, idx) => {
                                            const amount = item.taxable_value ?? (item.unit_price * item.qty);
                                            return (
                                                <tr key={item.medicine_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                    <td className="px-1.5 py-1 text-center text-slate-400 font-bold">{idx + 1}</td>
                                                    <td className="px-1.5 py-1 text-center font-mono text-slate-500">{item.hsn_code}</td>
                                                    <td className="px-2 py-1 font-black text-slate-900 uppercase truncate max-w-[180px]">{item.medicine_name}</td>
                                                    <td className="px-1.5 py-1 text-right font-mono text-slate-500">{fmtExp(item.expiry_date)}</td>
                                                    <td className="px-1.5 py-1 text-right text-slate-500">₹{item.mrp.toFixed(2)}</td>
                                                    <td className="px-1.5 py-1 text-right font-black text-slate-900">{item.qty}</td>
                                                    <td className="px-1.5 py-1 text-right font-bold text-slate-700">₹{item.unit_price.toFixed(2)}</td>
                                                    <td className="px-1.5 py-1 text-right font-black text-slate-900">₹{amount.toFixed(2)}</td>
                                                    <td className="px-1.5 py-1 text-center font-bold text-[#0D2B5E]">{item.gst_rate}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 border-t border-slate-300">
                                            <td colSpan={5} className="px-2 py-1.5 font-black text-right text-slate-500 uppercase text-[7px] tracking-wider">
                                                Total Items: {mergedItems.length} | Total Qty: {totalQty}
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td className="px-1.5 py-1.5 text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* ══ FOOTER: GST + TOTALS ══ */}
                            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-t border-slate-200">
                                {/* Left (GST + Amount in words) */}
                                <div className="col-span-8 flex flex-row gap-4 items-start">

                                    <div className="bg-slate-50 border border-slate-200 p-2 flex-1 rounded">
                                        <p className="text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest text-center border-b border-slate-200 pb-1">GST Summary</p>
                                        <table className="w-full text-[7px]">
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
                                                    <td className="font-black text-[7px] uppercase text-slate-900">TOT</td>
                                                    <td className="text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                                                    <td className="text-right font-black text-[#0D2B5E]">₹{totalCGST.toFixed(2)}</td>
                                                    <td className="text-right font-black text-[#0D2B5E]">₹{totalSGST.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="p-2 border border-blue-100 bg-blue-50/50 rounded">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <p className="text-[7px] text-blue-600 font-black uppercase tracking-widest leading-none mb-1 flex gap-1"><CreditCard size={9} /> Bank & UPI PayTo</p>
                                                    <div className="text-[8px] text-slate-700 font-bold space-y-0.5 leading-tight">
                                                        <p>{wholesaler?.bank_name} • A/C: {wholesaler?.bank_account}</p>
                                                        <p>IFSC: {wholesaler?.ifsc} {wholesaler?.upi_id ? `• UPI: ${wholesaler.upi_id}` : ''}</p>
                                                    </div>
                                                </div>
                                                {wholesaler?.upi_id && (
                                                    <div className="shrink-0 text-center">
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`upi://pay?pa=${wholesaler.upi_id}&pn=${encodeURIComponent(wholesaler.name || 'Merchant')}&am=${netPayable.toFixed(2)}&cu=INR`)}`}
                                                            alt="UPI QR"
                                                            className="w-[52px] h-[52px] rounded border border-blue-200"
                                                        />
                                                        <p className="text-[6px] font-bold text-blue-600 mt-0.5">Scan to Pay</p>
                                                        <p className="text-[6px] font-black text-slate-800">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-0.5">Amount in Words</p>
                                            <p className="text-[8px] font-black text-slate-900 italic uppercase leading-tight">{amountInWords(netPayable)}</p>
                                        </div>
                                    </div>

                                </div>

                                {/* Right (Totals summary) */}
                                <div className="col-span-4 flex flex-col justify-between border-l border-slate-100 pl-4">
                                    <div className="space-y-1 mt-1">
                                        {[
                                            { label: 'Gross Total', value: `₹${grossTotal.toFixed(2)}` },
                                            { label: 'Discount', value: totalDiscount > 0 ? `-₹${totalDiscount.toFixed(2)}` : '₹0.00', green: totalDiscount > 0 },
                                            { label: 'CGST', value: `₹${totalCGST.toFixed(2)}` },
                                            { label: 'SGST', value: `₹${totalSGST.toFixed(2)}` },
                                        ].map(({ label, value, green }) => (
                                            <div key={label} className="flex justify-between text-[8px] border-b border-slate-50 pb-0.5">
                                                <span className="text-slate-400 font-bold uppercase">{label}</span>
                                                <span className={`font-black ${green ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-1 border-t-2 border-[#0D2B5E] flex justify-between items-center bg-slate-50 px-2 py-1 rounded-sm">
                                            <span className="text-[8px] font-black text-[#0D2B5E] italic uppercase leading-none">Net Payable:</span>
                                            <span className="text-base font-black text-[#0D2B5E] tracking-tighter leading-none">
                                                ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right mt-4 pt-6 border-t border-dashed border-slate-300">
                                        <p className="text-[7px] font-black text-[#0D2B5E] uppercase">Authorized Signatory</p>
                                    </div>
                                </div>
                            </div>

                            {/* ══ FOOTER NOTE ══ */}
                            <div className="px-4 py-2 border-t border-slate-100 text-center">
                                <p className="text-[7px] text-slate-400 italic">
                                    This is a consolidated daily invoice merging {orders.length} order{orders.length !== 1 ? 's' : ''} placed on {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                                    Subject to terms & conditions. E&OE.
                                </p>
                            </div>

                        </div>
                    </div>
            </div>
        </div>
    );
};
