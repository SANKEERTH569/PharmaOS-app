import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import {
  FileText, Download, TrendingUp, Percent, UploadCloud, ArrowLeft, CheckCircle,
  Building2, Receipt, Package, IndianRupee, Calendar, Search, ChevronDown, ChevronUp,
  ArrowRight, ShieldCheck, ArrowDownLeft, ArrowUpRight, BarChart3, Users,
} from 'lucide-react';
import { Order, OrderItem, PurchaseOrder, GoodsReceiptNote } from '../types';
import { cn } from '../utils/cn';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── Constants ─── */
const DEFAULT_GST_RATE = 12;
const HSN_PHARMA = '3004';

type TabKey = 'summary' | 'gstr1' | 'gstr3b' | 'itc' | 'hsn' | 'buyers';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'summary', label: 'Summary', icon: BarChart3 },
  { key: 'gstr1', label: 'GSTR-1', icon: ArrowUpRight },
  { key: 'gstr3b', label: 'GSTR-3B', icon: FileText },
  { key: 'itc', label: 'ITC', icon: ArrowDownLeft },
  { key: 'hsn', label: 'HSN', icon: Package },
  { key: 'buyers', label: 'Buyers', icon: Users },
];

/* ─── Helpers ─── */
function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ value: val, label });
  }
  return opts;
}

function getFY(dateStr: string): string {
  const d = new Date(dateStr);
  const yr = d.getFullYear();
  const mo = d.getMonth();
  return mo >= 3 ? `${yr}-${(yr + 1) % 100}` : `${yr - 1}-${yr % 100}`;
}

function fmt(n: number): string {
  return '\u20B9' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Component ─── */
export const GstDashboardPage = () => {
  const { wholesaler } = useAuthStore();
  const { orders, purchaseOrders, grns, fetchPurchaseOrders, fetchGRNs } = useDataStore();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Fetch purchase orders and GRNs for ITC
  useEffect(() => {
    fetchPurchaseOrders();
    fetchGRNs();
  }, []);

  /* ─── Filter orders (outward sales) ─── */
  const filteredOrders = useMemo(() => {
    let result = orders.filter(
      (o: Order) => o.wholesaler_id === wholesaler?.id && o.status !== 'CANCELLED' && o.status !== 'REJECTED'
    );
    if (selectedMonth) {
      result = result.filter(o => o.created_at.startsWith(selectedMonth));
    }
    return result;
  }, [orders, wholesaler?.id, selectedMonth]);

  /* ─── Filter POs (inward purchases for ITC) ─── */
  const filteredPOs = useMemo(() => {
    let result = purchaseOrders.filter(
      (po: PurchaseOrder) => po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED'
    );
    if (selectedMonth) {
      result = result.filter(po => po.created_at.startsWith(selectedMonth));
    }
    return result;
  }, [purchaseOrders, selectedMonth]);

  /* ─── Filter GRNs (for ITC detail) ─── */
  const filteredGRNs = useMemo(() => {
    let result = [...grns];
    if (selectedMonth) {
      result = result.filter(g => g.created_at.startsWith(selectedMonth));
    }
    return result;
  }, [grns, selectedMonth]);

  /* ────────────────────────────────────────────────────────────
     COMPUTE: Output Tax (from sales orders to retailers)
  ──────────────────────────────────────────────────────────── */
  const outputMetrics = useMemo(() => {
    let totalTaxableValue = 0;
    let totalGst = 0;
    let totalInvoiceValue = 0;
    const invoiceCount = filteredOrders.length;

    // GSTR-1 B2B invoices
    const b2bInvoices: {
      buyerGstin: string; buyerName: string; invoiceNo: string;
      date: string; taxableValue: number; gstRate: number;
      cgst: number; sgst: number; igst: number; invoiceValue: number;
    }[] = [];

    // HSN aggregation
    const hsnMap = new Map<string, {
      hsnCode: string; description: string; uqc: string;
      totalQty: number; taxableValue: number; gstRate: number;
      cgst: number; sgst: number; igst: number; totalTax: number;
    }>();

    // Buyer aggregation
    const buyerMap = new Map<string, {
      id: string; name: string; gstin: string;
      invoiceCount: number; taxableValue: number;
      cgst: number; sgst: number; totalGst: number; totalValue: number;
      invoices: { invoiceNo: string; date: string; taxableValue: number; gst: number; total: number }[];
    }>();

    filteredOrders.forEach(order => {
      // Use per-item GST data if available, otherwise fallback to calculated
      let orderTaxable = 0;
      let orderTax = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach((item: OrderItem) => {
          const gstRate = item.gst_rate || DEFAULT_GST_RATE;
          const hsnCode = item.hsn_code || HSN_PHARMA;
          const taxable = item.taxable_value || (item.total_price / (1 + gstRate / 100));
          const tax = item.tax_amount || (taxable * gstRate / 100);
          const halfTax = tax / 2;

          orderTaxable += taxable;
          orderTax += tax;

          // HSN Map
          const existing = hsnMap.get(hsnCode);
          if (existing) {
            existing.totalQty += item.qty;
            existing.taxableValue += taxable;
            existing.cgst += halfTax;
            existing.sgst += halfTax;
            existing.totalTax += tax;
          } else {
            hsnMap.set(hsnCode, {
              hsnCode, description: item.medicine_name, uqc: 'NOS',
              totalQty: item.qty, taxableValue: taxable, gstRate,
              cgst: halfTax, sgst: halfTax, igst: 0, totalTax: tax,
            });
          }
        });
      } else {
        // Fallback: calculate from total_amount
        const gstRate = DEFAULT_GST_RATE;
        orderTax = order.total_amount * (gstRate / (100 + gstRate));
        orderTaxable = order.total_amount - orderTax;
      }

      totalTaxableValue += orderTaxable;
      totalGst += orderTax;
      totalInvoiceValue += order.total_amount;

      const halfGst = orderTax / 2;

      // B2B Invoice entry
      b2bInvoices.push({
        buyerGstin: '—',
        buyerName: order.retailer_name || 'Retailer',
        invoiceNo: order.invoice_no || order.id.slice(0, 8).toUpperCase(),
        date: new Date(order.created_at).toLocaleDateString('en-IN'),
        taxableValue: orderTaxable,
        gstRate: DEFAULT_GST_RATE,
        cgst: halfGst, sgst: halfGst, igst: 0,
        invoiceValue: order.total_amount,
      });

      // Buyer aggregation
      const buyerId = order.retailer_id;
      const existing = buyerMap.get(buyerId);
      const inv = {
        invoiceNo: order.invoice_no || order.id.slice(0, 8).toUpperCase(),
        date: new Date(order.created_at).toLocaleDateString('en-IN'),
        taxableValue: orderTaxable, gst: orderTax, total: order.total_amount,
      };
      if (existing) {
        existing.invoiceCount++;
        existing.taxableValue += orderTaxable;
        existing.cgst += halfGst;
        existing.sgst += halfGst;
        existing.totalGst += orderTax;
        existing.totalValue += order.total_amount;
        existing.invoices.push(inv);
      } else {
        buyerMap.set(buyerId, {
          id: buyerId, name: order.retailer_name || 'Retailer', gstin: '—',
          invoiceCount: 1, taxableValue: orderTaxable,
          cgst: halfGst, sgst: halfGst, totalGst: orderTax,
          totalValue: order.total_amount,
          invoices: [inv],
        });
      }
    });

    return {
      totalTaxableValue, totalGst, totalInvoiceValue, invoiceCount,
      cgst: totalGst / 2, sgst: totalGst / 2,
      b2bInvoices,
      hsnRows: Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue),
      buyers: Array.from(buyerMap.values()).sort((a, b) => b.totalValue - a.totalValue),
    };
  }, [filteredOrders]);

  /* ────────────────────────────────────────────────────────────
     COMPUTE: Input Tax Credit (from purchases/GRNs)
  ──────────────────────────────────────────────────────────── */
  const itcMetrics = useMemo(() => {
    let totalPurchaseValue = 0;
    let totalItc = 0;
    const supplierMap = new Map<string, {
      name: string; gstin: string; purchaseValue: number; itc: number; invoiceCount: number;
    }>();

    // From GRNs (more accurate — actual goods received)
    filteredGRNs.forEach(grn => {
      let grnValue = 0;
      grn.items.forEach(item => {
        grnValue += item.qty_received * item.unit_cost;
      });

      const gstRate = DEFAULT_GST_RATE;
      const taxable = grnValue / (1 + gstRate / 100);
      const tax = grnValue - taxable;

      totalPurchaseValue += grnValue;
      totalItc += tax;

      const supplier = grn.po?.supplier_name || grn.supplier_name || 'Unknown Supplier';
      const existing = supplierMap.get(supplier);
      if (existing) {
        existing.purchaseValue += grnValue;
        existing.itc += tax;
        existing.invoiceCount++;
      } else {
        supplierMap.set(supplier, {
          name: supplier, gstin: '—',
          purchaseValue: grnValue, itc: tax, invoiceCount: 1,
        });
      }
    });

    // If no GRNs, fallback to Purchase Orders
    if (filteredGRNs.length === 0) {
      filteredPOs.forEach(po => {
        let poValue = 0;
        po.items.forEach(item => {
          poValue += item.qty_received * item.unit_cost;
        });
        if (poValue === 0) {
          po.items.forEach(item => {
            poValue += item.qty_ordered * item.unit_cost;
          });
        }

        const gstRate = DEFAULT_GST_RATE;
        const taxable = poValue / (1 + gstRate / 100);
        const tax = poValue - taxable;

        totalPurchaseValue += poValue;
        totalItc += tax;

        const supplier = po.supplier_name || 'Unknown Supplier';
        const existing = supplierMap.get(supplier);
        if (existing) {
          existing.purchaseValue += poValue;
          existing.itc += tax;
          existing.invoiceCount++;
        } else {
          supplierMap.set(supplier, {
            name: supplier, gstin: po.supplier_gstin || '—',
            purchaseValue: poValue, itc: tax, invoiceCount: 1,
          });
        }
      });
    }

    return {
      totalPurchaseValue, totalItc,
      itcCgst: totalItc / 2, itcSgst: totalItc / 2,
      suppliers: Array.from(supplierMap.values()).sort((a, b) => b.itc - a.itc),
    };
  }, [filteredGRNs, filteredPOs]);

  /* ─── Net Liability ─── */
  const netLiability = {
    cgst: Math.max(0, outputMetrics.cgst - itcMetrics.itcCgst),
    sgst: Math.max(0, outputMetrics.sgst - itcMetrics.itcSgst),
    total: Math.max(0, outputMetrics.totalGst - itcMetrics.totalItc),
  };

  /* ─── PDF Export ─── */
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Form GSTR-3B', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('[See rule 61(5)]', 105, 20, { align: 'center' });

    doc.rect(14, 25, 182, 10);
    doc.text('1. GSTIN', 16, 31);
    doc.text(wholesaler?.gstin || '—', 90, 31);

    doc.rect(14, 35, 182, 10);
    doc.text('2. Legal name of the registered person', 16, 41);
    doc.text(wholesaler?.name || '—', 90, 41);

    doc.setFontSize(12);
    doc.text('3.1 Tax on outward and reverse charge inward supplies', 14, 55);

    autoTable(doc, {
      theme: 'grid', startY: 58,
      styles: { fontSize: 8, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Nature of Supplies', 'Total Taxable value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess']],
      body: [
        ['(a) Outward taxable supplies', fmtNum(outputMetrics.totalTaxableValue), '0.00', fmtNum(outputMetrics.cgst), fmtNum(outputMetrics.sgst), '0.00'],
        ['(b) Outward taxable supplies (zero rated)', '0.00', '0.00', '-', '-', '0.00'],
        ['(c) Other outward supplies (Nil rated, exempted)', '0.00', '-', '-', '-', '-'],
        ['(d) Inward supplies (liable to reverse charge)', '0.00', '0.00', '0.00', '0.00', '0.00'],
        ['(e) Non-GST outward supplies', '0.00', '-', '-', '-', '-'],
      ],
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('4. Eligible ITC', 14, y);

    autoTable(doc, {
      theme: 'grid', startY: y + 3,
      styles: { fontSize: 8, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Details', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess']],
      body: [
        ['(A) ITC Available — Import of goods', '0.00', '0.00', '0.00', '0.00'],
        ['(A) ITC Available — Import of services', '0.00', '0.00', '0.00', '0.00'],
        ['(A) ITC Available — Inward supplies from ISD', '0.00', '0.00', '0.00', '0.00'],
        ['(A) ITC Available — All other ITC', '0.00', fmtNum(itcMetrics.itcCgst), fmtNum(itcMetrics.itcSgst), '0.00'],
        ['(B) ITC Reversed', '0.00', '0.00', '0.00', '0.00'],
        ['(C) Net ITC Available (A)-(B)', '0.00', fmtNum(itcMetrics.itcCgst), fmtNum(itcMetrics.itcSgst), '0.00'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('6.1 Payment of tax', 14, y);

    autoTable(doc, {
      theme: 'grid', startY: y + 3,
      styles: { fontSize: 8, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Description', 'Tax payable', 'Paid through ITC', 'Paid in cash']],
      body: [
        ['IGST', '0.00', '0.00', '0.00'],
        ['CGST', fmtNum(outputMetrics.cgst), fmtNum(itcMetrics.itcCgst), fmtNum(netLiability.cgst)],
        ['SGST', fmtNum(outputMetrics.sgst), fmtNum(itcMetrics.itcSgst), fmtNum(netLiability.sgst)],
        ['Cess', '0.00', '0.00', '0.00'],
      ],
    });

    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.text('DRAFT', 105, 150, { angle: 45, align: 'center' });

    const period = selectedMonth || 'ALL';
    doc.save(`GSTR-3B_${period}.pdf`);
  };

  /* ─── Filtered buyers by search ─── */
  const filteredBuyers = useMemo(() => {
    if (!searchQuery.trim()) return outputMetrics.buyers;
    const q = searchQuery.toLowerCase();
    return outputMetrics.buyers.filter(b => b.name.toLowerCase().includes(q) || b.gstin.includes(q));
  }, [outputMetrics.buyers, searchQuery]);

  const selectedPeriod = selectedMonth
    ? monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth
    : 'All Time';

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">GST Returns Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Supply chain GST: Output Tax, Input Tax Credit & Net Liability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl">
            <Calendar size={13} className="text-slate-400" />
            <select
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="">All Time</option>
              {monthOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generatePDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200/50"
          >
            <Download size={13} /> GSTR-3B PDF
          </button>
        </div>
      </div>

      {/* ── Summary Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Output Tax */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpRight size={13} className="text-blue-200" />
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Output Tax</span>
            </div>
            <p className="text-xl font-black leading-none">{fmt(outputMetrics.totalGst)}</p>
            <p className="text-[10px] text-blue-200 mt-1">{outputMetrics.invoiceCount} invoices</p>
          </div>
        </div>

        {/* ITC */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownLeft size={13} className="text-emerald-200" />
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Input Tax Credit</span>
            </div>
            <p className="text-xl font-black leading-none">{fmt(itcMetrics.totalItc)}</p>
            <p className="text-[10px] text-emerald-200 mt-1">{itcMetrics.suppliers.length} supplier{itcMetrics.suppliers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Net Liability */}
        <div className={cn(
          'rounded-2xl p-4 text-white relative overflow-hidden',
          netLiability.total > 0
            ? 'bg-gradient-to-br from-rose-600 to-pink-700'
            : 'bg-gradient-to-br from-slate-700 to-slate-800'
        )}>
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-2">
              <IndianRupee size={13} className="text-white/60" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Net Payable</span>
            </div>
            <p className="text-xl font-black leading-none">{fmt(netLiability.total)}</p>
            <p className="text-[10px] text-white/60 mt-1">After ITC offset</p>
          </div>
        </div>

        {/* CGST */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net CGST</span>
          </div>
          <p className="text-xl font-black text-slate-900 leading-none">{fmt(netLiability.cgst)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{fmt(outputMetrics.cgst)} − {fmt(itcMetrics.itcCgst)}</p>
        </div>

        {/* SGST */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net SGST</span>
          </div>
          <p className="text-xl font-black text-slate-900 leading-none">{fmt(netLiability.sgst)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{fmt(outputMetrics.sgst)} − {fmt(itcMetrics.itcSgst)}</p>
        </div>
      </div>

      {/* ── Tax Flow Visual ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Tax Flow</p>
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {/* Sales */}
          <div className="flex-1 min-w-[140px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-2">
              <ArrowUpRight size={18} className="text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-slate-700">Sales (Output)</p>
            <p className="text-lg font-black text-indigo-700">{fmt(outputMetrics.totalTaxableValue)}</p>
            <p className="text-[10px] text-slate-400">Tax: {fmt(outputMetrics.totalGst)}</p>
          </div>

          <ArrowRight size={16} className="text-slate-300 shrink-0" />

          {/* Purchases */}
          <div className="flex-1 min-w-[140px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-2">
              <ArrowDownLeft size={18} className="text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-700">Purchases (ITC)</p>
            <p className="text-lg font-black text-emerald-700">{fmt(itcMetrics.totalPurchaseValue)}</p>
            <p className="text-[10px] text-slate-400">ITC: {fmt(itcMetrics.totalItc)}</p>
          </div>

          <ArrowRight size={16} className="text-slate-300 shrink-0" />

          {/* Net */}
          <div className="flex-1 min-w-[140px] text-center">
            <div className={cn(
              'w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-2',
              netLiability.total > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
            )}>
              <IndianRupee size={18} className={netLiability.total > 0 ? 'text-rose-600' : 'text-emerald-600'} />
            </div>
            <p className="text-xs font-bold text-slate-700">Net Payable</p>
            <p className={cn('text-lg font-black', netLiability.total > 0 ? 'text-rose-700' : 'text-emerald-700')}>
              {fmt(netLiability.total)}
            </p>
            <p className="text-[10px] text-slate-400">CGST: {fmt(netLiability.cgst)} + SGST: {fmt(netLiability.sgst)}</p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              <Icon size={13} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════
         TAB: Summary
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Summary breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Output breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <ArrowUpRight size={14} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800">Output Tax (Sales to Retailers)</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { label: 'Total Taxable Value', value: outputMetrics.totalTaxableValue },
                  { label: 'CGST Collected', value: outputMetrics.cgst },
                  { label: 'SGST Collected', value: outputMetrics.sgst },
                  { label: 'Total GST Collected', value: outputMetrics.totalGst, bold: true },
                  { label: 'Total Invoice Value', value: outputMetrics.totalInvoiceValue, bold: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
                    <span className={cn('text-xs', row.bold ? 'font-bold text-slate-800' : 'text-slate-500')}>{row.label}</span>
                    <span className={cn('text-sm font-mono', row.bold ? 'font-black text-indigo-700' : 'font-semibold text-slate-700')}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ITC breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <ArrowDownLeft size={14} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">Input Tax Credit (Purchases)</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { label: 'Total Purchase Value', value: itcMetrics.totalPurchaseValue },
                  { label: 'ITC — CGST', value: itcMetrics.itcCgst },
                  { label: 'ITC — SGST', value: itcMetrics.itcSgst },
                  { label: 'Total ITC Available', value: itcMetrics.totalItc, bold: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
                    <span className={cn('text-xs', row.bold ? 'font-bold text-slate-800' : 'text-slate-500')}>{row.label}</span>
                    <span className={cn('text-sm font-mono', row.bold ? 'font-black text-emerald-700' : 'font-semibold text-slate-700')}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Net Liability Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-violet-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Tax Liability ({selectedPeriod})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Output CGST', value: outputMetrics.cgst, c: 'text-blue-400' },
                { label: 'ITC CGST', value: itcMetrics.itcCgst, c: 'text-emerald-400', prefix: '−' },
                { label: 'Output SGST', value: outputMetrics.sgst, c: 'text-blue-400' },
                { label: 'ITC SGST', value: itcMetrics.itcSgst, c: 'text-emerald-400', prefix: '−' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className={cn('text-lg font-black mt-0.5', item.c)}>{(item as any).prefix || ''}{fmt(item.value)}</p>
                </div>
              ))}
            </div>
            <div className="h-px bg-white/10 my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-300">Total Net Payable (Cash)</span>
              <span className={cn('text-2xl font-black', netLiability.total > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                {fmt(netLiability.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         TAB: GSTR-1 (Outward Sales)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'gstr1' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-indigo-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">GSTR-1 — Outward Supplies</h3>
                <p className="text-[10px] text-slate-400">{outputMetrics.b2bInvoices.length} invoices for {selectedPeriod}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">#</th>
                  <th className="px-4 py-3 text-left font-bold">Invoice No</th>
                  <th className="px-4 py-3 text-left font-bold">Date</th>
                  <th className="px-4 py-3 text-left font-bold">Buyer</th>
                  <th className="px-4 py-3 text-right font-bold">Taxable</th>
                  <th className="px-4 py-3 text-right font-bold">CGST</th>
                  <th className="px-4 py-3 text-right font-bold">SGST</th>
                  <th className="px-4 py-3 text-right font-bold">Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {outputMetrics.b2bInvoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold">No invoices for this period</td></tr>
                ) : (
                  outputMetrics.b2bInvoices.map((inv, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{inv.invoiceNo}</td>
                      <td className="px-4 py-2.5 text-slate-500">{inv.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{inv.buyerName}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmtNum(inv.taxableValue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(inv.cgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(inv.sgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{fmtNum(inv.invoiceValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {outputMetrics.b2bInvoices.length > 0 && (
                <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-200">
                  <tr className="font-bold text-indigo-800">
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.totalTaxableValue)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.cgst)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.sgst)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.totalInvoiceValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         TAB: GSTR-3B (Official Form)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'gstr3b' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden text-sm">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-300">
              <h2 className="text-center font-bold text-xl uppercase mb-1">Form GSTR-3B</h2>
              <p className="text-center text-xs text-slate-500 mb-6">[See rule 61(5)]</p>
              <table className="w-full border-collapse border border-slate-400 bg-white text-sm font-semibold text-slate-800">
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 w-1/3 text-slate-600">1. GSTIN</td>
                    <td className="border border-slate-400 p-2">{wholesaler?.gstin || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2 text-slate-600">2. Name</td>
                    <td className="border border-slate-400 p-2">{wholesaler?.name || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2 text-slate-600">3. Period</td>
                    <td className="border border-slate-400 p-2">{selectedPeriod}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 overflow-x-auto space-y-8">
              {/* 3.1 Outward supplies */}
              <div>
                <h3 className="text-md font-bold text-slate-800 mb-2">3.1 Tax on outward and reverse charge inward supplies</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                  <thead className="bg-slate-200 text-slate-800 font-bold">
                    <tr>
                      <th className="border border-slate-400 p-2 w-[40%]">Nature of Supplies</th>
                      <th className="border border-slate-400 p-2 text-right">Taxable Value</th>
                      <th className="border border-slate-400 p-2 text-right">IGST</th>
                      <th className="border border-slate-400 p-2 text-right">CGST</th>
                      <th className="border border-slate-400 p-2 text-right">SGST</th>
                      <th className="border border-slate-400 p-2 text-right">Cess</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 bg-white">
                    <tr>
                      <td className="border border-slate-400 p-2">(a) Outward taxable supplies</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(outputMetrics.totalTaxableValue)}</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(outputMetrics.cgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(outputMetrics.sgst)}</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">(b) Zero rated supplies</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                      <td className="border border-slate-400 p-2 text-right text-slate-400">-</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">(c) Nil / Exempted</td>
                      <td colSpan={5} className="border border-slate-400 p-2 text-center text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">(d) Inward supplies (reverse charge)</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">(e) Non-GST outward supplies</td>
                      <td colSpan={5} className="border border-slate-400 p-2 text-center text-slate-400">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Eligible ITC */}
              <div>
                <h3 className="text-md font-bold text-slate-800 mb-2">4. Eligible ITC</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                  <thead className="bg-slate-200 text-slate-800 font-bold">
                    <tr>
                      <th className="border border-slate-400 p-2 w-[40%]">Details</th>
                      <th className="border border-slate-400 p-2 text-right">IGST</th>
                      <th className="border border-slate-400 p-2 text-right">CGST</th>
                      <th className="border border-slate-400 p-2 text-right">SGST</th>
                      <th className="border border-slate-400 p-2 text-right">Cess</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 bg-white">
                    <tr>
                      <td className="border border-slate-400 p-2">(A) ITC Available — All other ITC</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(itcMetrics.itcCgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(itcMetrics.itcSgst)}</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">(B) ITC Reversed</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr className="bg-emerald-50 font-bold">
                      <td className="border border-slate-400 p-2">(C) Net ITC Available (A)-(B)</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right text-emerald-700">{fmtNum(itcMetrics.itcCgst)}</td>
                      <td className="border border-slate-400 p-2 text-right text-emerald-700">{fmtNum(itcMetrics.itcSgst)}</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6.1 Payment of tax */}
              <div>
                <h3 className="text-md font-bold text-slate-800 mb-2">6.1 Payment of Tax</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                  <thead className="bg-slate-200 text-slate-800 font-bold">
                    <tr>
                      <th className="border border-slate-400 p-2">Description</th>
                      <th className="border border-slate-400 p-2 text-right">Tax Payable</th>
                      <th className="border border-slate-400 p-2 text-right">Paid through ITC</th>
                      <th className="border border-slate-400 p-2 text-right">Tax/Cess paid in cash</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 bg-white">
                    <tr>
                      <td className="border border-slate-400 p-2">Integrated Tax</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">Central Tax</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(outputMetrics.cgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-medium text-emerald-700">{fmtNum(itcMetrics.itcCgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-bold text-rose-700">{fmtNum(netLiability.cgst)}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">State/UT Tax</td>
                      <td className="border border-slate-400 p-2 text-right font-medium">{fmtNum(outputMetrics.sgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-medium text-emerald-700">{fmtNum(itcMetrics.itcSgst)}</td>
                      <td className="border border-slate-400 p-2 text-right font-bold text-rose-700">{fmtNum(netLiability.sgst)}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2">Cess</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                      <td className="border border-slate-400 p-2 text-right">0.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-rose-50 font-bold text-rose-800">
                    <tr>
                      <td className="border border-slate-400 p-2">TOTAL</td>
                      <td className="border border-slate-400 p-2 text-right">{fmtNum(outputMetrics.totalGst)}</td>
                      <td className="border border-slate-400 p-2 text-right">{fmtNum(itcMetrics.totalItc)}</td>
                      <td className="border border-slate-400 p-2 text-right">{fmtNum(netLiability.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         TAB: ITC (Input Tax Credit Detail)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'itc' && (
        <div className="space-y-4">
          {/* ITC Source breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Purchase Value</p>
              <p className="text-xl font-black text-emerald-800 mt-1">{fmt(itcMetrics.totalPurchaseValue)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total ITC Available</p>
              <p className="text-xl font-black text-emerald-800 mt-1">{fmt(itcMetrics.totalItc)}</p>
            </div>
            <div className={cn('rounded-2xl p-4', netLiability.total > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200')}>
              <p className={cn('text-[10px] font-bold uppercase tracking-wider', netLiability.total > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                ITC Utilised Against Output
              </p>
              <p className={cn('text-xl font-black mt-1', netLiability.total > 0 ? 'text-rose-800' : 'text-emerald-800')}>
                {fmt(Math.min(itcMetrics.totalItc, outputMetrics.totalGst))}
              </p>
            </div>
          </div>

          {/* Supplier-wise ITC */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building2 size={15} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800">Supplier-wise ITC Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">#</th>
                    <th className="px-4 py-3 text-left font-bold">Supplier</th>
                    <th className="px-4 py-3 text-left font-bold">GSTIN</th>
                    <th className="px-4 py-3 text-right font-bold">Purchase Value</th>
                    <th className="px-4 py-3 text-right font-bold">ITC CGST</th>
                    <th className="px-4 py-3 text-right font-bold">ITC SGST</th>
                    <th className="px-4 py-3 text-right font-bold">Total ITC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itcMetrics.suppliers.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">No purchase data for ITC</td></tr>
                  ) : (
                    itcMetrics.suppliers.map((s, i) => (
                      <tr key={s.name} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{s.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{s.gstin}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmtNum(s.purchaseValue)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(s.itc / 2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(s.itc / 2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">{fmtNum(s.itc)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itcMetrics.suppliers.length > 0 && (
                  <tfoot className="bg-emerald-50/50 border-t-2 border-emerald-200">
                    <tr className="font-bold text-emerald-800">
                      <td colSpan={3} className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(itcMetrics.totalPurchaseValue)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(itcMetrics.itcCgst)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(itcMetrics.itcSgst)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(itcMetrics.totalItc)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         TAB: HSN Summary
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'hsn' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Package size={15} className="text-violet-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">HSN-wise Summary of Outward Supplies</h3>
              <p className="text-[10px] text-slate-400">{outputMetrics.hsnRows.length} HSN codes</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">#</th>
                  <th className="px-4 py-3 text-left font-bold">HSN Code</th>
                  <th className="px-4 py-3 text-left font-bold">Description</th>
                  <th className="px-4 py-3 text-left font-bold">UQC</th>
                  <th className="px-4 py-3 text-right font-bold">Qty</th>
                  <th className="px-4 py-3 text-right font-bold">Taxable Value</th>
                  <th className="px-4 py-3 text-right font-bold">CGST</th>
                  <th className="px-4 py-3 text-right font-bold">SGST</th>
                  <th className="px-4 py-3 text-right font-bold">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {outputMetrics.hsnRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-semibold">No HSN data available</td></tr>
                ) : (
                  outputMetrics.hsnRows.map((h, i) => (
                    <tr key={h.hsnCode + i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-violet-700">{h.hsnCode}</td>
                      <td className="px-4 py-2.5 text-slate-700 truncate max-w-[200px]">{h.description}</td>
                      <td className="px-4 py-2.5 text-slate-500">{h.uqc}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{h.totalQty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmtNum(h.taxableValue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(h.cgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmtNum(h.sgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{fmtNum(h.totalTax)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {outputMetrics.hsnRows.length > 0 && (
                <tfoot className="bg-violet-50/50 border-t-2 border-violet-200">
                  <tr className="font-bold text-violet-800">
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {outputMetrics.hsnRows.reduce((s, h) => s + h.totalQty, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.totalTaxableValue)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.cgst)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.sgst)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(outputMetrics.totalGst)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         TAB: Buyers (Retailer-wise Breakup)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'buyers' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Search by retailer name..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users size={15} className="text-blue-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Buyer-wise (Retailer) Breakdown</h3>
                <p className="text-[10px] text-slate-400">{filteredBuyers.length} retailers</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredBuyers.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 font-semibold text-xs">No retailers found</div>
              ) : (
                filteredBuyers.map(buyer => (
                  <div key={buyer.id}>
                    <button
                      onClick={() => setExpandedBuyer(expandedBuyer === buyer.id ? null : buyer.id)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{buyer.name}</p>
                          <p className="text-[10px] text-slate-400">{buyer.invoiceCount} invoice{buyer.invoiceCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-800">{fmt(buyer.totalValue)}</p>
                          <p className="text-[10px] text-slate-400">Tax: {fmt(buyer.totalGst)}</p>
                        </div>
                        {expandedBuyer === buyer.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>

                    {expandedBuyer === buyer.id && (
                      <div className="px-5 pb-4 bg-slate-50/50">
                        <table className="w-full text-[11px]">
                          <thead className="text-slate-500 uppercase">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold">Invoice</th>
                              <th className="px-3 py-2 text-left font-bold">Date</th>
                              <th className="px-3 py-2 text-right font-bold">Taxable</th>
                              <th className="px-3 py-2 text-right font-bold">GST</th>
                              <th className="px-3 py-2 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {buyer.invoices.map((inv, j) => (
                              <tr key={j} className="hover:bg-white">
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{inv.invoiceNo}</td>
                                <td className="px-3 py-2 text-slate-500">{inv.date}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmtNum(inv.taxableValue)}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmtNum(inv.gst)}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{fmtNum(inv.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-center pb-4">
        <p className="text-[11px] text-slate-300 font-medium">
          Powered by <span className="text-indigo-400 font-bold">PharmaOS</span> · GST Compliance Engine
        </p>
      </div>
    </div>
  );
};
