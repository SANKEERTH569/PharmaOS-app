# Pharma Head — Product Requirements Document (PRD)

**Product Name:** Pharma Head  
**Version:** 0.1.4  
**Document Version:** 1.0  
**Date:** March 11, 2026  
**Classification:** Internal  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [Target Users & Personas](#4-target-users--personas)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Feature Specifications](#7-feature-specifications)
   - 7.1 [Authentication & Onboarding](#71-authentication--onboarding)
   - 7.2 [Sub-Wholesaler (Distributor) Module](#72-sub-wholesaler-distributor-module)
   - 7.3 [Retailer (Chemist) Module](#73-retailer-chemist-module)
   - 7.4 [Main Wholesaler (Super-Distributor) Module](#74-main-wholesaler-super-distributor-module)
   - 7.5 [Platform Admin Module](#75-platform-admin-module)
   - 7.6 [Real-Time Communication](#76-real-time-communication)
   - 7.7 [Printing & Document Generation](#77-printing--document-generation)
8. [Data Model](#8-data-model)
9. [API Specification](#9-api-specification)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Tech Stack](#11-tech-stack)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Future Roadmap](#13-future-roadmap)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

Pharma Head is a **full-stack B2B SaaS platform** that digitises the entire supply chain workflow of Indian pharmaceutical distribution — from the main wholesaler (super-distributor) through sub-wholesalers (distributors) down to retailers (chemist shops).

The platform replaces physical order books, manual ledgers, paper invoices, and offline payment tracking with a unified, real-time web dashboard that serves **four distinct user roles** across the pharma supply chain. It provides end-to-end coverage of inventory management, order lifecycle, financial ledger, GST compliance, payment collection, and promotional scheme management.

**Key Metrics the Platform Aims to Impact:**

| Metric | Without Pharma Head | With Pharma Head |
|--------|-----------------|---------------|
| Order placement time | 5–15 min (phone/visit) | < 2 min (digital) |
| Invoice generation | Manual (15–30 min) | Instant (auto-generated) |
| Payment reconciliation | Weekly (manual) | Real-time (auto-ledger) |
| Stock visibility | Physical count | Live dashboard |
| GST filing prep | Hours (manual) | Automated GSTR-1/3B reports |

---

## 2. Problem Statement

### Industry Context

India's pharmaceutical distribution network operates on a three-tier structure:

```
Manufacturer → Main Wholesaler (C&F / Super Stockist) → Sub-Wholesaler (Distributor) → Retailer (Chemist)
```

At the **sub-wholesaler ↔ retailer** layer — the core focus of Pharma Head — business is still conducted largely through:

- **Handwritten order books** and phone calls for order placement
- **Manual ledger registers** for tracking credit and debit balances
- **Paper-based invoices** requiring manual GST calculation
- **Physical collection trips** with no digital payment tracking
- **No real-time stock visibility** — retailers can't see what's in stock before ordering
- **No consolidated GST reporting** — filing GSTR-1/3B requires re-entry from paper records

### Pain Points by Stakeholder

| Stakeholder | Pain Points |
|-------------|-------------|
| **Sub-Wholesaler** | Manual order processing, ledger discrepancies, delayed payment collection, no stock alerts, GST filing burden, no way to manage schemes digitally |
| **Retailer** | No catalogue visibility, phone-based ordering, no order tracking, unknown outstanding balance, no payment receipts |
| **Main Wholesaler** | No visibility into sub-distributor orders, manual supply chain coordination, offline scheme management |
| **Supply Chain (overall)** | Data silos between tiers, delayed information flow, credit risk from opaque balances |

---

## 3. Product Vision & Goals

### Vision

> *"To be the operating system for every pharmaceutical sub-wholesaler in India — one platform that handles their orders, inventory, ledger, GST, and retailer relationships."*

### Product Goals

| # | Goal | Success Criteria |
|---|------|-----------------|
| G1 | Digitise the complete order-to-payment cycle | 100% of orders, invoices, and payments recorded digitally |
| G2 | Provide real-time stock & financial visibility | Live dashboards with < 5 second data freshness |
| G3 | Automate GST compliance | Auto-generated GSTR-1, GSTR-3B, and HSN summary reports |
| G4 | Enable self-service for retailers | Retailers can browse, order, track, and view ledger independently |
| G5 | Support multi-tier distribution | Main wholesaler → sub-wholesaler supply chain fully digitised |
| G6 | Reduce payment collection delays | Digital payment recording with instant ledger credit |
| G7 | Scale via SaaS model | Multi-tenant with plan-based feature gating (Starter/Growth/Pro/Enterprise) |

---

## 4. Target Users & Personas

### Persona 1: Rajesh — Sub-Wholesaler (Distributor)

| Attribute | Detail |
|-----------|--------|
| **Who** | Owner of a pharma distribution agency in a Tier-2 city |
| **Business** | Supplies 50–200 retail chemist shops |
| **Inventory** | 500–5,000 SKUs across multiple therapeutic classes |
| **Daily tasks** | Process orders, dispatch goods, collect payments, manage stock |
| **Tech comfort** | Basic smartphone + laptop user; comfortable with WhatsApp/basic apps |
| **Key need** | A single screen to see today's orders, outstanding payments, and stock levels |

### Persona 2: Priya — Retailer (Chemist)

| Attribute | Detail |
|-----------|--------|
| **Who** | Owner/pharmacist of a medical store |
| **Business** | Sources from 2–5 distributor agencies |
| **Daily tasks** | Review stock needs, place orders with wholesalers, pay outstanding dues |
| **Tech comfort** | Smartphone-first; prefers simple, mobile-friendly interfaces |
| **Key need** | Browse wholesaler catalogue, place orders in 2 minutes, see outstanding balance per agency |

### Persona 3: Vikram — Main Wholesaler (Super-Distributor)

| Attribute | Detail |
|-----------|--------|
| **Who** | C&F agent or regional super-stockist |
| **Business** | Supplies 20–100 sub-wholesaler agencies |
| **Daily tasks** | Fulfill supply orders, manage large catalogue, collect from sub-wholesalers |
| **Tech comfort** | Desktop-first operator with back-office staff |
| **Key need** | Track supply orders, manage catalogue + schemes, and view sub-wholesaler balances |

### Persona 4: Admin — Platform Operator

| Attribute | Detail |
|-----------|--------|
| **Who** | Pharma Head operations team |
| **Daily tasks** | Monitor platform health, manage wholesaler plans, handle coupons, review activity |
| **Key need** | Bird's-eye view of all wholesalers, retailers, orders, and revenue |

---

## 5. User Roles & Permissions

### 5.1 Role Hierarchy

```
ADMIN (Platform)
  └── MAIN_WHOLESALER (Super-Distributor)
        └── WHOLESALER (Sub-Distributor)
              └── RETAILER (Chemist)
```

### 5.2 Permission Matrix

| Capability | ADMIN | MAIN_WHOLESALER | WHOLESALER | RETAILER |
|-----------|:-----:|:---------------:|:----------:|:--------:|
| **Platform Management** |
| View all wholesalers | ✅ | ❌ | ❌ | ❌ |
| View all retailers | ✅ | ❌ | ❌ | ❌ |
| View all orders (cross-tenant) | ✅ | ❌ | ❌ | ❌ |
| Manage plans & coupons | ✅ | ❌ | ❌ | ❌ |
| View revenue analytics | ✅ | ❌ | ❌ | ❌ |
| Toggle wholesaler/retailer status | ✅ | ❌ | ❌ | ❌ |
| **Supply Chain (MW ↔ Wholesaler)** |
| Manage medicine catalogue | ❌ | ✅ | ❌ | ❌ |
| Create/manage schemes | ❌ | ✅ | ✅ | ❌ |
| Process supply orders | ❌ | ✅ | ❌ | ❌ |
| View sub-wholesaler ledger | ❌ | ✅ | ❌ | ❌ |
| Record MW payments | ❌ | ✅ | ❌ | ❌ |
| **Distribution (Wholesaler ↔ Retailer)** |
| Manage own medicines/inventory | ❌ | ❌ | ✅ | ❌ |
| Manage retailers | ❌ | ❌ | ✅ | ❌ |
| Process retail orders | ❌ | ❌ | ✅ | ❌ |
| Record payment collections | ❌ | ❌ | ✅ | ❌ |
| View retailer ledger | ❌ | ❌ | ✅ | ❌ |
| Create purchase orders to MW | ❌ | ❌ | ✅ | ❌ |
| Quick sale (walk-in counter) | ❌ | ❌ | ✅ | ❌ |
| Generate invoices & challans | ❌ | ❌ | ✅ | ❌ |
| GST dashboard & reports | ❌ | ✅ | ✅ | ❌ |
| Manage rack locations | ❌ | ❌ | ✅ | ❌ |
| Handle return requests | ❌ | ❌ | ✅ | ❌ |
| **Retailer Self-Service** |
| Browse marketplace | ❌ | ❌ | ❌ | ✅ |
| Place orders | ❌ | ❌ | ❌ | ✅ |
| View own orders & status | ❌ | ❌ | ❌ | ✅ |
| View own ledger & balance | ❌ | ❌ | ❌ | ✅ |
| Submit return requests | ❌ | ❌ | ❌ | ✅ |
| Manage agency connections | ❌ | ❌ | ❌ | ✅ |
| View own payment history | ❌ | ❌ | ❌ | ✅ |

---

## 6. System Architecture Overview

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                                   │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Web Dashboard    │  │  Retailer App    │  │  Admin Console    │  │
│  │  (React + Vite)   │  │  (Capacitor PWA) │  │  (React)          │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│           │                      │                      │             │
│           └──────────────────────┼──────────────────────┘             │
│                                  │                                    │
│                          REST API + WebSocket                         │
└──────────────────────────────────┼────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────────────┐
│                        SERVER TIER                                    │
│                                  │                                    │
│  ┌───────────────────────────────▼──────────────────────────────────┐│
│  │                    Express.js + Socket.IO                         ││
│  │                                                                   ││
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ ││
│  │  │ Auth MW  │  │  Routes  │  │ Services │  │ Ledger Service   │ ││
│  │  │ (JWT)    │  │  (REST)  │  │          │  │ (Transactions)   │ ││
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────────────┘ ││
│  │                                                                   ││
│  │  ┌──────────────────────────────────────────────────────────────┐││
│  │  │                  Prisma ORM                                   │││
│  │  └──────────────────────────────────────────────────────────────┘││
│  └───────────────────────────────────────────────────────────────────┘│
│                                  │                                    │
└──────────────────────────────────┼────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────────────┐
│                        DATA TIER                                      │
│                                  │                                    │
│  ┌───────────────────────────────▼──────────────────────────────────┐│
│  │                    PostgreSQL (Neon/Supabase)                      ││
│  │                    22 tables, 10 enums                            ││
│  └───────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 State Management Architecture

```
┌─────────────────────────────────────────────────┐
│                 Zustand Stores                    │
│                                                   │
│  ┌─────────────┐  ┌───────────┐  ┌────────────┐│
│  │ authStore    │  │ dataStore │  │ cartStore  ││
│  │             │  │           │  │            ││
│  │ - token     │  │- retailers│  │- items[]   ││
│  │ - userRole  │  │- medicines│  │            ││
│  │ - wholesaler│  │- orders   │  │ Persisted  ││
│  │ - retailer  │  │- ledger   │  │ to local-  ││
│  │ - admin     │  │- payments │  │ Storage    ││
│  │ - mainWS    │  │- notifs   │  │            ││
│  │             │  │- returns  │  │            ││
│  │             │  │- schemes  │  │            ││
│  │             │  │- POs/GRNs │  │            ││
│  └─────────────┘  └───────────┘  └────────────┘│
└─────────────────────────────────────────────────┘
```

---

## 7. Feature Specifications

### 7.1 Authentication & Onboarding

#### F-AUTH-01: Login Selector

**Description:** Landing page presenting four login paths — Wholesaler, Retailer, Main Wholesaler, and Admin — with distinct visual cards.

**User Flow:**
1. User visits the app → sees `LoginSelectorPage` with branded cards
2. Selects their role → navigates to role-specific login form
3. Enters credentials (username/phone + password)
4. On success → JWT stored in localStorage, socket connection established, redirected to role-appropriate dashboard

#### F-AUTH-02: Wholesaler Registration

**Description:** Self-service sign-up for new sub-wholesaler distributors.

| Field | Required | Validation |
|-------|----------|------------|
| Name | ✅ | Non-empty |
| Username | ✅ | Unique |
| Phone | ✅ | Unique, valid format |
| Password | ✅ | Min length |
| Address | ❌ | |
| GSTIN | ❌ | Valid GSTIN format |
| Drug Licence No. | ❌ | |

**Post-registration:** Auto-assigned `starter` plan. Can request upgrade later.

#### F-AUTH-03: Retailer Registration

**Description:** Two paths for retailer onboarding:

1. **Wholesaler-initiated:** Wholesaler adds retailer manually → sets initial password → retailer gets phone-based login
2. **Self-registration:** Retailer signs up independently → requests agency connection with a wholesaler → wholesaler accepts/rejects

#### F-AUTH-04: Main Wholesaler Registration

**Description:** Self-service registration for super-distributors (C&F agents). Fields: username, password, name, phone, address, GSTIN, DL number.

#### F-AUTH-05: Session Management

| Aspect | Implementation |
|--------|---------------|
| Token storage | `localStorage` (key: `pharma_token`) |
| Session restore | `initFromStorage()` on app load |
| Token attachment | Axios request interceptor adds `Authorization: Bearer <token>` |
| Auto-logout | 401 response interceptor clears session and redirects to `/login` |
| Role-based routing | `ProtectedRoute` component checks `isAuthenticated` + `userRole` |

---

### 7.2 Sub-Wholesaler (Distributor) Module

This is the **primary module** of Pharma Head — the core dashboard for pharmaceutical distributors.

#### F-WS-01: Dashboard Home

**Route:** `/`

**KPI Cards:**
| Card | Data Source | Calculation |
|------|-------------|-------------|
| Total Revenue | Delivered orders | Sum of `total_amount` for all DELIVERED orders |
| Active Retailers | Retailer directory | Count of `is_active = true` retailers |
| Pending Orders | Order status | Count of `status = PENDING` orders |
| Outstanding Balance | Retailer balances | Sum of all `current_balance` across retailers |

**Sections:**
- Revenue trend chart (Recharts line/bar chart)
- Recent orders table (latest 5-10 orders with status badges)
- Quick action buttons: New Quick Sale, View Orders, Collection, Add Medicine
- Low stock alerts summary
- Overdue payment alerts

#### F-WS-02: Order Management

**Route:** `/orders`

**Order Lifecycle:**

```
PENDING → ACCEPTED → DISPATCHED → DELIVERED
   │                                    │
   └──→ REJECTED                        └──→ (Ledger DEBIT recorded)
   │
   └──→ CANCELLED (by retailer)
```

**Features:**
| Feature | Description |
|---------|-------------|
| Order list | Filterable by status, searchable by retailer name, sorted by date |
| Status update | Wholesaler progresses order through ACCEPTED → DISPATCHED → DELIVERED |
| Stock validation | On ACCEPT: checks sufficient stock, raises alert if insufficient |
| FIFO stock deduction | Stock deducted from oldest batch first (by expiry date) on ACCEPT |
| Auto-invoice | Invoice number auto-generated on ACCEPT (format: `INV-YYMMDD-NNN`) |
| Ledger debit | On DELIVERED: retail balance debited via transactional ledger service |
| Immediate payment | Optional: record payment at delivery time to auto-credit ledger |
| Item removal | Wholesaler can remove line items from PENDING/ACCEPTED orders |
| Rejection | Wholesaler can reject order with reason; stock restored if previously deducted |

**Order Detail Page (`/orders/:orderId`):**
- Full order information with all line items
- Status timeline (visual stepper showing progression)
- Actions bar: Accept / Reject / Dispatch / Deliver buttons based on current status
- Links to Invoice, Delivery Challan, Combined Print

#### F-WS-03: Quick Sale (Counter Sale)

**Route:** `/quick-sale`

**Description:** Point-of-sale feature for walk-in counter sales or phone orders that are fulfilled immediately.

**Flow:**
1. Select retailer from dropdown
2. Search and add medicines to sale
3. Adjust quantities and discounts per line item
4. GST auto-calculated per line item based on medicine's `gst_rate`
5. Submit → creates order with status `ACCEPTED`, auto-generates invoice number
6. Stock automatically deducted via FIFO

#### F-WS-04: Medicine & Inventory Management

**Route:** `/medicines`

**Features:**
| Feature | Description |
|---------|-------------|
| Medicine list | Searchable, sortable list of all medicines with stock, MRP, price, GST rate |
| Add medicine | Manual entry with fields: name, salt/composition, brand, pack size, MRP, wholesale price, GST rate, HSN code, therapeutic class |
| Import from catalogue | Search 256K+ Indian medicine master catalogue, one-click import to own inventory |
| Batch management | Each medicine has multiple batches with batch number, expiry date, stock quantity |
| Add batch | Add new batch to existing medicine (on restock) |
| Stock alerts | Visual indicators for: Out of Stock (0), Low Stock (≤10), Expiring Soon (≤90 days) |
| Toggle active | Soft-enable/disable medicine from catalogue |
| Delete medicine | Hard delete (blocked if linked to orders or batches) |
| Rack location | Assign physical storage location (rack/shelf) for warehouse management |

**Medicine Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ | Trade/brand name |
| `salt` | String | ❌ | Generic composition (e.g., "Paracetamol 500mg") |
| `composition2` | String | ❌ | Secondary composition |
| `brand` | String | ✅ | Manufacturer/brand |
| `unit` | String | ✅ | Unit of sale (e.g., "Strip", "Bottle") |
| `pack_size` | String | ❌ | e.g., "10 tablets", "100ml" |
| `mrp` | Decimal | ✅ | Maximum Retail Price |
| `price` | Decimal | ✅ | Wholesale/retailer purchase price (taxable base) |
| `gst_rate` | Decimal | ✅ | GST percentage (typically 5%, 12%, or 18%) |
| `hsn_code` | String | ✅ | HSN code for GST classification |
| `stock_qty` | Integer | ✅ | Total stock across all batches |
| `expiry_date` | Date | ❌ | Nearest expiry across batches |
| `therapeutic_class` | String | ❌ | e.g., "CARDIAC", "ANTI INFECTIVES" |
| `rack_location` | String | ❌ | Warehouse shelf location |

#### F-WS-05: Retailer Management

**Route:** `/retailers`

**Features:**
| Feature | Description |
|---------|-------------|
| Retailer directory | List of all linked retailers with name, shop name, phone, outstanding balance |
| Add retailer | Wholesaler creates retailer account with name, shop name, phone, credit limit, address |
| Edit retailer | Update details, adjust credit limit |
| Toggle status | Activate/deactivate retailer |
| Agency requests | View and accept/reject pending agency link requests from self-registered retailers |
| Balance overview | Per-retailer outstanding balance prominently displayed |
| Set password | Activate retailer's login by setting initial password |

**Retailer Detail Page (`/retailers/:id`):**
- Profile and business information
- Ledger history (all debits and credits)
- Order history with this retailer
- Payment history
- Outstanding balance with option to record opening balance / old debt

#### F-WS-06: Financial Ledger

**Route:** `/ledger`

**Description:** Double-entry style ledger tracking all financial transactions between the wholesaler and each retailer.

**Ledger Entry Types:**

| Type | Trigger | Effect |
|------|---------|--------|
| `DEBIT` | Order delivered | Increases retailer's outstanding balance |
| `CREDIT` | Payment received | Decreases retailer's outstanding balance |
| `CREDIT` | Return approved | Decreases retailer's outstanding balance |
| `DEBIT` | Opening balance | Records pre-existing debt |

**Features:**
- Per-retailer ledger timeline (all entries sorted chronologically)
- Running balance after each entry
- Global ledger view (all entries across all retailers)
- Ledger summary (all retailers with current balances)
- Overdue detection (retailers unpaid for 30+ days)
- Opening balance entry (for migrating pre-existing debts)

**Transactional Integrity:** All ledger operations use `prisma.$transaction` to ensure atomicity — the ledger entry and balance update are always consistent.

#### F-WS-07: Payment Collection

**Route:** `/collection`

**Description:** Record cash/digital payments collected from retailers.

**Payment Methods:** `CASH` | `UPI` | `CHEQUE` | `BANK_TRANSFER`

**Flow:**
1. Select retailer from directory
2. View current outstanding balance
3. Enter payment amount, select method, add optional notes
4. Submit → creates `Payment` record, credits retailer ledger, updates retailer's `current_balance` and `last_payment_date`
5. Real-time notification sent to retailer via Socket.IO

#### F-WS-08: Payment History

**Route:** `/payments`

**Features:**
- Chronological list of all payment collections
- Filter by retailer, payment method, date range
- Per-retailer payment breakdown
- Summary statistics (total collected today, this week, this month)

#### F-WS-09: Promotional Schemes

**Route:** `/schemes`

**Scheme Types:**

| Type | Code | Description | Example |
|------|------|-------------|---------|
| Buy One Get One | `BOGO` | Buy X qty, get Y qty free | Buy 10 strips, get 2 free |
| Half Scheme | `HALF_SCHEME` | Buy min qty, get discounted qty free | Buy 12, get 6 at half price |
| Cash Discount | `CASH_DISCOUNT` | Flat percentage discount | 5% off on orders above ₹5,000 |

**Features:**
- Create scheme linked to specific medicine or all medicines
- Set minimum quantity requirements
- Activate/deactivate schemes
- Schemes visible to retailers in marketplace

#### F-WS-10: Purchase Orders (Inbound Procurement)

**Route:** `/purchase-orders`, `/purchase-orders/new`

**Description:** Wholesaler creates purchase orders to procure stock from suppliers (including Main Wholesalers on the platform).

**PO Lifecycle:**

```
DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED
  │                                       │
  └──→ CANCELLED                          └──→ (Stock auto-added to inventory)
```

**Features:**
| Feature | Description |
|---------|-------------|
| Create PO | Add supplier info, line items (medicine + qty + cost), optional link to Main Wholesaler |
| Auto-number | PO number auto-generated (format: `PO-YYMMDD-NNN`) |
| MW integration | If supplier is a Main Wholesaler, auto-adds MW medicines to wholesaler's catalogue |
| Send to MW | When PO status → SENT and linked to MW, auto-creates `SupplyOrder` on MW side |
| Receive stock | Record goods receipt: creates/upserts medicine batches, updates stock quantities |
| GRN creation | Goods Receipt Note generated with batch-level tracking |
| PO invoice | Printable PO invoice page |

#### F-WS-11: Order from Main Wholesaler

**Route:** `/order-from-wholesaler`

**Description:** Browse Main Wholesaler catalogues and place supply orders directly from the platform.

#### F-WS-12: Goods Receipt Notes (GRN)

**Description:** Track incoming goods against purchase orders.

**Features:**
- Create GRN with or without linked PO
- Line items: medicine, batch number, expiry date, quantity received, unit cost
- Auto-upserts medicine batches (creates if new batch, updates if existing)
- Updates medicine wholesale price to latest GRN cost
- Auto-updates linked PO status based on received quantities

#### F-WS-13: Returns Management

**Route:** `/returns`

**Return Reasons:** `EXPIRED` | `DAMAGED` | `MISSING`

**Return Lifecycle:**
```
PENDING → APPROVED → (Ledger CREDIT recorded, retailer balance reduced)
   │
   └──→ REJECTED (with rejection note)
```

#### F-WS-14: GST Compliance Dashboard

**Route:** `/gst`

**Tabs:**
| Tab | Content |
|-----|---------|
| **Summary** | Total taxable value, CGST, SGST, IGST, total tax for selected month |
| **GSTR-1** | Outward supplies register — all invoices with GST breakup |
| **GSTR-3B** | Consolidated monthly return summary |
| **HSN Summary** | Tax grouped by HSN code |
| **Buyer-wise** | Total tax per retailer/buyer |

**Features:**
- Month selector
- Auto-computed from delivered orders
- PDF export via jsPDF + jspdf-autotable

#### F-WS-15: Rack Manager

**Route:** `/rack-manager`

**Description:** Physical warehouse organization tool. Assign rack/shelf locations to medicines for efficient picking and dispatch.

#### F-WS-16: Settings

**Route:** `/settings`

**Tabs:**
| Tab | Fields |
|-----|--------|
| **Profile** | Business name, phone, address, email |
| **Banking** | Bank name, account number, IFSC, UPI ID |
| **Compliance** | GSTIN, Drug Licence number |

---

### 7.3 Retailer (Chemist) Module

The retailer module provides a **mobile-first, consumer-grade shopping experience** for chemists to order from their linked wholesaler agencies.

#### F-RT-01: Agency Setup

**Route:** `/shop/setup-agencies`

**Description:** First-time setup flow where retailers link to wholesaler agencies.

**Flow:**
1. Search wholesalers by name or phone
2. Send agency connection request
3. Wholesaler approves → retailer can now browse their catalogue and order
4. Mark one agency as primary supplier

**Multi-Agency Support:** Retailers can connect to multiple wholesalers and see combined marketplace.

#### F-RT-02: Marketplace

**Route:** `/shop`

**Description:** Product catalogue aggregating medicines from all linked wholesaler agencies.

**Features:**
| Feature | Description |
|---------|-------------|
| Product grid/list | Medicines from all linked wholesalers |
| Search | By medicine name, salt, brand |
| Filter | By therapeutic class, wholesaler/agency |
| Alternative suggestions | Same salt from different wholesalers shown as alternatives |
| Scheme indicators | Active BOGO/discount schemes highlighted on products |
| Stock indicators | In-stock / out-of-stock badges |
| Add to cart | Quick-add with quantity selector |

#### F-RT-03: Shopping Cart & Checkout

**Route:** `/shop/cart`

**Features:**
- Cart persisted to localStorage (survives browser refresh)
- Line items grouped by wholesaler agency
- Per-item: medicine name, qty, unit price, GST, subtotal
- GST breakdown (CGST + SGST) shown per line item
- Total with tax calculation
- Credit limit check before order placement
- Place order → creates order per wholesaler, notifies wholesaler via Socket.IO

#### F-RT-04: Order History

**Route:** `/shop/orders`

**Features:**
- List of all placed orders with status badges (PENDING / ACCEPTED / DISPATCHED / DELIVERED)
- Status timeline per order
- Cancel pending orders
- Real-time status updates via Socket.IO

#### F-RT-05: Return Requests

**Route:** `/shop/returns`

**Features:**
- Submit return request with reason (EXPIRED / DAMAGED / MISSING)
- Add items with batch number, expiry date, quantity, unit price
- Track return status (PENDING / APPROVED / REJECTED)
- View rejection notes from wholesaler

#### F-RT-06: Ledger & Balance

**Route:** `/shop/ledger`

**Features:**
- Per-agency outstanding balance summary
- Global credit limit and current balance
- Transaction history per wholesaler (debits from orders, credits from payments)

#### F-RT-07: Payment History

**Route:** `/shop/payments`

**Features:**
- List of all payments made to wholesalers
- Filter by agency, method, status
- View running balance after each payment

#### F-RT-08: Notifications

**Route:** `/shop/notifications`

**Notification Types:**
| Type | Trigger |
|------|---------|
| `ORDER_STATUS_CHANGED` | Wholesaler updates order status |
| `ORDER_DELIVERED` | Order marked as delivered |
| `PAYMENT_RECEIVED` | Payment confirmed by wholesaler |
| `AGENCY_ACCEPTED` | Agency link request approved |
| `AGENCY_REJECTED` | Agency link request rejected |
| `CREDIT_LIMIT_ALERT` | Balance approaching credit limit |
| `OVERDUE_REMINDER` | Payment overdue notification |

**Features:**
- Real-time push via Socket.IO
- Mark as read (individual / mark all)
- Unread badge count in navigation

#### F-RT-09: Profile

**Route:** `/shop/profile`

**Features:**
- View account details (name, shop name, phone, address, GSTIN, DL number)
- Edit restricted fields
- View credit limit and current balance

---

### 7.4 Main Wholesaler (Super-Distributor) Module

The main wholesaler module provides the **upstream supply chain** management for super-distributors.

#### F-MW-01: Dashboard

**Route:** `/wholesaler`

**KPI Cards:**
| Card | Description |
|------|-------------|
| Total Supply Orders | Count of all supply orders |
| Revenue (This Month) | Sum of DELIVERED supply orders for current month |
| Active Catalogue Items | Count of active medicines |
| Low Stock Items | Count of medicines with stock ≤ 10 |

**Sections:**
- Recent supply orders
- Revenue chart
- Catalogue health (active, low stock, near expiry)
- Top products by order volume
- Navigation cards to all modules

#### F-MW-02: Supply Order Management

**Route:** `/wholesaler/orders`

**Supply Order Lifecycle:**

```
PENDING → ACCEPTED → DISPATCHED → DELIVERED
   │                                    │
   └──→ CANCELLED                       └──→ (Sub-wholesaler ledger DEBIT)
                                              (Linked PO auto-marked RECEIVED)
```

**Features:**
- Status pipeline with counts per status
- Search by sub-wholesaler name
- Status transitions with validation (must follow sequence)
- On DELIVERED: debit sub-wholesaler ledger, auto-mark linked PO as received
- Supply order invoice generation

#### F-MW-03: Medicine Catalogue

**Route:** `/wholesaler/catalog`

**Features:**
- Full CRUD for MW medicine catalogue
- Fields: medicine name, brand, MRP, wholesale price, stock, batch, expiry, GST rate, HSN code, unit type
- Medicine type detection (tablet/syrup/injection/cream/inhaler/powder) for UI icons
- Paginated browse with search
- Active/inactive toggle

#### F-MW-04: Scheme Management

**Route:** `/wholesaler/main-schemes`

Same scheme types as sub-wholesaler (BOGO, HALF_SCHEME, CASH_DISCOUNT), but scoped to main wholesaler's catalogue. Visible to sub-wholesalers when browsing MW catalogue for procurement.

#### F-MW-05: Sub-Wholesaler Directory

**Route:** `/wholesaler/sub-wholesalers`

**Features:**
- Read-only list of all sub-wholesalers who have placed orders
- Display: name, phone, address, GSTIN, DL number, active status
- Search by name or phone

#### F-MW-06: Financial Ledger

**Route:** `/wholesaler/main-ledger`

- All DEBIT/CREDIT entries across sub-wholesalers
- Filter by sub-wholesaler
- Running balance per entry
- Per-sub-wholesaler statement view

#### F-MW-07: Payment Collection

**Route:** `/wholesaler/collection`

- View outstanding balances per sub-wholesaler
- Record payment (amount + method)
- Auto-credit sub-wholesaler ledger
- Tabs: outstanding / cleared / all

#### F-MW-08: Payment History

**Route:** `/wholesaler/main-payments`

- All incoming payments from sub-wholesalers
- Filter by wholesaler, method, status
- Summary cards (today/this-month totals)

#### F-MW-09: GST Dashboard

**Route:** `/wholesaler/gst`

Same as sub-wholesaler GST module (GSTR-1, GSTR-3B, HSN Summary, Buyer-wise) but computed from delivered supply orders.

#### F-MW-10: Stock Alerts

**Route:** `/wholesaler/alerts`

**Alert Categories:**
| Category | Criteria |
|----------|----------|
| Expired | `expiry_date` < today |
| Expiring Soon | `expiry_date` within 90 days |
| Out of Stock | `stock_qty` = 0 |
| Low Stock | `stock_qty` ≤ 10 |

**Features:**
- Tab-based filtering
- Search within alerts
- Summary counts per category

#### F-MW-11: Settings

**Route:** `/wholesaler/settings`

- Profile tab: name, phone, address, GSTIN, DL number
- Notifications preferences
- Security settings

---

### 7.5 Platform Admin Module

#### F-AD-01: Admin Dashboard

**Route:** `/admin`

**Platform-Wide Statistics:**
| Stat | Description |
|------|-------------|
| Total Wholesalers | All registered sub-wholesalers |
| Total Retailers | All registered retailers |
| Total Orders | All orders across platform |
| Total Revenue | Sum of all delivered order amounts |
| Plan Distribution | Breakdown by Starter/Growth/Pro/Enterprise |
| Monthly Revenue | Last 6 months revenue chart |

#### F-AD-02: Wholesaler Management

**Route:** `/admin/wholesalers`

**Features:**
- List all wholesalers with search and filter (by plan, status)
- Revenue per wholesaler
- Toggle active status (block/unblock)
- Change plan tier
- View wholesaler details

#### F-AD-03: Retailer Management

**Route:** `/admin/retailers`

**Features:**
- List all retailers with search and filter
- Toggle active status
- View retailer details

#### F-AD-04: Order Monitoring

**Route:** `/admin/orders`

**Features:**
- All orders across all wholesalers
- Filter by status, wholesaler
- Read-only view (admin cannot modify orders)

#### F-AD-05: Plan & Revenue Management

**Route:** `/admin/plans`, `/admin/revenue`

**Plan Tiers:**

| Plan | Target | Features |
|------|--------|----------|
| **Starter** | New agencies | Basic features, limited retailers |
| **Growth** | Growing agencies | Extended features |
| **Pro** | Established agencies | Full features |
| **Enterprise** | Large operations | Unlimited + premium support |

**Features:**
- View plan upgrade requests from wholesalers
- Approve/reject with admin notes
- Auto-upgrade plan on approval
- Revenue breakdown by wholesaler
- Monthly revenue trends (6-month chart)

#### F-AD-06: Coupon Management

**Route:** `/admin/coupons`

**Coupon Fields:**
| Field | Description |
|-------|-------------|
| Code | Unique coupon code |
| Discount Type | `PERCENTAGE` or `FLAT` |
| Discount Value | % or ₹ amount |
| Max Uses | Usage limit |
| Valid Plans | Which plan tiers can use this coupon |
| Expires At | Expiration date |

**Features:**
- Create/edit/delete coupons
- Toggle active status
- Usage tracking (used_count vs max_uses)
- Plan-specific coupon targeting

#### F-AD-07: Activity Log

**Route:** `/admin/activity`

**Description:** Unified activity feed showing recent platform events:
- New orders placed
- Payments recorded
- New wholesaler/retailer registrations
- Plan changes

---

### 7.6 Real-Time Communication

#### Socket.IO Event Architecture

**Room Structure:**
```
wholesaler_{id}  — Each sub-wholesaler has a private room
retailer_{id}    — Each retailer has a private room
main_wholesaler_{id} — Each main wholesaler has a private room
```

**Client Events (Emitted to Server):**
| Event | Payload | When |
|-------|---------|------|
| `join_room` | `{ room: string }` | On login / app load |
| `leave_room` | `{ room: string }` | On logout / disconnect |

**Server Events (Emitted to Clients):**
| Event | Payload | Recipients | Trigger |
|-------|---------|------------|---------|
| `new_order` | Order object | `wholesaler_{id}` room | Retailer places order |
| `order_updated` | Order object | `retailer_{id}` room | Wholesaler updates order status |
| `payment_received` | Payment object | `retailer_{id}` room | Wholesaler records payment |
| `notification` | Notification object | Target user's room | Any notification-worthy event |
| `new_return` | Return object | `wholesaler_{id}` room | Retailer submits return |
| `return_updated` | Return object | `retailer_{id}` room | Wholesaler processes return |
| `agency_response` | Agency data | `retailer_{id}` room | Wholesaler accepts/rejects agency request |

**Connection Management:**
- Socket auto-connects on login
- Reconnection: up to 5 attempts
- Auto-disconnect on logout
- Connection restored from localStorage on app reload

---

### 7.7 Printing & Document Generation

#### Invoice Generation

**Route:** `/orders/:orderId/invoice`

**Invoice Contents:**
| Section | Details |
|---------|---------|
| Header | Wholesaler business name, address, GSTIN, DL number, phone |
| Customer | Retailer name, shop name, address, GSTIN |
| Invoice Info | Invoice number, date, payment terms |
| Items Table | S.No, Medicine, HSN, Qty, MRP, Rate, Discount%, Taxable Value, GST%, Tax, Total |
| Summary | Sub-total, CGST, SGST, Round-off, Grand Total |
| Amount in Words | Auto-generated (e.g., "Rupees Twelve Thousand Five Hundred Only") |
| Footer | Bank details (name, A/C, IFSC), UPI ID, terms & conditions |

**Export:** jsPDF + jspdf-autotable + html2canvas-pro for PDF generation.

#### Delivery Challan

**Route:** `/orders/:orderId/delivery-challan`

Simplified delivery document with item list, quantities, and receiver signature area.

#### Combined Print

**Route:** `/orders/:orderId/combined-print`

Invoice + delivery receipt on a single printable page for one-shot printing.

#### Daily Invoice Summary

**Route:** `/orders/daily-invoice`

All invoices generated on a specific date, consolidated for batch printing.

#### Purchase Order Invoice

**Route:** `/purchase-orders/:poId/invoice`

Printable PO document for sending to suppliers.

#### Supply Order Invoice

**Route:** `/wholesaler/orders/:soId/invoice` (Main Wholesaler)

Printable invoice for supply orders from MW to sub-wholesaler.

---

## 8. Data Model

### 8.1 Entity Relationship Overview

```
                    ┌──────────────────┐
                    │   Admin          │
                    │                  │
                    │ - Platform mgmt  │
                    │ - Plans/coupons  │
                    └──────────────────┘

    ┌──────────────────┐         ┌──────────────────────────┐
    │ MainWholesaler   │◄───────►│ MainWholesalerConnection │
    │                  │   1:N   │ (credit_limit, balance)  │
    │ - Catalogue      │         └────────────┬─────────────┘
    │ - Schemes        │                      │ N:1
    │ - Supply Orders  │                      ▼
    └──────────────────┘         ┌──────────────────────────┐
           │                     │     Wholesaler            │
           │ 1:N                 │                           │
           ▼                     │  - Medicines + Batches    │
    ┌──────────────────┐         │  - Orders                 │
    │ SupplyOrder      │◄───────►│  - Ledger                 │
    │ (MW → Wholesaler)│  1:1    │  - Payments               │
    └──────────────────┘  w/ PO  │  - Purchase Orders        │
                                 │  - GRNs                   │
                                 │  - Schemes                │
                                 │  - Return Requests        │
                                 └────────────┬──────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                               1:N direct          N:M via
                                    │          RetailerAgency
                                    ▼                   │
                         ┌──────────────────┐           │
                         │   Retailer       │◄──────────┘
                         │                  │
                         │ - Orders         │
                         │ - Ledger entries │
                         │ - Payments       │
                         │ - Returns        │
                         │ - Notifications  │
                         └──────────────────┘
```

### 8.2 Complete Model Reference

| # | Model | Records | Key Relationships |
|---|-------|---------|-------------------|
| 1 | `Admin` | Platform operators | Standalone |
| 2 | `MainWholesaler` | Super-distributors | → SupplyOrders, MWMedicines, MWSchemes, MWConnections, MWLedger, MWPayments |
| 3 | `Wholesaler` | Sub-distributors | → Retailers, Medicines, Orders, Ledger, Payments, Notifications, Schemes, POs, GRNs |
| 4 | `Retailer` | Chemist shops | → Orders, Ledger, Payments, Agencies, Returns, Notifications |
| 5 | `RetailerAgency` | Wholesaler ↔ Retailer link | FK: retailer_id, wholesaler_id (unique pair) |
| 6 | `Medicine` | Inventory items | → Batches, OrderItems, Schemes, GRNItems |
| 7 | `MedicineBatch` | Stock by batch | FK: medicine_id. Unique: [medicine_id, batch_no] |
| 8 | `Scheme` | Promotions | FK: wholesaler_id, medicine_id |
| 9 | `Order` | Sales orders | FK: wholesaler_id, retailer_id → OrderItems, LedgerEntries |
| 10 | `OrderItem` | Order line items | FK: order_id, medicine_id |
| 11 | `LedgerEntry` | Financial ledger | FK: wholesaler_id, retailer_id, order_id |
| 12 | `Payment` | Payment records | FK: wholesaler_id, retailer_id |
| 13 | `Notification` | In-app notifications | FK: wholesaler_id, retailer_id |
| 14 | `ReturnRequest` | Return requests | FK: wholesaler_id, retailer_id → ReturnItems |
| 15 | `ReturnItem` | Return line items | FK: return_id |
| 16 | `PurchaseOrder` | Inbound procurement | FK: wholesaler_id, main_wholesaler_id → POItems, GRNs, SupplyOrder |
| 17 | `POItem` | PO line items | FK: po_id, medicine_id |
| 18 | `GoodsReceiptNote` | Goods receipt | FK: wholesaler_id, po_id → GRNItems |
| 19 | `GRNItem` | GRN line items | FK: grn_id, medicine_id |
| 20 | `SupplyOrder` | MW → Wholesaler orders | FK: wholesaler_id, main_wholesaler_id, purchase_order_id |
| 21 | `SupplyOrderItem` | SO line items | FK: so_id |
| 22 | `PlanRequest` | Plan upgrade requests | FK: wholesaler_id |
| 23 | `Coupon` | Discount coupons | Standalone |
| 24 | `MainWholesalerMedicine` | MW catalogue | FK: main_wholesaler_id |
| 25 | `MainWholesalerScheme` | MW promotions | FK: main_wholesaler_id, medicine_id |
| 26 | `MainWholesalerConnection` | MW ↔ Wholesaler link | FK: main_wholesaler_id, wholesaler_id |
| 27 | `MainWholesalerLedgerEntry` | MW financial ledger | FK: main_wholesaler_id, wholesaler_id |
| 28 | `MainWholesalerPayment` | MW payment records | FK: main_wholesaler_id, wholesaler_id |

### 8.3 Enums

| Enum | Values |
|------|--------|
| `OrderStatus` | PENDING, ACCEPTED, DISPATCHED, DELIVERED, REJECTED, CANCELLED |
| `LedgerType` | DEBIT, CREDIT |
| `PaymentMethod` | CASH, UPI, CHEQUE, BANK_TRANSFER |
| `PaymentStatus` | PENDING, COMPLETED, FAILED |
| `NotificationType` | NEW_ORDER, ORDER_DELIVERED, PAYMENT_RECEIVED, CREDIT_LIMIT_ALERT, OVERDUE_REMINDER, ORDER_STATUS_CHANGED, AGENCY_ACCEPTED, AGENCY_REJECTED |
| `SchemeType` | BOGO, HALF_SCHEME, CASH_DISCOUNT |
| `ReturnReason` | EXPIRED, DAMAGED, MISSING |
| `ReturnStatus` | PENDING, APPROVED, REJECTED |
| `POStatus` | DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED |
| `SupplyOrderStatus` | PENDING, ACCEPTED, DISPATCHED, DELIVERED, CANCELLED |

---

## 9. API Specification

### 9.1 Base Configuration

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:3001/api` (dev) / `{VITE_API_URL}` (prod) |
| Auth | Bearer JWT in `Authorization` header |
| Content-Type | `application/json` |
| Body Limit | 10 MB |
| Real-time | Socket.IO on same port |

### 9.2 Endpoint Summary

| Route Group | Prefix | Endpoints | Auth Required |
|-------------|--------|-----------|---------------|
| Authentication | `/api/auth` | 10 | Mixed (login/register: No, others: Yes) |
| Retailers | `/api/retailers` | 7 | Yes |
| Orders | `/api/orders` | 7 | Yes |
| Medicines | `/api/medicines` | 13 | Yes |
| Ledger | `/api/ledger` | 6 | Yes |
| Payments | `/api/payments` | 4 | Yes |
| Notifications | `/api/notifications` | 3 | Yes |
| Retailer Agencies | `/api/retailer/agencies` | 5 | Retailer only |
| Retailer Ledger | `/api/retailer/ledger` | 2 | Retailer only |
| Wholesaler Agencies | `/api/wholesaler/agencies` | 3 | Wholesaler only |
| Marketplace | `/api/marketplace` | 1 | Retailer only |
| Returns | `/api/returns` | 3 | Yes |
| Schemes | `/api/schemes` | 3 | Wholesaler only |
| Purchase Orders & GRN | `/api/purchase-orders` | 8 | Wholesaler only |
| Admin | `/api/admin` | 13 | Admin only |
| Main Wholesaler | `/api/main-wholesalers` | 15 | Mixed |
| MW Schemes | `/api/main-wholesalers/schemes` | 4 | MW only |
| MW Ledger | `/api/main-wholesalers/ledger` | 2 | MW only |
| MW Payments | `/api/main-wholesalers/payments` | 2 | MW only |
| **Total** | | **~110 endpoints** | |

### 9.3 Key API Flows

#### Order Placement Flow (Retailer → Wholesaler)

```
1. Retailer: POST /api/orders
   Body: { wholesaler_id, items: [{ medicine_id, qty }] }
   → Creates order (PENDING)
   → Emits socket: new_order → wholesaler room
   → Creates notification for wholesaler

2. Wholesaler: PATCH /api/orders/:id/status { status: "ACCEPTED" }
   → Validates stock availability
   → FIFO stock deduction from batches
   → Auto-generates invoice number
   → Emits socket: order_updated → retailer room

3. Wholesaler: PATCH /api/orders/:id/status { status: "DISPATCHED" }
   → Updates status
   → Emits socket: order_updated → retailer room

4. Wholesaler: PATCH /api/orders/:id/status { status: "DELIVERED" }
   → Debits retailer ledger (transactional)
   → Updates retailer.current_balance
   → Optional: records immediate payment
   → Emits socket: order_updated → retailer room
```

#### Payment Collection Flow

```
1. Wholesaler: POST /api/payments/cash
   Body: { retailer_id, amount, method, notes }
   → Creates Payment record
   → Credits retailer ledger (transactional)
   → Updates retailer.current_balance, last_payment_date
   → Emits socket: payment_received → retailer room
   → Creates notification for retailer
```

#### Supply Chain Flow (PO → Supply Order → GRN)

```
1. Wholesaler: POST /api/purchase-orders
   Body: { supplier (MW), items }
   → Creates PO (DRAFT), auto-adds MW medicines to own catalogue

2. Wholesaler: PATCH /api/purchase-orders/:id { status: "SENT" }
   → If MW-linked: auto-creates SupplyOrder on MW side

3. Main Wholesaler: PATCH /api/main-wholesalers/supply-orders/:id { status: "DELIVERED" }
   → Debits wholesaler in MW ledger (transactional)
   → Auto-marks linked PO as RECEIVED
   → Auto-updates received quantities

4. Wholesaler: POST /api/purchase-orders/grns
   → Creates GRN with batch-level items
   → Upserts medicine batches (stock in)
   → Updates medicine prices to latest cost
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load (initial) | < 3 seconds on 4G |
| API response (95th percentile) | < 500ms |
| Real-time event delivery | < 1 second |
| Concurrent users per wholesaler | Up to 50 |
| Medicine catalogue search | < 200ms for 256K+ records |

### 10.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT with configurable secret |
| Password storage | bcryptjs hashing |
| Transport security | HTTPS in production |
| CORS | Allowlisted origins only |
| Security headers | Helmet.js (CSP, X-Frame-Options, etc.) |
| Input validation | express-validator on all mutation endpoints |
| SQL injection prevention | Prisma ORM parameterised queries |
| Role-based access | Middleware-enforced per route |
| Token expiry handling | Auto-logout on 401 |

### 10.3 Reliability

| Requirement | Implementation |
|-------------|----------------|
| Data consistency | `prisma.$transaction` for all ledger operations |
| Stock integrity | Transactional FIFO deduction with rollback on failure |
| Session persistence | localStorage-based with server-side token validation |
| Socket reconnection | Up to 5 automatic reconnection attempts |
| Error handling | Global Express error handler with logging |

### 10.4 Scalability

| Aspect | Current | Future Consideration |
|--------|---------|---------------------|
| Database | Single PostgreSQL (Neon) | Read replicas, connection pooling |
| Application | Single Node.js instance | Horizontal scaling with sticky sessions for Socket.IO |
| File storage | In-memory PDF generation | CDN-backed document storage |
| Caching | Zustand in-memory client cache | Redis server-side cache |

### 10.5 Usability

| Requirement | Implementation |
|-------------|----------------|
| Responsive design | Tailwind CSS responsive utilities |
| Mobile-first (Retailer) | Bottom navigation, touch-friendly cards |
| Desktop-first (Wholesaler) | Sidebar navigation, data-dense tables |
| Offline capability | PWA manifest, service worker stub, localStorage persistence |
| Search | Global search command (Cmd+K) via SearchCommand component |
| Animations | Framer Motion for transitions and micro-interactions |

### 10.6 Accessibility

| Requirement | Status |
|-------------|--------|
| Semantic HTML | Implemented |
| Keyboard navigation | Partial (search command supports Cmd+K) |
| Screen reader support | Basic ARIA where applicable |
| Color contrast | Tailwind default palette (meets WCAG AA) |

---

## 11. Tech Stack

### 11.1 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.x | UI rendering |
| Language | TypeScript | 5.8.x | Type safety |
| Build | Vite | 6.x | Development server + production bundler |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Routing | React Router DOM | 6.22.x | Client-side routing (HashRouter) |
| State | Zustand | 5.x | Lightweight state management (3 stores) |
| Charts | Recharts | 3.x | Data visualisation |
| Icons | Lucide React | 0.574.x | Icon library |
| HTTP | Axios | 1.13.x | API client with interceptors |
| Real-time | Socket.IO Client | 4.8.x | WebSocket communication |
| Animation | Framer Motion | 12.x | UI animations and transitions |
| PDF | jsPDF + jspdf-autotable + html2canvas-pro | Latest | Invoice/report generation |
| Utilities | clsx, tailwind-merge, class-variance-authority | Latest | CSS class management |

### 11.2 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | Latest LTS | Server runtime |
| Language | TypeScript | 5.x | Type safety |
| Framework | Express.js | 4.x | HTTP framework |
| ORM | Prisma | Latest | Database access + migrations |
| Database | PostgreSQL | 14+ | Relational data store |
| Auth | jsonwebtoken + bcryptjs | Latest | JWT tokens + password hashing |
| Real-time | Socket.IO | 4.x | WebSocket server |
| Security | Helmet + CORS | Latest | HTTP security headers + cross-origin |
| Validation | express-validator | Latest | Request validation |
| CSV Processing | csv-parser | Latest | Medicine data import |
| Dev tooling | ts-node-dev | Latest | Hot-reload development server |

### 11.3 Mobile

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Capacitor | Native wrapper for retailer PWA |
| Platform | Android | Primary mobile target |
| Web View | System WebView | Runs React app natively |

### 11.4 Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend hosting | Vercel | Static site deployment |
| Backend hosting | Render | Node.js server + autoscaling |
| Database | Neon / Supabase PostgreSQL | Managed PostgreSQL |
| Domain | Custom | Application URL |

---

## 12. Deployment Architecture

### 12.1 Development Environment

```bash
# Frontend (Vite dev server → http://localhost:5173)
npm install && npm run dev

# Backend (Express → http://localhost:3001)
cd backend
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET
npx prisma db push     # Sync schema
npm run seed           # Demo data
npm run seed:medicines # 2000+ medicine catalogue
npm run dev
```

### 12.2 Environment Variables

| Variable | Example | Required | Scope |
|----------|---------|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/pharma_b2b` | ✅ | Backend |
| `JWT_SECRET` | `pharma-b2b-super-secret-jwt-key` | ✅ | Backend |
| `PORT` | `3001` | ❌ | Backend |
| `NODE_ENV` | `development` / `production` | ❌ | Backend |
| `CLIENT_URL` | `https://pharmahead.vercel.app` | ❌ | Backend (CORS) |
| `VITE_API_URL` | `https://pharma-backend.onrender.com/api` | ❌ | Frontend |

### 12.3 Production Deployment

```
┌──────────────────┐     HTTPS      ┌──────────────────┐     TCP      ┌─────────────────┐
│  Vercel (CDN)    │ ──────────────► │  Render (Node)   │ ───────────► │ Neon PostgreSQL  │
│                  │                 │                  │              │                 │
│  React SPA       │  REST + WSS    │  Express +       │  Prisma      │  22 tables      │
│  (Static Build)  │ ◄─────────────►│  Socket.IO       │ ◄──────────► │  10 enums       │
│                  │                 │                  │              │                 │
└──────────────────┘                 └──────────────────┘              └─────────────────┘
```

**Vercel Config** (`vercel.json`): Rewrites all routes to `index.html` for SPA routing.

**Render Config** (`render.yaml`): Defines web service with build command and environment variables.

---

## 13. Future Roadmap

| Phase | Features | Priority |
|-------|----------|----------|
| **v0.2** | Barcode/QR scanning for stock intake, batch-level stock tracking improvements | High |
| **v0.2** | SMS/WhatsApp notifications for order status and payment reminders | High |
| **v0.3** | Multi-language support (Hindi, Telugu, Tamil) | Medium |
| **v0.3** | Advanced reporting — ABC analysis, slow-moving stock, demand forecasting | Medium |
| **v0.3** | Credit scoring and risk assessment for retailers | Medium |
| **v0.4** | Razorpay/UPI integration for in-app digital payments | High |
| **v0.4** | e-Way bill integration for inter-state supply chain | Medium |
| **v0.5** | White-label support — wholesalers can have custom-branded URLs | Low |
| **v0.5** | Offline mode with sync-on-reconnect for areas with poor connectivity | Medium |
| **v1.0** | Manufacturer tier integration — direct M→C&F→Distributor→Retailer chain | Low |
| **v1.0** | AI-powered auto-reorder suggestions based on consumption patterns | Low |

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **B2B** | Business-to-Business |
| **C&F** | Carrying and Forwarding (agent) — another term for main wholesaler/super-stockist |
| **CGST** | Central Goods and Services Tax (central component of GST) |
| **DL Number** | Drug Licence Number — mandatory for pharma businesses in India |
| **FIFO** | First In, First Out — stock deduction strategy based on expiry date |
| **GRN** | Goods Receipt Note — document confirming receipt of ordered goods |
| **GSTIN** | Goods and Services Tax Identification Number |
| **GSTR-1** | GST return for outward supplies |
| **GSTR-3B** | GST summary return filed monthly |
| **HSN** | Harmonised System of Nomenclature — classification code for goods |
| **JWT** | JSON Web Token — stateless authentication mechanism |
| **Main Wholesaler** | Super-distributor / C&F agent who supplies to sub-wholesalers |
| **MRP** | Maximum Retail Price — price ceiling set by manufacturer |
| **MW** | Main Wholesaler (abbreviation used in codebase) |
| **PO** | Purchase Order — formal order document sent to supplier |
| **PWA** | Progressive Web App — web app with native-like capabilities |
| **Retailer** | Chemist / medical shop / pharmacy that sells to end consumers |
| **SaaS** | Software as a Service |
| **SGST** | State Goods and Services Tax (state component of GST) |
| **SKU** | Stock Keeping Unit — individual product variant |
| **SO** | Supply Order — order from sub-wholesaler to main wholesaler |
| **Sub-Wholesaler** | Distributor / pharma agency that buys from main wholesaler and sells to retailers |
| **Wholesaler** | In this platform, refers to sub-wholesaler/distributor (the primary user) |

---

*This PRD is auto-generated from the Pharma Head v0.1.4 codebase and reflects the current state of implemented features.*
