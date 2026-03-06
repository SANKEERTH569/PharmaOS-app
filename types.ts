
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

export type UserRole = 'WHOLESALER' | 'RETAILER' | 'ADMIN';

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
