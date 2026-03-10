import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import {
  ArrowLeft, Printer, Building2, Phone, BadgeCheck,
  MapPin, FileText, CheckCircle2, Send, XCircle, Truck,
  ShieldCheck, Landmark, PackageCheck, Download, Loader2,
  ArrowRight, ClipboardList,
} from 'lucide-react';
import { POStatus } from '../types';
import { downloadPdf } from '../utils/pdfHelper';

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
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_META: Record<POStatus, { label: string; icon: React.ElementType; dot: string }> = {
  DRAFT:              { label: 'Draft',              icon: FileText,     dot: 'bg-slate-400'   },
  SENT:               { label: 'Order Sent',         icon: Send,         dot: 'bg-amber-500'   },
  PARTIALLY_RECEIVED: { label: 'Partially Received', icon: Truck,        dot: 'bg-orange-500'  },
  RECEIVED:           { label: 'Fully Received',     icon: CheckCircle2, dot: 'bg-emerald-500' },
  CANCELLED:          { label: 'Cancelled',          icon: XCircle,      dot: 'bg-rose-500'    },
};

// Amber-rust accent (completely different from retailer's navy or MW's emerald)
const A = '#B45309'; // amber-700
const A_BG = '#FEF3C7'; // amber-100

// ─────────────────────────────────────────────────────────────────────────────

export const PurchaseOrderInvoicePage: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { purchaseOrders } = useDataStore();
  const { wholesaler } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);

  const po = useMemo(() => purchaseOrders.find(p => p.id === poId), [purchaseOrders, poId]);

  const handleDownloadPdf = useCallback(() => {
    if (!po) return;
    setIsDownloading(true);
    downloadPdf({ elementId: 'po-invoice-print', filename: `PO-Invoice-${po.po_number}.pdf` })
      .then(() => setIsDownloading(false))
      .catch(() => setIsDownloading(false));
  }, [po]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById('po-invoice-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { window.print(); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>PO Invoice ${po?.po_number || ''}</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;min-height:297mm;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style>
    </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 700);
  }, [po]);

  if (!po) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Invoice Not Found</h2>
          <p className="text-sm text-slate-400">This purchase order doesn't exist or hasn't loaded yet.</p>
        </div>
        <button onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Purchase Orders
        </button>
      </div>
    );
  }

  const { label: statusLabel, icon: StatusIcon, dot: statusDot } = STATUS_META[po.status];
  const subtotal = po.items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);
  const totalQty  = po.items.reduce((s, i) => s + i.qty_ordered, 0);
  const totalReceived = po.items.reduce((s, i) => s + i.qty_received, 0);
  const pendingQty = totalQty - totalReceived;

  return (
    <div className="space-y-0 animate-slide-up">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handleDownloadPdf} disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-60"
            style={{ backgroundColor: A }}>
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
        <div id="po-invoice-print"
          className="bg-white w-full max-w-[860px] shadow-lg rounded-xl overflow-hidden"
          style={{ border: `2px solid ${A}` }}>

          {/* ══ TOP ACCENT STRIPE + TITLE ROW ══ */}
          <div style={{ borderBottom: `4px solid ${A}` }} className="px-7 pt-6 pb-5 flex justify-between items-start bg-white">

            {/* Left: Document identity */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: A }}>
                  <ClipboardList size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: A }}>Pharmaceutical B2B</p>
                  <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Purchase Order Document</p>
                </div>
              </div>
              <h1 className="text-[38px] font-black uppercase leading-none tracking-tighter mt-1" style={{ color: A }}>
                PURCHASE<br />ORDER
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                  <StatusIcon size={10} /> {statusLabel}
                </span>
              </div>
            </div>

            {/* Right: Company details + PO ref */}
            <div className="text-right max-w-[280px]">
              <h2 className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">
                {wholesaler?.name ?? 'Wholesaler'}
              </h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Pharmaceutical Sub-Distributor · Buyer
              </p>
              <div className="text-[8px] text-slate-600 space-y-0.5 mb-3">
                {wholesaler?.address && <p>{wholesaler.address}</p>}
                {wholesaler?.phone && <p>📞 {wholesaler.phone}</p>}
                {wholesaler?.gstin && <p>GSTIN: <span className="font-mono font-black text-slate-800">{wholesaler.gstin}</span></p>}
                {wholesaler?.dl_number && <p>DL No: <span className="font-mono font-black text-slate-800">{wholesaler.dl_number}</span></p>}
              </div>
              {/* PO Ref box */}
              <div className="inline-block text-right rounded-lg p-2.5 text-[8px]" style={{ backgroundColor: A_BG, border: `1px solid ${A}30` }}>
                <div className="flex justify-between gap-6 mb-1">
                  <span className="text-slate-500 font-bold uppercase">PO Number</span>
                  <span className="font-black font-mono" style={{ color: A }}>{po.po_number}</span>
                </div>
                <div className="flex justify-between gap-6 mb-1">
                  <span className="text-slate-500 font-bold uppercase">Date</span>
                  <span className="font-black text-slate-800">{fmtDate(po.created_at)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-500 font-bold uppercase">Items</span>
                  <span className="font-black text-slate-800">{po.items.length} line{po.items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ FROM → TO PARTY FLOW ══ */}
          <div className="px-7 py-4 flex items-stretch gap-0" style={{ backgroundColor: `${A}08`, borderBottom: `1px solid ${A}25` }}>
            {/* Buyer (From) */}
            <div className="flex-1 pr-4">
              <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: A }}>▶ Ordered By (Buyer)</p>
              <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{wholesaler?.name ?? '—'}</p>
              {wholesaler?.phone && <p className="text-[8px] text-slate-500 mt-0.5">{wholesaler.phone}</p>}
              {wholesaler?.gstin && (
                <p className="text-[7px] text-slate-400 mt-0.5 font-mono">
                  GSTIN: <span className="text-slate-700 font-bold">{wholesaler.gstin}</span>
                </p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center justify-center px-4">
              <div className="flex items-center gap-1" style={{ color: A }}>
                <div className="w-12 h-px" style={{ backgroundColor: A }} />
                <ArrowRight size={14} />
              </div>
              <p className="text-[6px] font-black uppercase tracking-widest mt-1" style={{ color: A }}>SUPPLY TO</p>
            </div>

            {/* Supplier (To) */}
            <div className="flex-1 pl-4 border-l" style={{ borderColor: `${A}25` }}>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-1.5 text-slate-400">◀ Supplier (Seller)</p>
              <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{po.supplier_name}</p>
              {po.supplier_phone && <p className="text-[8px] text-slate-500 mt-0.5">{po.supplier_phone}</p>}
              {po.supplier_gstin && (
                <p className="text-[7px] text-slate-400 mt-0.5 font-mono">
                  GSTIN: <span className="text-slate-700 font-bold">{po.supplier_gstin}</span>
                </p>
              )}
            </div>
          </div>

          {/* ══ NOTE ══ */}
          {po.notes && (
            <div className="mx-7 mt-3 p-2.5 rounded-lg text-[9px] font-bold" style={{ backgroundColor: `${A_BG}`, border: `1px solid ${A}40`, color: '#78350F' }}>
              📌 {po.notes}
            </div>
          )}

          {/* ══ RECEIPT PROGRESS BAR ══ */}
          <div className="mx-7 mt-4 mb-1">
            <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-widest mb-1">
              <span style={{ color: A }}>Receipt Progress</span>
              <span className="text-slate-500">{totalReceived} of {totalQty} units received</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden" style={{ border: `1px solid ${A}20` }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: totalQty > 0 ? `${Math.min(100, (totalReceived / totalQty) * 100)}%` : '0%',
                  backgroundColor: totalReceived >= totalQty ? '#10B981' : A,
                }}
              />
            </div>
          </div>

          {/* ══ ITEMS TABLE (full-bordered grid style) ══ */}
          <div className="px-7 py-4">
            <table className="w-full text-[8px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: A, color: 'white' }}>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'center', width: '32px' }}>#</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', fontWeight: 900, textTransform: 'uppercase' }}>Medicine / Product</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'right', fontWeight: 900, textTransform: 'uppercase' }}>Ordered</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'right', fontWeight: 900, textTransform: 'uppercase' }}>Received</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'right', fontWeight: 900, textTransform: 'uppercase' }}>Pending</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'right', fontWeight: 900, textTransform: 'uppercase' }}>Rate (₹)</th>
                  <th style={{ border: `1px solid ${A}`, padding: '6px 8px', textAlign: 'right', fontWeight: 900, textTransform: 'uppercase' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, idx) => {
                  const pending = item.qty_ordered - item.qty_received;
                  const rowAmt  = item.qty_ordered * item.unit_cost;
                  return (
                    <tr key={item.id}>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                        {item.medicine_name}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                        {item.qty_ordered}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {item.qty_received > 0
                          ? <span style={{ color: item.qty_received >= item.qty_ordered ? '#059669' : '#d97706' }}>{item.qty_received}</span>
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {pending > 0
                          ? <span style={{ color: '#ef4444' }}>{pending}</span>
                          : <span style={{ color: '#10b981' }}>✓</span>}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                        {fmtMoney(item.unit_cost)}
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                        {fmtMoney(rowAmt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: A_BG }}>
                  <td colSpan={2} style={{ border: `1px solid ${A}40`, padding: '7px 8px', fontWeight: 900, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#78350F' }}>
                    TOTAL — {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ border: `1px solid ${A}40`, padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: A }}>{totalQty}</td>
                  <td style={{ border: `1px solid ${A}40`, padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>{totalReceived > 0 ? totalReceived : '—'}</td>
                  <td style={{ border: `1px solid ${A}40`, padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: '#ef4444' }}>{pendingQty > 0 ? pendingQty : '—'}</td>
                  <td style={{ border: `1px solid ${A}40` }} />
                  <td style={{ border: `1px solid ${A}40`, padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: A }}>₹{fmtMoney(subtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ══ SUMMARY CALLOUT — full width ══ */}
          <div className="mx-7 mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${A}30` }}>
            <div className="px-4 py-2 text-[7px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: A }}>
              Order Summary
            </div>
            <div className="p-4 grid grid-cols-2 gap-6" style={{ backgroundColor: `${A}06` }}>

              {/* Left: amount in words + bank + GRNs */}
              <div className="space-y-3">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Amount in Words</p>
                  <p className="text-[9px] font-black italic uppercase leading-snug" style={{ color: '#78350F' }}>
                    {amountInWords(subtotal)}
                  </p>
                </div>

                {(wholesaler?.bank_name || wholesaler?.bank_account) && (
                  <div className="p-2 rounded-lg bg-white" style={{ border: `1px solid ${A}20` }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Landmark size={9} style={{ color: A }} />
                      <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: A }}>Payment / Bank Details</p>
                    </div>
                    <div className="text-[7px] text-slate-600 space-y-0.5">
                      {wholesaler?.bank_name    && <p><span className="font-bold">Bank:</span> {wholesaler.bank_name}</p>}
                      {wholesaler?.bank_account && <p><span className="font-bold">A/c:</span> <span className="font-mono">{wholesaler.bank_account}</span></p>}
                      {wholesaler?.ifsc         && <p><span className="font-bold">IFSC:</span> <span className="font-mono">{wholesaler.ifsc}</span></p>}
                    </div>
                  </div>
                )}

                {po.grns && po.grns.length > 0 && (
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">GRN References</p>
                    <div className="flex flex-wrap gap-1">
                      {po.grns.map(grn => (
                        <span key={grn.id} className="inline-flex items-center gap-1 text-[7px] px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded font-bold">
                          <PackageCheck size={8} /> {grn.grn_number} · {fmtDate(grn.created_at)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Terms & Conditions</p>
                  <ul className="text-[7px] text-slate-400 space-y-0.5 list-disc pl-3 italic leading-relaxed">
                    <li>Goods to be supplied per listed specifications only.</li>
                    <li>Partial deliveries need delivery challan.</li>
                    <li>All invoices must quote PO: <span className="font-black not-italic text-slate-600">{po.po_number}</span>.</li>
                    <li>Quality to be verified at receipt (GRN). E.&O.E.</li>
                  </ul>
                </div>
              </div>

              {/* Right: amounts + signatures */}
              <div className="flex flex-col gap-3">
                {/* Totals */}
                <div className="rounded-lg bg-white p-3" style={{ border: `1px solid ${A}25` }}>
                  <div className="flex justify-between text-[8px] pb-1.5 mb-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                    <span className="font-black text-slate-800">₹{fmtMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[8px] pb-1.5 mb-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase">GST / Tax</span>
                    <span className="font-black text-slate-500 italic">As applicable</span>
                  </div>
                  <div className="flex justify-between text-[8px] pb-1.5 mb-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase">Qty Ordered</span>
                    <span className="font-black text-slate-800">{totalQty} units</span>
                  </div>
                  <div className="flex justify-between text-[8px] pb-2 mb-2 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase">Qty Received</span>
                    <span className={`font-black ${totalReceived >= totalQty ? 'text-emerald-600' : totalReceived > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {totalReceived} units {totalReceived >= totalQty && totalQty > 0 ? '✓' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <span className="text-[8px] font-black uppercase" style={{ color: A }}>Total Order Value</span>
                    <span className="text-[22px] font-black leading-none tracking-tighter" style={{ color: A }}>
                      ₹{fmtMoney(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Two signature columns */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="text-center">
                    <div className="h-10 border-b border-dashed border-slate-300" />
                    <p className="text-[7px] font-black uppercase mt-1" style={{ color: A }}>Buyer's Signature</p>
                    <p className="text-[6px] text-slate-400 mt-0.5">{wholesaler?.name}</p>
                  </div>
                  <div className="text-center">
                    <div className="h-10 border-b border-dashed border-slate-300" />
                    <p className="text-[7px] font-black uppercase text-slate-500 mt-1">Supplier's Signature</p>
                    <p className="text-[6px] text-slate-400 mt-0.5">{po.supplier_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ PLAIN FOOTER LINE ══ */}
          <div className="px-7 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${A}25` }}>
            <span className="text-[7px] font-bold text-slate-400">PharmaOS B2B · Purchase Order · Buyer's Copy</span>
            <span className="text-[7px] font-black font-mono" style={{ color: A }}>{po.po_number}</span>
            <span className="text-[7px] text-slate-400 font-bold">Printed: {fmtDate(new Date().toISOString())}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
