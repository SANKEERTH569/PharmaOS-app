import React, { useState, useCallback, useEffect } from 'react';
import { Order, Retailer } from '../types';
import { Printer, X, ShieldCheck, CreditCard, Download, Loader2, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { downloadPdf } from '../utils/pdfHelper';

interface InvoiceModalProps {
  order: Order;
  retailer: Retailer;
  onClose: () => void;
  /** 'drawer' = slide-in panel from right (default), 'inline' = embedded in page */
  variant?: 'drawer' | 'inline';
}

// ── Amount in words ──────────────────────────────────────────────────────────
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

// ── GST slab summary ─────────────────────────────────────────────────────────
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

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, retailer, onClose, variant = 'drawer' }) => {
  const { wholesaler } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Animate drawer open
  useEffect(() => {
    if (variant === 'drawer') {
      requestAnimationFrame(() => setIsOpen(true));
    }
  }, [variant]);

  const handleClose = useCallback(() => {
    if (variant === 'drawer') {
      setIsOpen(false);
      setTimeout(onClose, 300);
    } else {
      onClose();
    }
  }, [variant, onClose]);

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
      elementId: 'invoice-print',
      filename: `Invoice-${order.invoice_no || order.id.slice(-6)}.pdf`,
    })
      .then(() => setIsDownloading(false))
      .catch((err) => { console.error('PDF generation failed:', err); setIsDownloading(false); });
  }, [order]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById('invoice-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=800,height=1100');
    if (!win) { window.print(); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${order.invoice_no || ''}</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;min-height:297mm;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style>
    </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  }, [order]);

  /* ── Toolbar ── */
  const toolbar = (
    <div className={`px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 ${variant === 'drawer' ? 'sticky top-0 z-10' : ''}`}>
      <div className="flex items-center gap-2.5">
        {variant === 'drawer' && (
          <button onClick={handleClose} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <ChevronRight size={18} />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg bg-[#0D2B5E] flex items-center justify-center">
          <ShieldCheck className="text-white w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-[#0D2B5E] text-sm block leading-tight">Tax Invoice</span>
          <span className="text-slate-400 text-xs font-medium">{order.invoice_no || 'DRAFT'}</span>
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
        {variant === 'inline' && (
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );

  /* ── Invoice Document ── */
  const invoiceBody = (
    <div className={`overflow-y-auto bg-slate-50 flex justify-center w-full ${variant === 'drawer' ? 'flex-1 p-3 sm:p-4' : 'p-4 lg:p-6 rounded-b-xl'}`}>
      <div id="invoice-print" className={`bg-white shadow-lg flex flex-col relative overflow-hidden box-border rounded-lg border border-slate-200 ${variant === 'drawer' ? 'w-full p-4 sm:p-6' : 'w-[210mm] max-w-full p-[10mm] shrink-0'}`}>
        <div className="border border-slate-200 overflow-hidden rounded-xl">

          {/* ══ HEADER ══ */}
          <div className="bg-gradient-to-r from-[#0D2B5E] to-[#1a4a99] px-5 py-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight italic leading-tight">{wholesaler?.name}</h1>
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest mt-0.5">Pharmaceutical Wholesale Distributor</p>
              <div className="mt-2 text-blue-100 text-[9px] space-y-0.5">
                <p className="max-w-[220px] truncate">{wholesaler?.address}</p>
                <p>Ph: {wholesaler?.phone}{wholesaler?.email ? ` | ${wholesaler.email}` : ''}</p>
                <div className="flex gap-4 mt-0.5">
                  <span className="font-bold">GSTIN: <span className="text-white">{wholesaler?.gstin || '—'}</span></span>
                  <span className="font-bold">DL: <span className="text-white">{wholesaler?.dl_number || '—'}</span></span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">TAX INVOICE</h2>
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest">Original Copy</p>
              <div className="mt-2 space-y-1">
                <div className="flex gap-3 justify-end items-center">
                  <span className="text-blue-300 text-[8px] font-bold uppercase">Invoice No.:</span>
                  <span className="font-black text-[9px] text-white font-mono bg-white/10 px-1.5 rounded">{order.invoice_no || 'DRAFT'}</span>
                </div>
                <div className="flex gap-3 justify-end items-center">
                  <span className="text-blue-300 text-[8px] font-bold uppercase">Date:</span>
                  <span className="font-black text-[9px] text-white">{fmt(invoiceDate)}</span>
                </div>
                <div className="flex gap-3 justify-end items-center">
                  <span className="text-blue-300 text-[8px] font-bold uppercase">Due:</span>
                  <span className="font-black text-[9px] text-rose-300">{fmt(dueDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ BILLING ══ */}
          <div className="grid grid-cols-2 gap-3 px-5 py-3 bg-slate-50/50 border-b border-slate-200">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <p className="text-[7px] text-slate-400 uppercase font-black tracking-[0.15em] mb-1.5">Consignee (Bill To)</p>
              <p className="text-sm font-black text-[#0D2B5E] uppercase leading-tight">{retailer?.shop_name || retailer?.name}</p>
              <p className="text-slate-500 text-[9px] mt-0.5">{retailer?.name}</p>
              <div className="mt-1.5 text-slate-500 text-[9px] space-y-0.5">
                <p className="truncate">{retailer?.address || '—'}</p>
                <p className="font-bold text-slate-700">GSTIN: {retailer?.gstin || 'UNREGISTERED'}</p>
                <p>Ph: {retailer?.phone}</p>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-1.5 pl-1">
              {[
                { label: 'Order Ref', value: `#${order.id.slice(-8).toUpperCase()}`, mono: true },
                { label: 'Payment Terms', value: order.payment_terms || 'NET 15', blue: true },
                { label: 'Order Status', value: order.status, green: true },
              ].map(({ label, value, mono, blue, green }) => (
                <div key={label} className="flex justify-between text-[9px] border-b border-slate-100 pb-1">
                  <span className="text-slate-400 font-bold uppercase">{label}:</span>
                  <span className={`font-black ${blue ? 'text-blue-600' : green ? 'text-emerald-600' : 'text-slate-900'} ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ══ LINE ITEMS ══ */}
          <div className="px-5 py-3">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-[#0D2B5E] text-white">
                  <th className="px-1.5 py-2 text-center font-black">#</th>
                  <th className="px-1.5 py-2 text-center font-black">HSN</th>
                  <th className="px-2 py-2 text-left font-black uppercase">Product Name</th>
                  <th className="px-1.5 py-2 text-right font-black">Exp.</th>
                  <th className="px-1.5 py-2 text-right font-black">MRP</th>
                  <th className="px-1.5 py-2 text-right font-black">Qty</th>
                  <th className="px-1.5 py-2 text-right font-black">Rate</th>
                  <th className="px-1.5 py-2 text-right font-black">Disc %</th>
                  <th className="px-1.5 py-2 text-right font-black">Amount</th>
                  <th className="px-1.5 py-2 text-center font-black">GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const mrp = item.mrp ?? 0;
                  const rate = item.unit_price ?? 0;
                  const disc = item.discount_percent ?? 0;
                  const amount = item.taxable_value ?? ((rate * item.qty) - (item.discount_amount ?? 0));
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-1.5 py-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-1.5 py-2 text-center font-mono text-slate-500">{item.hsn_code || '3004'}</td>
                      <td className="px-2 py-2 font-black text-slate-900 uppercase">{item.medicine_name}</td>
                      <td className="px-1.5 py-2 text-right font-mono text-slate-500">{fmtExp(item.expiry_date)}</td>
                      <td className="px-1.5 py-2 text-right text-slate-500">₹{mrp.toFixed(2)}</td>
                      <td className="px-1.5 py-2 text-right font-black text-slate-900">{item.qty}</td>
                      <td className="px-1.5 py-2 text-right font-bold text-slate-700">₹{rate.toFixed(2)}</td>
                      <td className="px-1.5 py-2 text-right text-emerald-600 font-bold">{disc > 0 ? `${disc.toFixed(1)}%` : '-'}</td>
                      <td className="px-1.5 py-2 text-right font-black text-slate-900">₹{amount.toFixed(2)}</td>
                      <td className="px-1.5 py-2 text-center font-bold text-[#0D2B5E]">{item.gst_rate ?? 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={5} className="px-2 py-1.5 font-black text-right text-slate-500 uppercase text-[7px] tracking-wider">
                    Total — {order.items.length} item{order.items.length !== 1 ? 's' : ''} | Qty: {order.items.reduce((s, i) => s + i.qty, 0)}
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
          <div className="grid grid-cols-2 gap-3 px-5 py-3 border-t border-slate-200">

            {/* Left */}
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5">
                <p className="text-[7px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">GST Summary</p>
                <table className="w-full text-[8px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="pb-1 text-left font-black">Slab</th>
                      <th className="pb-1 text-right font-black">Taxable</th>
                      <th className="pb-1 text-right font-black">CGST</th>
                      <th className="pb-1 text-right font-black">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gstSummary.map(row => (
                      <tr key={row.rate}>
                        <td className="py-1 font-bold text-slate-700">{row.rate}%</td>
                        <td className="py-1 text-right">₹{row.taxable.toFixed(2)}</td>
                        <td className="py-1 text-right">₹{row.cgst.toFixed(2)}</td>
                        <td className="py-1 text-right">₹{row.sgst.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300">
                      <td className="pt-1 font-black text-[7px] uppercase text-slate-900">Total</td>
                      <td className="pt-1 text-right font-black text-[#0D2B5E]">₹{grossTotal.toFixed(2)}</td>
                      <td className="pt-1 text-right font-black text-[#0D2B5E]">₹{totalCGST.toFixed(2)}</td>
                      <td className="pt-1 text-right font-black text-[#0D2B5E]">₹{totalSGST.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Amount in Words</p>
                <p className="text-[8px] font-black text-slate-900 italic uppercase leading-tight">{amountInWords(netPayable)}</p>
              </div>

              <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/50">
                <div className="flex items-start gap-2">
                  <CreditCard size={11} className="text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[7px] text-blue-600 font-black uppercase tracking-widest mb-1">Bank & UPI Details</p>
                    <div className="text-[8px] text-slate-700 space-y-0.5">
                      <p><span className="font-bold">Bank:</span> {wholesaler?.bank_name || '—'}</p>
                      <p><span className="font-bold">A/c:</span> {wholesaler?.bank_account || '—'}</p>
                      <p><span className="font-bold">IFSC:</span> {wholesaler?.ifsc || '—'}</p>
                      {wholesaler?.upi_id && (
                        <p><span className="font-bold">UPI:</span> <span className="text-blue-700 font-black">{wholesaler.upi_id}</span></p>
                      )}
                    </div>
                  </div>
                  {wholesaler?.upi_id && (
                    <div className="shrink-0 text-center ml-1">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`upi://pay?pa=${wholesaler.upi_id}&pn=${encodeURIComponent(wholesaler.name || 'Merchant')}&am=${netPayable.toFixed(2)}&cu=INR`)}`}
                        alt="UPI QR"
                        className="w-[60px] h-[60px] rounded border border-blue-200"
                      />
                      <p className="text-[6px] font-bold text-blue-600 mt-0.5">Scan to Pay</p>
                      <p className="text-[6px] font-black text-slate-800">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Terms & Conditions</p>
                <ul className="text-[7px] text-slate-500 space-y-0.5 list-disc pl-3 italic">
                  <li>Goods once sold will not be taken back except Mfg. defects.</li>
                  <li>Bills unpaid by due date attract 18% p.a. interest. E.&O.E.</li>
                  <li>All disputes subject to local jurisdiction only.</li>
                </ul>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col">
              <div className="space-y-1.5">
                {[
                  { label: 'Gross Total', value: `₹${grossTotal.toFixed(2)}` },
                  { label: 'Discount', value: totalDiscount > 0 ? `-₹${totalDiscount.toFixed(2)}` : '₹0.00', green: totalDiscount > 0 },
                  { label: 'Add CGST', value: `₹${totalCGST.toFixed(2)}` },
                  { label: 'Add SGST', value: `₹${totalSGST.toFixed(2)}` },
                ].map(({ label, value, green }) => (
                  <div key={label} className="flex justify-between text-[9px] border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase">{label}:</span>
                    <span className={`font-black ${green ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t-2 border-[#0D2B5E] flex justify-between items-end">
                  <span className="text-[9px] font-black text-[#0D2B5E] italic uppercase leading-none">Net Payable:</span>
                  <span className="text-xl font-black text-[#0D2B5E] tracking-tighter leading-none">
                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-6 text-right">
                <p className="text-[8px] font-black text-[#0D2B5E] uppercase">For {wholesaler?.name}</p>
                <div className="h-8"></div>
                <p className="text-[7px] text-slate-400 font-bold border-t border-slate-300 pt-1 mt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  /* ── Inline variant: embedded in page flow ── */
  if (variant === 'inline') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        {toolbar}
        {invoiceBody}
      </div>
    );
  }

  /* ── Drawer variant: slide-in panel from right ── */
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
        {toolbar}
        {invoiceBody}
      </div>
    </div>
  );
};
