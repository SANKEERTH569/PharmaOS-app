
export interface Wholesaler {
  id: string;
  username?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gstin?: string;
  dl_number?: string;
  bank_name?: string;
  bank_account?: string;
  ifsc?: string;
  plan: 'starter' | 'growth' | 'pro';
}

export interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
  last_payment_date?: string;
  gstin?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  qty: number;
  mrp: number;
  unit_price: number; // Retailer Purchase Price (Net)
  discount_percent: number; // Percentage off MRP
  discount_amount: number; // Total discount amount for this line item
  total_price: number;
  hsn_code?: string;
  gst_rate: number;
  taxable_value: number;
  tax_amount: number;
}

export interface Order {
  id: string;
  invoice_no?: string;
  wholesaler_id: string;
  retailer_id: string;
  retailer_name: string;
  status: OrderStatus;
  sub_total: number; // Sum of taxable values
  tax_total: number; // Sum of tax amounts
  total_amount: number; // Grand total (sub_total + tax_total)
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  payment_terms?: string;
  notes?: string;
  wholesaler?: { id: string; name: string; phone: string };
  retailer?: { id: string; name: string; shop_name: string };
}

export type LedgerType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id: string;
  wholesaler_id: string;
  retailer_id: string;
  order_id?: string;
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
  wholesaler_id: string;
  retailer_id: string;
  retailer_name: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export interface Medicine {
  id: string;
  wholesaler_id?: string;
  name: string;
  salt: string;
  composition2?: string;
  brand: string;
  unit: string;
  pack_size?: string;
  mrp: number; // Max Retail Price
  price: number; // Wholesale/Retailer Purchase Price (Taxable Base)
  gst_rate: number; // GST % (usually 12% for most medicines)
  hsn_code: string;
  stock_qty: number;
  expiry_date?: string;
  therapeutic_class?: string;
  side_effects?: string;
  uses?: string;
  is_discontinued?: boolean;
  is_active: boolean;
}

// Lightweight type returned by catalog search (no price/stock)
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

export type SchemeType = 'BOGO' | 'HALF_SCHEME' | 'CASH_DISCOUNT';

export interface Scheme {
  id: string;
  wholesaler_id: string;
  name: string;
  type: SchemeType;
  min_qty: number | null;
  free_qty: number | null;
  discount_pct: number | null;
  medicine_id: string | null;
  medicine?: { name: string; brand: string; mrp: number; price: number };
  is_active: boolean;
  created_at: string;
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
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_gstin?: string | null;
  status: POStatus;
  notes?: string | null;
  items: POItem[];
  grns?: { id: string; grn_number: string; created_at: string }[];
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
