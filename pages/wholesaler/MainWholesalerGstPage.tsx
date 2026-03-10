import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  FileText, Download, TrendingUp, Percent,
  Building2, Receipt, Package, IndianRupee, Calendar, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ────────────────────────────────────────────────────────────────
interface SupplyOrderItem {
  id: string;
  medicine_name: string;
  qty_ordered: number;
  unit_cost: number;
  total_price: number;
}

interface SupplyOrder {
  id: string;
  so_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: SupplyOrderItem[];
  wholesaler?: { id: string; name: string; phone?: string; address?: string; gstin?: string };
}

const DEFAULT_GST_RATE = 12;
const HSN_PHARMA = '3004';

type TabKey = 'summary' | 'gstr1' | 'hsn' | 'gstr3b' | 'buyers';

// ── Helpers ──────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────
export const MainWholesalerGstPage = () => {
  const { mainWholesaler } = useAuthStore();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  useEffect(() => {
    setLoading(true);
    api.get('/main-wholesalers/supply-orders')
      .then(({ data }) => setOrders(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered orders (only DELIVERED/DISPATCHED — GST liability on actual supply) ──
  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => o.status === 'DELIVERED' || o.status === 'DISPATCHED');
    if (selectedMonth) {
      result = result.filter(o => o.created_at.startsWith(selectedMonth));
    }
    return result;
  }, [orders, selectedMonth]);

  // ── Compute all GST metrics ──────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalTaxableValue = 0;
    let totalGst = 0;
    let totalInvoiceValue = 0;
    const invoiceCount = filteredOrders.length;

    const b2bInvoices: {
      buyerGstin: string; buyerName: string; invoiceNo: string;
      date: string; placeOfSupply: string; reverseCharge: string;
      taxableValue: number; gstRate: number;
      cgst: number; sgst: number; igst: number; invoiceValue: number;
    }[] = [];

    const hsnMap = new Map<string, {
      hsnCode: string; description: string; uqc: string;
      totalQty: number; taxableValue: number; gstRate: number;
      cgst: number; sgst: number; igst: number; totalTax: number;
    }>();

    const buyerMap = new Map<string, {
      id: string; name: string; gstin: string;
      invoiceCount: number; taxableValue: number;
      cgst: number; sgst: number; totalGst: number; totalValue: number;
      invoices: { soNumber: string; date: string; taxableValue: number; gst: number; total: number }[];
    }>();

    filteredOrders.forEach(order => {
      const gstRate = DEFAULT_GST_RATE;
      const invoiceTotal = order.total_amount;
      const taxAmount = invoiceTotal * (gstRate / (100 + gstRate));
      const taxableValue = invoiceTotal - taxAmount;
      const cgst = taxAmount / 2;
      const sgst = taxAmount / 2;

      totalTaxableValue += taxableValue;
      totalGst += taxAmount;
      totalInvoiceValue += invoiceTotal;

      b2bInvoices.push({
        buyerGstin: order.wholesaler?.gstin || 'Unregistered',
        buyerName: order.wholesaler?.name || 'Unknown',
        invoiceNo: order.so_number,
        date: new Date(order.created_at).toLocaleDateString('en-IN'),
        placeOfSupply: order.wholesaler?.gstin ? order.wholesaler.gstin.substring(0, 2) : '36',
        reverseCharge: 'N',
        taxableValue, gstRate, cgst, sgst, igst: 0, invoiceValue: invoiceTotal,
      });

      order.items.forEach(item => {
        const itemTax = item.total_price * (gstRate / (100 + gstRate));
        const itemTaxable = item.total_price - itemTax;
        const existing = hsnMap.get(HSN_PHARMA);
        if (existing) {
          existing.totalQty += item.qty_ordered;
          existing.taxableValue += itemTaxable;
          existing.cgst += itemTax / 2;
          existing.sgst += itemTax / 2;
          existing.totalTax += itemTax;
        } else {
          hsnMap.set(HSN_PHARMA, {
            hsnCode: HSN_PHARMA,
            description: 'Medicaments (mixed or unmixed) for therapeutic/prophylactic uses, in measured doses',
            uqc: 'NOS',
            totalQty: item.qty_ordered,
            taxableValue: itemTaxable,
            gstRate,
            cgst: itemTax / 2,
            sgst: itemTax / 2,
            igst: 0,
            totalTax: itemTax,
          });
        }
      });

      const buyerId = order.wholesaler?.id || 'unknown';
      const existing = buyerMap.get(buyerId);
      if (existing) {
        existing.invoiceCount += 1;
        existing.taxableValue += taxableValue;
        existing.cgst += cgst;
        existing.sgst += sgst;
        existing.totalGst += taxAmount;
        existing.totalValue += invoiceTotal;
        existing.invoices.push({
          soNumber: order.so_number, date: new Date(order.created_at).toLocaleDateString('en-IN'),
          taxableValue, gst: taxAmount, total: invoiceTotal,
        });
      } else {
        buyerMap.set(buyerId, {
          id: buyerId,
          name: order.wholesaler?.name || 'Unknown',
          gstin: order.wholesaler?.gstin || 'N/A',
          invoiceCount: 1,
          taxableValue, cgst, sgst, totalGst: taxAmount, totalValue: invoiceTotal,
          invoices: [{
            soNumber: order.so_number, date: new Date(order.created_at).toLocaleDateString('en-IN'),
            taxableValue, gst: taxAmount, total: invoiceTotal,
          }],
        });
      }
    });

    return {
      totalTaxableValue, totalGst, totalInvoiceValue, invoiceCount,
      cgst: totalGst / 2, sgst: totalGst / 2, igst: 0,
      b2bInvoices,
      hsnSummary: Array.from(hsnMap.values()),
      buyers: Array.from(buyerMap.values()).sort((a, b) => b.totalValue - a.totalValue),
      netPayable: totalGst,
    };
  }, [filteredOrders]);

  // ── Search filter for GSTR-1 ─────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return metrics.b2bInvoices;
    const q = searchQuery.toLowerCase();
    return metrics.b2bInvoices.filter(inv =>
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.buyerName.toLowerCase().includes(q) ||
      inv.buyerGstin.toLowerCase().includes(q)
    );
  }, [metrics.b2bInvoices, searchQuery]);

  // ── PDF generators ───────────────────────────────────────────────────
  const generateGSTR3BPDF = () => {
    const doc = new jsPDF();
    const fy = selectedMonth ? getFY(selectedMonth + '-01') : getFY(new Date().toISOString());

    doc.setFontSize(14);
    doc.text('Form GSTR-3B', 105, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.text('[See rule 61(5)]', 105, 20, { align: 'center' });

    autoTable(doc, {
      theme: 'grid', startY: 28,
      styles: { fontSize: 8, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      body: [
        ['1. GSTIN', mainWholesaler?.gstin || '\u2014'],
        ['2. Legal Name', mainWholesaler?.name || '\u2014'],
        ['3. Financial Year', fy],
        ['4. Tax Period', selectedMonth ? new Date(selectedMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : 'All Periods'],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text('3.1 Details of Outward Supplies and inward supplies liable to reverse charge', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Nature of Supplies', 'Total Taxable Value', 'IGST', 'CGST', 'SGST', 'Cess']],
      body: [
        ['(a) Outward taxable supplies\n(other than zero/nil rated & exempted)', fmtNum(metrics.totalTaxableValue), '0.00', fmtNum(metrics.cgst), fmtNum(metrics.sgst), '0.00'],
        ['(b) Outward taxable supplies (zero rated)', '0.00', '0.00', '-', '-', '0.00'],
        ['(c) Other outward supplies\n(Nil rated, exempted)', '0.00', '-', '-', '-', '-'],
        ['(d) Inward supplies\n(liable to reverse charge)', '0.00', '0.00', '0.00', '0.00', '0.00'],
        ['(e) Non-GST outward supplies', '0.00', '-', '-', '-', '-'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('3.2 Of the supplies shown in 3.1(a), details of inter-State supplies', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Nature of Supplies', 'Total Taxable Value', 'IGST']],
      body: [
        ['Supplies made to Unregistered Persons', '0.00', '0.00'],
        ['Supplies made to Composition Taxable Persons', '0.00', '0.00'],
        ['Supplies made to UIN holders', '0.00', '0.00'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('4. Eligible ITC', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Details', 'IGST', 'CGST', 'SGST', 'Cess']],
      body: [
        ['(A) ITC Available', '', '', '', ''],
        ['(1) Import of goods', '0.00', '0.00', '0.00', '0.00'],
        ['(2) Import of services', '0.00', '0.00', '0.00', '0.00'],
        ['(3) Inward supplies liable to reverse charge', '0.00', '0.00', '0.00', '0.00'],
        ['(4) Inward supplies from ISD', '0.00', '0.00', '0.00', '0.00'],
        ['(5) All other ITC', '0.00', '0.00', '0.00', '0.00'],
        ['(B) ITC Reversed', '', '', '', ''],
        ['(1) As per rules 42 & 43', '0.00', '0.00', '0.00', '0.00'],
        ['(2) Others', '0.00', '0.00', '0.00', '0.00'],
        ['(C) Net ITC Available (A)-(B)', '0.00', '0.00', '0.00', '0.00'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('5. Values of exempt, nil-rated and non-GST inward supplies', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Nature of Supplies', 'Inter-State', 'Intra-State']],
      body: [
        ['From a supplier under composition scheme, Exempt and Nil rated supply', '0.00', '0.00'],
        ['Non GST supply', '0.00', '0.00'],
      ],
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.text('6. Payment of Tax', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Description', 'Tax Payable', 'Paid via ITC', 'Paid in Cash', 'Interest', 'Late Fee']],
      body: [
        ['IGST', '0.00', '0.00', '0.00', '0.00', '0.00'],
        ['CGST', fmtNum(metrics.cgst), '0.00', fmtNum(metrics.cgst), '0.00', '0.00'],
        ['SGST/UTGST', fmtNum(metrics.sgst), '0.00', fmtNum(metrics.sgst), '0.00', '0.00'],
        ['Cess', '0.00', '0.00', '0.00', '0.00', '0.00'],
      ],
    });

    doc.setFontSize(50);
    doc.setTextColor(220, 220, 220);
    doc.text('DRAFT', 105, 200, { angle: 45, align: 'center' });
    doc.save(`GSTR-3B_${selectedMonth || 'ALL'}_${mainWholesaler?.name || 'wholesaler'}.pdf`);
  };

  const generateGSTR1PDF = () => {
    const doc = new jsPDF('landscape');
    const fy = selectedMonth ? getFY(selectedMonth + '-01') : getFY(new Date().toISOString());

    doc.setFontSize(14);
    doc.text('GSTR-1 \u2014 Outward Supplies Register', 148, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`GSTIN: ${mainWholesaler?.gstin || '\u2014'}  |  Name: ${mainWholesaler?.name || '\u2014'}  |  FY: ${fy}  |  Period: ${selectedMonth || 'All'}`, 148, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.text('Table 4 \u2014 B2B Invoices (Supplies to registered persons)', 14, 26);

    autoTable(doc, {
      theme: 'grid', startY: 29,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
      head: [['S.No', 'Buyer GSTIN', 'Buyer Name', 'Invoice No.', 'Date', 'POS', 'RC', 'Taxable Value', 'Rate %', 'CGST', 'SGST', 'IGST', 'Invoice Value']],
      body: metrics.b2bInvoices.map((inv, i) => [
        i + 1, inv.buyerGstin, inv.buyerName, inv.invoiceNo, inv.date, inv.placeOfSupply, inv.reverseCharge,
        fmtNum(inv.taxableValue), inv.gstRate + '%', fmtNum(inv.cgst), fmtNum(inv.sgst), '0.00', fmtNum(inv.invoiceValue),
      ]),
      foot: [['', '', '', '', '', '', 'Total', fmtNum(metrics.totalTaxableValue), '', fmtNum(metrics.cgst), fmtNum(metrics.sgst), '0.00', fmtNum(metrics.totalInvoiceValue)]],
      footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [0, 0, 0] },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Table 12 \u2014 HSN-wise Summary of Outward Supplies', 14, y);
    y += 3;

    autoTable(doc, {
      theme: 'grid', startY: y,
      styles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['HSN Code', 'Description', 'UQC', 'Total Qty', 'Taxable Value', 'Rate %', 'CGST', 'SGST', 'IGST', 'Total Tax']],
      body: metrics.hsnSummary.map(h => [
        h.hsnCode, h.description.substring(0, 40) + '...', h.uqc,
        h.totalQty, fmtNum(h.taxableValue), h.gstRate + '%',
        fmtNum(h.cgst), fmtNum(h.sgst), '0.00', fmtNum(h.totalTax),
      ]),
    });

    doc.setFontSize(50);
    doc.setTextColor(220, 220, 220);
    doc.text('DRAFT', 148, 120, { angle: 45, align: 'center' });
    doc.save(`GSTR-1_${selectedMonth || 'ALL'}_${mainWholesaler?.name || 'wholesaler'}.pdf`);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Tax Summary', icon: <TrendingUp size={15} /> },
    { key: 'gstr1', label: 'GSTR-1 (Sales)', icon: <Receipt size={15} /> },
    { key: 'hsn', label: 'HSN Summary', icon: <Package size={15} /> },
    { key: 'gstr3b', label: 'GSTR-3B', icon: <FileText size={15} /> },
    { key: 'buyers', label: 'Buyer-wise', icon: <Building2 size={15} /> },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">GST Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {mainWholesaler?.gstin
              ? <>GSTIN: <span className="font-mono font-semibold text-slate-700">{mainWholesaler.gstin}</span></>
              : <span className="text-amber-600 font-medium">GSTIN not set — update in Settings</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          <select
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">All Time</option>
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${activeTab === tab.key
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ═══ TAB: Tax Summary ═══ */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total Taxable Sales" value={fmt(metrics.totalTaxableValue)} sub={`${metrics.invoiceCount} invoices`} icon={<TrendingUp size={16} />} iconColor="text-emerald-500" />
                <StatCard label="Total GST Liability" value={fmt(metrics.totalGst)} sub="Output tax collected" icon={<Percent size={16} />} iconColor="text-violet-500" gradient />
                <StatCard label="CGST" value={fmt(metrics.cgst)} sub="Central GST @ 6%" icon={<IndianRupee size={16} />} iconColor="text-blue-500" />
                <StatCard label="SGST" value={fmt(metrics.sgst)} sub="State GST @ 6%" icon={<IndianRupee size={16} />} iconColor="text-orange-500" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Tax Collection Breakdown</h3>
                <div className="space-y-3">
                  <TaxBar label="Outward B2B Supplies (Intra-state)" taxable={metrics.totalTaxableValue} cgst={metrics.cgst} sgst={metrics.sgst} igst={0} total={metrics.totalInvoiceValue} count={metrics.invoiceCount} />
                  <TaxBar label="Inter-state Supplies" taxable={0} cgst={0} sgst={0} igst={0} total={0} count={0} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Download GSTR-1</p>
                      <p className="text-xs text-slate-500">B2B invoice register + HSN summary</p>
                    </div>
                  </div>
                  <button onClick={generateGSTR1PDF} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                    <Download size={13} /> PDF
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Download GSTR-3B</p>
                      <p className="text-xs text-slate-500">Monthly return summary</p>
                    </div>
                  </div>
                  <button onClick={generateGSTR3BPDF} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                    <Download size={13} /> PDF
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200/60 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">GST Filing Compliance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <FilingCard title="GSTR-1" subtitle="Outward supply details" dueDate="11th of next month" status="draft" />
                  <FilingCard title="GSTR-3B" subtitle="Monthly return summary" dueDate="20th of next month" status="draft" />
                  <FilingCard title="GSTR-2B" subtitle="Auto-drafted ITC statement" dueDate="Auto-generated" status="info" />
                  <FilingCard title="GSTR-9" subtitle="Annual return (yearly)" dueDate="31st December" status="info" />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: GSTR-1 (Sales Register) ═══ */}
          {activeTab === 'gstr1' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">GSTR-1 — Table 4: B2B Invoices</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Outward supplies to registered persons (buyer GSTIN available)</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" placeholder="Search invoice/buyer..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-2 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                    <button onClick={generateGSTR1PDF} className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                      <Download size={13} /> Export
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="text-left p-3">#</th>
                        <th className="text-left p-3">Buyer GSTIN</th>
                        <th className="text-left p-3">Buyer Name</th>
                        <th className="text-left p-3">Invoice No.</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-center p-3">POS</th>
                        <th className="text-center p-3">RC</th>
                        <th className="text-right p-3">Taxable</th>
                        <th className="text-right p-3">CGST</th>
                        <th className="text-right p-3">SGST</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvoices.length === 0 ? (
                        <tr><td colSpan={11} className="text-center py-10 text-slate-400">No invoices found</td></tr>
                      ) : filteredInvoices.map((inv, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-400">{i + 1}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-700">{inv.buyerGstin}</td>
                          <td className="p-3 font-medium text-slate-800">{inv.buyerName}</td>
                          <td className="p-3 font-mono text-violet-700 font-semibold">{inv.invoiceNo}</td>
                          <td className="p-3 text-slate-500">{inv.date}</td>
                          <td className="p-3 text-center text-slate-500 font-mono text-[10px]">{inv.placeOfSupply}</td>
                          <td className="p-3 text-center"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium">{inv.reverseCharge}</span></td>
                          <td className="p-3 text-right font-medium">{fmtNum(inv.taxableValue)}</td>
                          <td className="p-3 text-right text-slate-600">{fmtNum(inv.cgst)}</td>
                          <td className="p-3 text-right text-slate-600">{fmtNum(inv.sgst)}</td>
                          <td className="p-3 text-right font-bold text-slate-800">{fmtNum(inv.invoiceValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {filteredInvoices.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-xs">
                          <td colSpan={7} className="p-3 text-right text-slate-600">Total ({filteredInvoices.length} invoices)</td>
                          <td className="p-3 text-right">{fmtNum(filteredInvoices.reduce((s, inv) => s + inv.taxableValue, 0))}</td>
                          <td className="p-3 text-right">{fmtNum(filteredInvoices.reduce((s, inv) => s + inv.cgst, 0))}</td>
                          <td className="p-3 text-right">{fmtNum(filteredInvoices.reduce((s, inv) => s + inv.sgst, 0))}</td>
                          <td className="p-3 text-right">{fmtNum(filteredInvoices.reduce((s, inv) => s + inv.invoiceValue, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-2">Table 8 — Nil Rated, Exempted and Non-GST Outward Supplies</h3>
                <p className="text-xs text-slate-400 italic">No nil-rated or exempt supplies recorded for this period.</p>
              </div>

              {/* Credit / Debit Notes */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-2">Table 9 — Credit / Debit Notes (Registered)</h3>
                <p className="text-xs text-slate-500 mb-3">Adjustments issued to registered buyers for returns, rate differences, or post-sale discounts.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="text-left p-3">Buyer GSTIN</th>
                        <th className="text-left p-3">Note No.</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Original Invoice</th>
                        <th className="text-right p-3">Taxable Value</th>
                        <th className="text-right p-3">CGST</th>
                        <th className="text-right p-3">SGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td colSpan={8} className="text-center py-8 text-slate-400">No credit/debit notes issued for this period</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: HSN Summary ═══ */}
          {activeTab === 'hsn' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">GSTR-1 — Table 12: HSN-wise Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Harmonized System of Nomenclature code-wise outward supply summary</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="text-left p-3">HSN Code</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-center p-3">UQC</th>
                        <th className="text-right p-3">Total Qty</th>
                        <th className="text-right p-3">Taxable Value</th>
                        <th className="text-center p-3">Rate</th>
                        <th className="text-right p-3">CGST</th>
                        <th className="text-right p-3">SGST</th>
                        <th className="text-right p-3">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.hsnSummary.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-10 text-slate-400">No data for this period</td></tr>
                      ) : metrics.hsnSummary.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-violet-700">{h.hsnCode}</td>
                          <td className="p-3 text-slate-700 max-w-[200px] truncate">{h.description}</td>
                          <td className="p-3 text-center text-slate-500">{h.uqc}</td>
                          <td className="p-3 text-right font-medium">{h.totalQty.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium">{fmtNum(h.taxableValue)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{h.gstRate}%</span>
                          </td>
                          <td className="p-3 text-right text-slate-600">{fmtNum(h.cgst)}</td>
                          <td className="p-3 text-right text-slate-600">{fmtNum(h.sgst)}</td>
                          <td className="p-3 text-right font-bold">{fmtNum(h.totalTax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Common Pharma HSN Codes</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { code: '3001', desc: 'Glands & organs (dried)', rate: '12%' },
                    { code: '3002', desc: 'Animal blood; antisera', rate: '12%' },
                    { code: '3003', desc: 'Medicaments (not in doses)', rate: '12%' },
                    { code: '3004', desc: 'Medicaments (in doses)', rate: '12%' },
                    { code: '3005', desc: 'Bandages, first-aid kits', rate: '18%' },
                    { code: '3006', desc: 'Pharma goods (sutures)', rate: '12%' },
                    { code: '9018', desc: 'Medical instruments', rate: '12%' },
                    { code: '9402', desc: 'Medical furniture', rate: '18%' },
                  ].map(h => (
                    <div key={h.code} className="bg-white rounded-lg p-2 border border-blue-100">
                      <span className="font-mono font-bold text-blue-700">{h.code}</span>
                      <span className="ml-1.5 text-slate-600">{h.desc}</span>
                      <span className="ml-1 text-blue-500 font-semibold">({h.rate})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: GSTR-3B ═══ */}
          {activeTab === 'gstr3b' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">GSTR-3B Monthly Return</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">DRAFT</span>
                    </div>
                    <p className="text-xs text-slate-500">Summary return with outward/inward supplies & tax payable</p>
                  </div>
                </div>
                <button onClick={generateGSTR3BPDF} className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Download size={15} /> Download GSTR-3B PDF
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-5">
                  <h2 className="text-center font-bold text-lg uppercase mb-0.5">Form GSTR-3B</h2>
                  <p className="text-center text-xs text-slate-500">[See rule 61(5)]</p>
                  <div className="flex justify-center gap-6 mt-3 text-xs">
                    <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono font-semibold">{mainWholesaler?.gstin || '\u2014'}</span></div>
                    <div><span className="text-slate-500">Name:</span> <span className="font-semibold">{mainWholesaler?.name || '\u2014'}</span></div>
                    <div><span className="text-slate-500">Period:</span> <span className="font-semibold">{selectedMonth ? new Date(selectedMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : 'All'}</span></div>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {/* 3.1 */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="border border-slate-300 p-2 text-left w-[35%]">Nature of Supplies</th>
                            <th className="border border-slate-300 p-2 text-right">Taxable Value</th>
                            <th className="border border-slate-300 p-2 text-right">IGST</th>
                            <th className="border border-slate-300 p-2 text-right">CGST</th>
                            <th className="border border-slate-300 p-2 text-right">SGST</th>
                            <th className="border border-slate-300 p-2 text-right">Cess</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          <tr className="bg-white">
                            <td className="border border-slate-300 p-2">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                            <td className="border border-slate-300 p-2 text-right font-semibold">{fmtNum(metrics.totalTaxableValue)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right font-semibold">{fmtNum(metrics.cgst)}</td>
                            <td className="border border-slate-300 p-2 text-right font-semibold">{fmtNum(metrics.sgst)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                          {[
                            ['(b) Outward taxable supplies (zero rated)', '0.00', '0.00', '-', '-', '0.00'],
                            ['(c) Other outward supplies (Nil rated, exempted)', '0.00', '-', '-', '-', '-'],
                            ['(d) Inward supplies (liable to reverse charge)', '0.00', '0.00', '0.00', '0.00', '0.00'],
                            ['(e) Non-GST outward supplies', '0.00', '-', '-', '-', '-'],
                          ].map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                              {row.map((cell, j) => (
                                <td key={j} className={`border border-slate-300 p-2 ${j > 0 ? 'text-right' : ''} ${cell === '-' ? 'text-slate-300' : ''}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3.2 Inter-state supplies */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">3.2 Of the supplies shown in 3.1(a), details of inter-State supplies</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="border border-slate-300 p-2 text-left w-[50%]">Nature of Supplies</th>
                            <th className="border border-slate-300 p-2 text-right">Total Taxable Value</th>
                            <th className="border border-slate-300 p-2 text-right">IGST</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {[
                            ['Supplies made to Unregistered Persons', '0.00', '0.00'],
                            ['Supplies made to Composition Taxable Persons', '0.00', '0.00'],
                            ['Supplies made to UIN holders', '0.00', '0.00'],
                          ].map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              {row.map((cell, j) => (
                                <td key={j} className={`border border-slate-300 p-2 ${j > 0 ? 'text-right' : ''}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. ITC */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">4. Eligible ITC</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="border border-slate-300 p-2 text-left w-[35%]">Details</th>
                            <th className="border border-slate-300 p-2 text-right">IGST</th>
                            <th className="border border-slate-300 p-2 text-right">CGST</th>
                            <th className="border border-slate-300 p-2 text-right">SGST</th>
                            <th className="border border-slate-300 p-2 text-right">Cess</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          <tr className="bg-blue-50/50">
                            <td className="border border-slate-300 p-2 font-semibold" colSpan={5}>(A) ITC Available (whether in full or part)</td>
                          </tr>
                          {[
                            ['(1) Import of goods', '0.00', '0.00', '0.00', '0.00'],
                            ['(2) Import of services', '0.00', '0.00', '0.00', '0.00'],
                            ['(3) Inward supplies liable to reverse charge', '0.00', '0.00', '0.00', '0.00'],
                            ['(4) Inward supplies from ISD', '0.00', '0.00', '0.00', '0.00'],
                            ['(5) All other ITC', '0.00', '0.00', '0.00', '0.00'],
                          ].map((row, i) => (
                            <tr key={i} className="bg-white">
                              {row.map((cell, j) => (
                                <td key={j} className={`border border-slate-300 p-2 ${j > 0 ? 'text-right' : 'pl-6'}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-blue-50/50">
                            <td className="border border-slate-300 p-2 font-semibold" colSpan={5}>(B) ITC Reversed</td>
                          </tr>
                          {[
                            ['(1) As per rules 42 & 43 of CGST Rules', '0.00', '0.00', '0.00', '0.00'],
                            ['(2) Others', '0.00', '0.00', '0.00', '0.00'],
                          ].map((row, i) => (
                            <tr key={i} className="bg-white">
                              {row.map((cell, j) => (
                                <td key={j} className={`border border-slate-300 p-2 ${j > 0 ? 'text-right' : 'pl-6'}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-emerald-50 font-semibold">
                            <td className="border border-slate-300 p-2">(C) Net ITC Available (A) - (B)</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">* ITC from purchase invoices not tracked in this system. Enter manually during filing.</p>
                  </div>

                  {/* 5. Exempt, nil-rated and non-GST inward supplies */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">5. Values of exempt, nil-rated and non-GST inward supplies</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="border border-slate-300 p-2 text-left w-[50%]">Nature of Supplies</th>
                            <th className="border border-slate-300 p-2 text-right">Inter-State</th>
                            <th className="border border-slate-300 p-2 text-right">Intra-State</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {[
                            ['From a supplier under composition scheme, Exempt and Nil rated supply', '0.00', '0.00'],
                            ['Non GST supply', '0.00', '0.00'],
                          ].map((row, i) => (
                            <tr key={i} className="bg-white">
                              {row.map((cell, j) => (
                                <td key={j} className={`border border-slate-300 p-2 ${j > 0 ? 'text-right' : ''}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 6. Payment */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">6. Payment of Tax</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="border border-slate-300 p-2 text-left">Description</th>
                            <th className="border border-slate-300 p-2 text-right">Tax Payable</th>
                            <th className="border border-slate-300 p-2 text-right">Paid via ITC</th>
                            <th className="border border-slate-300 p-2 text-right">Paid in Cash</th>
                            <th className="border border-slate-300 p-2 text-right">Interest</th>
                            <th className="border border-slate-300 p-2 text-right">Late Fee</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          <tr className="bg-white">
                            <td className="border border-slate-300 p-2">IGST</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                          <tr className="bg-violet-50/50 font-semibold">
                            <td className="border border-slate-300 p-2">CGST</td>
                            <td className="border border-slate-300 p-2 text-right">{fmtNum(metrics.cgst)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">{fmtNum(metrics.cgst)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                          <tr className="bg-orange-50/50 font-semibold">
                            <td className="border border-slate-300 p-2">SGST/UTGST</td>
                            <td className="border border-slate-300 p-2 text-right">{fmtNum(metrics.sgst)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">{fmtNum(metrics.sgst)}</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-slate-300 p-2">Cess</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                            <td className="border border-slate-300 p-2 text-right">0.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Net GST Payable (Cash)</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">After ITC adjustment (ITC not tracked — full cash liability shown)</p>
                    </div>
                    <div className="text-xl font-black text-emerald-800">{fmt(metrics.netPayable)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: Buyer-wise ═══ */}
          {activeTab === 'buyers' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Buyer-wise GST Summary</h3>
                <p className="text-xs text-slate-400">Tax collected from each sub-wholesaler (registered buyer)</p>
              </div>

              {metrics.buyers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-10 text-center text-slate-400 text-sm">
                  No data for this period
                </div>
              ) : metrics.buyers.map(buyer => (
                <div key={buyer.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedBuyer(expandedBuyer === buyer.id ? null : buyer.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Building2 size={16} className="text-violet-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">{buyer.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{buyer.gstin}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">{buyer.invoiceCount} invoices</p>
                        <p className="text-sm font-bold text-slate-800">{fmt(buyer.totalValue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase">GST Collected</p>
                        <p className="text-sm font-bold text-violet-700">{fmt(buyer.totalGst)}</p>
                      </div>
                      {expandedBuyer === buyer.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {expandedBuyer === buyer.id && (
                    <div className="border-t border-slate-100 px-4 pb-4">
                      <div className="grid grid-cols-4 gap-3 py-3 text-xs">
                        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                          <p className="text-slate-500">Taxable</p>
                          <p className="font-bold text-slate-800 mt-0.5">{fmt(buyer.taxableValue)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                          <p className="text-blue-600">CGST</p>
                          <p className="font-bold text-blue-800 mt-0.5">{fmt(buyer.cgst)}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                          <p className="text-orange-600">SGST</p>
                          <p className="font-bold text-orange-800 mt-0.5">{fmt(buyer.sgst)}</p>
                        </div>
                        <div className="bg-violet-50 rounded-lg p-2.5 text-center">
                          <p className="text-violet-600">Total GST</p>
                          <p className="font-bold text-violet-800 mt-0.5">{fmt(buyer.totalGst)}</p>
                        </div>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 font-bold border-b border-slate-100">
                            <th className="text-left py-2">Invoice</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-right py-2">Taxable</th>
                            <th className="text-right py-2">GST</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {buyer.invoices.map((inv, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-2 font-mono text-violet-700 font-semibold">{inv.soNumber}</td>
                              <td className="py-2 text-slate-500">{inv.date}</td>
                              <td className="py-2 text-right">{fmtNum(inv.taxableValue)}</td>
                              <td className="py-2 text-right text-violet-600 font-medium">{fmtNum(inv.gst)}</td>
                              <td className="py-2 text-right font-bold">{fmtNum(inv.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, iconColor, gradient }: {
  label: string; value: string; sub: string; icon: React.ReactNode; iconColor: string; gradient?: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl shadow-sm border ${gradient
      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-violet-400'
      : 'bg-white border-slate-200/80'
      }`}>
      <div className="flex items-center justify-between pb-2">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${gradient ? 'text-violet-100' : 'text-slate-500'}`}>{label}</p>
        <span className={gradient ? 'text-white' : iconColor}>{icon}</span>
      </div>
      <div className={`text-xl font-black ${gradient ? 'text-white' : 'text-slate-800'}`}>{value}</div>
      <p className={`text-xs mt-1 ${gradient ? 'text-violet-200' : 'text-slate-400'}`}>{sub}</p>
    </div>
  );
}

function TaxBar({ label, taxable, cgst, sgst, igst, total, count }: {
  label: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <span className="text-[10px] text-slate-400">{count} invoices</span>
      </div>
      <div className="grid grid-cols-5 gap-2 text-[11px]">
        <div><span className="text-slate-500">Taxable:</span> <span className="font-medium">{fmt(taxable)}</span></div>
        <div><span className="text-blue-500">CGST:</span> <span className="font-medium">{fmt(cgst)}</span></div>
        <div><span className="text-orange-500">SGST:</span> <span className="font-medium">{fmt(sgst)}</span></div>
        <div><span className="text-purple-500">IGST:</span> <span className="font-medium">{fmt(igst)}</span></div>
        <div><span className="text-slate-500">Total:</span> <span className="font-bold">{fmt(total)}</span></div>
      </div>
    </div>
  );
}

function FilingCard({ title, subtitle, dueDate, status }: {
  title: string; subtitle: string; dueDate: string; status: 'draft' | 'filed' | 'info';
}) {
  const colors = {
    draft: 'bg-amber-50 border-amber-200 text-amber-700',
    filed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  const badges = { draft: 'Draft', filed: 'Filed', info: 'Auto' };
  return (
    <div className={`rounded-xl border p-3 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">{title}</span>
        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${colors[status]}`}>{badges[status]}</span>
      </div>
      <p className="text-[10px] opacity-80">{subtitle}</p>
      <p className="text-[10px] mt-1.5 font-medium">Due: {dueDate}</p>
    </div>
  );
}
