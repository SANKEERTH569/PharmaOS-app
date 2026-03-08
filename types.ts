
import React from 'react';

// Wholesaler interface
export interface Wholesaler {
  id: string;
  name: string;
  phone: string;
  address?: string;
  plan: 'starter' | 'growth' | 'pro';
  gstin?: string;
  dl_number?: string;
  bank_name?: string;
  bank_account?: string;
  ifsc?: string;
  upi_id?: string;
  email?: string;
}

// Admin interface
export interface Admin {
  id: string;
  username: string;
  name: string;
  email?: string;
  is_active?: boolean;
}

export type NotificationType = 'NEW_ORDER' | 'PAYMENT_RECEIVED' | 'CREDIT_LIMIT_ALERT' | 'ORDER_DELIVERED' | 'OVERDUE_REMINDER' | 'ORDER_STATUS' | 'ORDER_STATUS_CHANGED' | 'AGENCY_ACCEPTED' | 'AGENCY_REJECTED';

export interface AppNotification {
  id: string;
  wholesaler_id?: string;
  retailer_id?: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export type UserRole = 'WHOLESALER' | 'RETAILER' | 'ADMIN' | 'MAIN_WHOLESALER';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'CANCELLED';

export interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
  is_self_registered?: boolean;
  last_payment_date?: string;
  address?: string;
  gstin?: string;
}

export interface RetailerAgency {
  id: string;
  retailer_id: string;
  wholesaler_id: string;
  is_primary: boolean;
  status: string;
  created_at: string;
  wholesaler: {
    id: string;
    name: string;
    phone: string;
    address?: string;
    email?: string;
    plan?: string;
    gstin?: string;
    dl_number?: string;
  };
}

export interface WholesalerBasic {
  id: string;
  name: string;
  phone: string;
  address?: string;
  plan?: string;
}

export interface Medicine {
  id: string;
  wholesaler_id: string;
  name: string;
  salt: string;
  composition2?: string;
  brand: string;
  unit: string;
  pack_size?: string;
  mrp: number;
  price: number;
  gst_rate: number;
  hsn_code: string;
  stock_qty: number;
  expiry_date?: string;
  therapeutic_class?: string;
  side_effects?: string;
  uses?: string;
  is_discontinued?: boolean;
  rack_location?: string;
  is_active: boolean;
  wholesaler?: { id: string; name: string; phone: string };
}

export interface MedicineWithAlternatives extends Medicine {
  alternatives: Medicine[];
}

// Lightweight type returned by the catalog search API
export interface CatalogMedicine {
  id: string;
  name: string;
  salt: string | null;
  composition2: string | null;
  brand: string | null;
  unit: string;
  pack_size: string | null;
  mrp: number;
  therapeutic_class: string | null;
  side_effects: string | null;
  uses: string | null;
  is_discontinued: boolean;
}

export interface CatalogPage {
  items: CatalogMedicine[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface OrderItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  qty: number;
  mrp: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  total_price: number;
  hsn_code?: string;
  gst_rate: number;
  taxable_value: number;
  tax_amount: number;
  expiry_date?: string | null;
}

export interface CartItem {
  medicine: Medicine;
  qty: number;
}

export interface Order {
  id: string;
  invoice_no?: string;
  wholesaler_id: string; // Added to link order to a specific supplier
  retailer_id: string;
  retailer_name: string;
  status: OrderStatus;
  sub_total: number;
  tax_total: number;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  payment_terms?: string;
}

export type LedgerType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id: string;
  wholesaler_id: string; // Link to specific wholesaler
  retailer_id: string;
  type: LedgerType;
  amount: number;
  balance_after: number;
  reference_id?: string;
  description: string;
  created_at: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Payment {
  id: string;
  wholesaler_id: string; // Link to specific wholesaler
  retailer_id: string;
  retailer_name: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export type ReturnReason = 'EXPIRED' | 'DAMAGED' | 'MISSING';
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReturnItemType {
  id: string;
  medicine_name: string;
  batch_no?: string;
  expiry_date?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  reason_detail?: string;
}

export interface ReturnRequest {
  id: string;
  wholesaler_id: string;
  retailer_id: string;
  reason: ReturnReason;
  status: ReturnStatus;
  notes?: string;
  rejection_note?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: ReturnItemType[];
  retailer?: { id: string; name: string; shop_name: string; phone: string };
  wholesaler?: { id: string; name: string; phone: string };
}

export interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange';
}

export type SchemeType = 'BOGO' | 'CASH_DISCOUNT' | 'HALF_SCHEME';

export interface Scheme {
  id: string;
  wholesaler_id: string;
  name: string;
  type: SchemeType;
  min_qty: number | null;
  free_qty: number | null;
  discount_pct: number | null;
  medicine_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  medicine?: {
    id: string;
    name: string;
  };
}

// ── Purchase Orders & GRN ──────────────────────────────────────────────────

export type POStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface POItem {
  id: string;
  po_id: string;
  medicine_id: string | null;
  medicine_name: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  wholesaler_id: string;
  main_wholesaler_id?: string | null;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_gstin?: string | null;
  status: POStatus;
  notes?: string | null;
  items: POItem[];
  grns?: { id: string; grn_number: string; created_at: string }[];
  supply_order?: { id: string; so_number: string; status: SupplyOrderStatus } | null;
  created_at: string;
  updated_at: string;
}

export interface GRNItem {
  id: string;
  grn_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  unit_cost: number;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  wholesaler_id: string;
  po_id?: string | null;
  po?: { id: string; po_number: string; supplier_name: string } | null;
  supplier_name: string;
  notes?: string | null;
  items: GRNItem[];
  created_at: string;
}

// ── Main Wholesaler & Supply Orders ──────────────────────────────────────

export interface MainWholesaler {
  id: string;
  username: string;
  name: string;
  phone: string;
  address?: string | null;
  gstin?: string | null;
  dl_number?: string | null;
  is_active: boolean;
  created_at: string;
}

export type SupplyOrderStatus = 'PENDING' | 'ACCEPTED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface SupplyOrderItem {
  id: string;
  so_id: string;
  medicine_name: string;
  qty_ordered: number;
  unit_cost: number;
  total_price: number;
}

export interface SupplyOrder {
  id: string;
  so_number: string;
  wholesaler_id: string;
  wholesaler?: { id: string; name: string; phone: string; address?: string | null; gstin?: string | null };
  main_wholesaler_id: string;
  purchase_order_id?: string | null;
  purchase_order?: { id: string; po_number: string } | null;
  status: SupplyOrderStatus;
  notes?: string | null;
  total_amount: number;
  dispatch_date?: string | null;
  delivered_date?: string | null;
  items: SupplyOrderItem[];
  created_at: string;
  updated_at: string;
}
