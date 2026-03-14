import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeft, Printer, Building2, Phone, BadgeCheck,
  MapPin, FileText, CheckCircle2, Send, XCircle, Truck,
  ShieldCheck, PackageCheck, Download, Loader2, Warehouse,
} from 'lucide-react';
import { SupplyOrder, SupplyOrderStatus } from '../../types';
import { downloadPdf } from '../../utils/pdfHelper';
import api from '../../utils/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens_ = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function numToWords(n: number): string {
  const num = Math.round(n);
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens_[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numToWords(num % 100) : '');
  if (num < 100000) return numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numToWords(num % 1000) : '');
  if (num < 10000000) return numToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numToWords(num % 100000) : '');
  return numToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numToWords(num % 10000000) : '');
}
function amountInWords(amount: number): string {
  const r = Math.floor(amount), p = Math.round((amount - r) * 100);
  return numToWords(r) + ' Rupees' + (p > 0 ? ' and ' + numToWords(p) + ' Paise' : '') + ' Only';
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META: Record<SupplyOrderStatus, { label: string; icon: React.ElementType; cls: string }> = {
  PENDING:    { label: 'Pending',    icon: FileText,     cls: 'bg-amber-50 text-amber-700 border-amber-300'       },
  ACCEPTED:   { label: 'Accepted',   icon: Send,         cls: 'bg-teal-50 text-teal-700 border-teal-300'          },
  DISPATCHED: { label: 'Dispatched', icon: Truck,        cls: 'bg-indigo-50 text-indigo-700 border-indigo-300'    },
  DELIVERED:  { label: 'Delivered',  icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  CANCELLED:  { label: 'Cancelled',  icon: XCircle,      cls: 'bg-rose-50 text-rose-700 border-rose-300'          },
};

// ─────────────────────────────────────────────────────────────────────────────

export const SupplyOrderInvoicePage: React.FC = () => {
  const { soId } = useParams<{ soId: string }>();
  const navigate = useNavigate();
  const { mainWholesaler } = useAuthStore();
  const [order, setOrder] = useState<SupplyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!soId) return;
    setLoading(true);
    api.get(`/main-wholesalers/supply-orders/${soId}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [soId]);

  const handleDownloadPdf = useCallback(() => {
    if (!order) return;
    setIsDownloading(true);
    downloadPdf({ elementId: 'so-invoice-print', filename: `SO-Invoice-${order.so_number}.pdf` })
      .then(() => setIsDownloading(false))
      .catch(() => setIsDownloading(false));
  }, [order]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById('so-invoice-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { window.print(); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Supply Order Invoice ${order?.so_number || ''}</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;min-height:297mm;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style>
    </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 700);
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Invoice Not Found</h2>
          <p className="text-sm text-slate-400">This supply order doesn't exist or could not be loaded.</p>
        </div>
        <button onClick={() => navigate('/wholesaler/orders')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Supply Orders
        </button>
      </div>
    );
  }

  const status = STATUS_META[order.status];
  const StatusIcon = status.icon;
  const subtotal = order.items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);
  const totalQty = order.items.reduce((s, i) => s + i.qty_ordered, 0);

  // Accent colour constants (emerald-teal palette)
  const ACCENT = '#065F46';
  const ACCENT_LIGHT = '#D1FAE5';

  return (
    <div className="space-y-0 animate-slide-up">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/wholesaler/orders')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handleDownloadPdf} disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60">
            {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {isDownloading ? 'Saving…' : 'PDF'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all shadow-sm">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* ── Invoice Document ─────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <div id="so-invoice-print"
          className="bg-white w-full max-w-[860px] border border-slate-200 shadow-lg rounded-xl overflow-hidden">

          {/* ══ HEADER BAND ══ */}
          <div style={{ background: `linear-gradient(to right, ${ACCENT}, #047857)` }} className="px-7 py-5 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Warehouse size={13} className="text-emerald-300" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Supply Order Invoice</span>
              </div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight leading-tight">
                {mainWholesaler?.name ?? 'Main Wholesaler'}
              </h1>
              <p className="text-emerald-200 text-[8px] font-bold uppercase tracking-widest mt-0.5">
                Pharmaceutical Main Distributor
              </p>
              <div className="mt-2 text-emerald-100 text-[9px] space-y-0.5">
                {mainWholesaler?.address && <p className="max-w-[300px]">{mainWholesaler.address}</p>}
                <p>Ph: {mainWholesaler?.phone ?? '—'}</p>
                <div className="flex gap-4 mt-0.5">
                  <span className="font-bold">GSTIN: <span className="text-white">{mainWholesaler?.gstin ?? '—'}</span></span>
                  {mainWholesaler?.dl_number && (
                    <span className="font-bold">DL: <span className="text-white">{mainWholesaler.dl_number}</span></span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-6">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">SUPPLY<br />ORDER</h2>
              <p className="text-emerald-200 text-[8px] font-bold uppercase tracking-widest mt-1">Seller's Copy</p>
              <div className="mt-3 space-y-1">
                {[
                  { label: 'SO Number', value: order.so_number },
                  { label: 'Date',      value: fmtDate(order.created_at) },
                  { label: 'Status',    value: status.label },
                  ...(order.dispatch_date ? [{ label: 'Dispatched', value: fmtDate(order.dispatch_date) }] : []),
                  ...(order.delivered_date ? [{ label: 'Delivered', value: fmtDate(order.delivered_date) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3 justify-end items-center">
                    <span className="text-emerald-300 text-[8px] font-bold uppercase">{label}:</span>
                    <span className="font-black text-[9px] text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ PARTIES ══ */}
          <div className="grid grid-cols-2 gap-3 px-6 py-4 bg-slate-50/50 border-b border-slate-200">

            {/* Seller — Main Wholesaler */}
            <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm">
              <p className="text-[7px] text-slate-400 uppercase font-black tracking-[0.15em] mb-2">Seller / Supplier</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: ACCENT_LIGHT }}>
                  <Building2 size={14} style={{ color: ACCENT }} />
                </div>
                <h3 className="text-sm font-black uppercase leading-tight" style={{ color: ACCENT }}>
                  {mainWholesaler?.name ?? '—'}
                </h3>
              </div>
              {mainWholesaler?.phone && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-600 mb-0.5">
                  <Phone size={10} className="text-slate-400 shrink-0" />
                  {mainWholesaler.phone}
                </div>
              )}
              {mainWholesaler?.address && (
                <div className="flex items-start gap-1.5 text-[9px] text-slate-600 mb-0.5">
                  <MapPin size={10} className="text-slate-400 shrink-0 mt-0.5" />
                  {mainWholesaler.address}
                </div>
              )}
              {mainWholesaler?.gstin && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <BadgeCheck size={10} className="text-slate-400 shrink-0" />
                  GSTIN: <span className="font-mono font-black text-slate-700 ml-1">{mainWholesaler.gstin}</span>
                </div>
              )}
              {mainWholesaler?.dl_number && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5">
                  <ShieldCheck size={10} className="text-slate-400 shrink-0" />
                  DL No: <span className="font-mono font-black text-slate-700 ml-1">{mainWholesaler.dl_number}</span>
                </div>
              )}
            </div>

            {/* Buyer — Sub-Wholesaler */}
            <div className="rounded-lg border p-3.5 shadow-sm" style={{ backgroundColor: `${ACCENT_LIGHT}40`, borderColor: `${ACCENT}25` }}>
              <p className="text-[7px] uppercase font-black tracking-[0.15em] mb-2" style={{ color: ACCENT }}>Buyer / Ordered By</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${ACCENT}20` }}>
                  <Building2 size={14} style={{ color: ACCENT }} />
                </div>
                <h3 className="text-sm font-black uppercase leading-tight" style={{ color: ACCENT }}>
                  {order.wholesaler?.name ?? '—'}
                </h3>
              </div>
              {order.wholesaler?.phone && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-600 mb-0.5">
                  <Phone size={10} className="text-slate-400 shrink-0" />
                  {order.wholesaler.phone}
                </div>
              )}
              {order.wholesaler?.address && (
                <div className="flex items-start gap-1.5 text-[9px] text-slate-600 mb-0.5">
                  <MapPin size={10} className="text-slate-400 shrink-0 mt-0.5" />
                  {order.wholesaler.address}
                </div>
              )}
              {order.wholesaler?.gstin && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                  <BadgeCheck size={10} className="text-slate-400 shrink-0" />
                  GSTIN: <span className="font-mono font-black text-slate-700 ml-1">{order.wholesaler.gstin}</span>
                </div>
              )}
            </div>
          </div>

          {/* ══ META ROW ══ */}
          <div className="flex items-center gap-6 px-6 py-2.5 bg-white border-b border-slate-100">
            {[
              { label: 'SO Number',   value: order.so_number, mono: true  },
              { label: 'Order Date',  value: fmtDate(order.created_at)    },
              { label: 'Total Items', value: `${order.items.length} item${order.items.length !== 1 ? 's' : ''}` },
              { label: 'Total Qty',   value: `${totalQty} units`          },
              ...(order.purchase_order ? [{ label: 'Linked PO', value: order.purchase_order.po_number, mono: true }] : []),
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">{label}</span>
                <span className={`font-black text-[9px] text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
              </div>
            ))}
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${status.cls}`}>
                <StatusIcon size={10} />
                {status.label}
              </span>
            </div>
          </div>

          {/* ══ NOTE ══ */}
          {order.notes && (
            <div className="mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[9px] text-amber-800 font-bold">
              📌 Note: {order.notes}
            </div>
          )}

          {/* ══ ITEMS TABLE ══ */}
          <div className="px-6 py-4">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="text-white text-left" style={{ backgroundColor: ACCENT }}>
                  <th className="px-2 py-2.5 text-center font-black rounded-tl-lg w-8">#</th>
                  <th className="px-2 py-2.5 font-black uppercase">Product / Medicine Name</th>
                  <th className="px-2 py-2.5 text-right font-black uppercase">Qty Ordered</th>
                  <th className="px-2 py-2.5 text-right font-black uppercase">Unit Price (₹)</th>
                  <th className="px-2 py-2.5 text-right font-black uppercase rounded-tr-lg">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const rowAmt = item.qty_ordered * item.unit_cost;
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-2 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-2 py-2.5 font-black text-slate-900 uppercase">{item.medicine_name}</td>
                      <td className="px-2 py-2.5 text-right font-black text-slate-800">{item.qty_ordered}</td>
                      <td className="px-2 py-2.5 text-right font-mono text-slate-700">{fmtMoney(item.unit_cost)}</td>
                      <td className="px-2 py-2.5 text-right font-black font-mono text-slate-900">{fmtMoney(rowAmt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={2} className="px-2 py-2 text-slate-400 font-black text-[7px] uppercase tracking-wider">
                    TOTAL — {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-2 py-2 text-right font-black" style={{ color: ACCENT }}>{totalQty}</td>
                  <td></td>
                  <td className="px-2 py-2 text-right font-black" style={{ color: ACCENT }}>₹{fmtMoney(subtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ══ FOOTER: TOTALS + WORDS + TERMS + SIGNATURE ══ */}
          <div className="grid grid-cols-2 gap-4 px-6 py-5 border-t border-slate-200">

            {/* Left */}
            <div className="space-y-4">

              {/* Amount in words */}
              <div>
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Amount in Words</p>
                <p className="text-[9px] font-black text-slate-900 italic uppercase leading-snug">
                  {amountInWords(subtotal)}
                </p>
              </div>

              {/* GRN / dispatch info */}
              {(order.dispatch_date || order.delivered_date) && (
                <div className="flex flex-wrap gap-1.5">
                  {order.dispatch_date && (
                    <span className="inline-flex items-center gap-1 text-[8px] px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-bold">
                      <Truck size={9} />
                      Dispatched: {fmtDate(order.dispatch_date)}
                    </span>
                  )}
                  {order.delivered_date && (
                    <span className="inline-flex items-center gap-1 text-[8px] px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded font-bold">
                      <PackageCheck size={9} />
                      Delivered: {fmtDate(order.delivered_date)}
                    </span>
                  )}
                </div>
              )}

              {/* Terms */}
              <div>
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Terms & Conditions</p>
                <ul className="text-[7px] text-slate-500 space-y-0.5 list-disc pl-3 italic leading-relaxed">
                  <li>This document confirms supply from {mainWholesaler?.name ?? 'supplier'} to the buyer noted above.</li>
                  <li>Goods once dispatched as per this order are non-returnable without prior approval.</li>
                  <li>All quantities and prices are final as agreed at order placement.</li>
                  <li>Payment terms as per existing credit agreement between parties.</li>
                  <li>All disputes subject to local jurisdiction only. E.&O.E.</li>
                </ul>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col">
              <div className="space-y-1.5 bg-slate-50 rounded-lg border border-slate-200 p-3.5">
                {[
                  { label: 'Subtotal (excl. tax)', value: `₹${fmtMoney(subtotal)}` },
                  { label: 'GST / Tax',             value: 'As applicable'          },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[9px] border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold uppercase">{label}:</span>
                    <span className="font-black text-slate-800">{value}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-end" style={{ borderTop: `2px solid ${ACCENT}` }}>
                  <span className="text-[9px] font-black uppercase italic" style={{ color: ACCENT }}>Total Order Value:</span>
                  <span className="text-2xl font-black tracking-tighter leading-none" style={{ color: ACCENT }}>
                    ₹{fmtMoney(subtotal)}
                  </span>
                </div>
                <div className="pt-1 flex justify-between text-[8px]">
                  <span className="text-slate-400">Total Qty:</span>
                  <span className="font-black text-slate-700">{totalQty} units</span>
                </div>
              </div>

              {/* Signature */}
              <div className="mt-auto pt-8 text-right">
                <p className="text-[8px] font-black uppercase" style={{ color: ACCENT }}>For {mainWholesaler?.name}</p>
                <div className="h-10 mt-1 border-b border-dashed border-slate-300" />
                <p className="text-[7px] text-slate-400 font-bold mt-1">Authorised Signatory</p>
              </div>
            </div>
          </div>

          {/* ══ DOCUMENT FOOTER BAND ══ */}
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: ACCENT }}>
            <span className="text-[8px] text-emerald-200 font-bold">Pharma Head B2B Platform · Supply Order Document</span>
            <span className="text-[8px] text-white font-black font-mono">{order.so_number}</span>
            <span className="text-[8px] text-emerald-200 font-bold">Generated: {fmtDate(new Date().toISOString())}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
