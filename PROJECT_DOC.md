# Pharma B2B Dashboard — Project Documentation

**Version:** 0.1.4  
**Internal name:** PharmaOS  
**Tagline:** _Premium B2B Operating System for Pharmaceutical Sub-Wholesalers_

---

## 1. What This Project Is

PharmaOS is a **full-stack B2B SaaS web application** that digitises the day-to-day operations of a **pharmaceutical sub-wholesaler** (distributor) and their network of **retailers** (chemists / medical shops).

The platform removes the need for physical order books, manual ledgers, and offline payment tracking by providing a single, real-time web dashboard for both parties.

---

## 2. Core User Roles

| Role | Who | What they do on the platform |
|---|---|---|
| **Wholesaler** | Sub-distributor / pharma agency owner | Manages inventory, accepts/dispatches orders, tracks retailer balances, collects payments |
| **Retailer** | Chemist / medical store | Browses the wholesaler's catalogue (marketplace), places orders, views their own ledger & account |

---

## 3. Tech Stack

### Frontend
| Piece | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS (CDN + utility classes) |
| State Management | Zustand (3 stores: auth, cart, data) |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP client | Axios |
| Real-time | Socket.IO client |
| Build tool | Vite |

### Backend
| Piece | Technology |
|---|---|
| Runtime | Node.js + TypeScript (ts-node-dev) |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | Socket.IO server |
| Security | helmet, cors |
| Validation | express-validator |

---

## 4. Folder Structure Overview

```
/
├── App.tsx                  # Root router — wholesaler & retailer route trees
├── index.tsx                # React entry point
├── index.html               # HTML shell (loads Tailwind CDN + Inter font)
├── metadata.json            # PWA-style app metadata
├── vite.config.ts           # Vite build config
├── tsconfig.json            # TS config (frontend)
├── types.ts / types/        # Shared TypeScript types
│
├── components/
│   ├── Layout.tsx           # Wholesaler app shell (sidebar + header)
│   ├── RetailerLayout.tsx   # Retailer app shell (bottom nav / header)
│   ├── DeliveryReceiptModal.tsx
│   └── InvoiceModal.tsx
│
├── pages/                   # Wholesaler-facing pages
│   ├── LoginPage.tsx        # Shared login (switches context by role)
│   ├── DashboardHome.tsx    # KPI cards, recent orders, quick actions
│   ├── OrdersPage.tsx       # Order list, status management, invoice/receipt
│   ├── RetailersPage.tsx    # Retailer directory
│   ├── RetailerDetailPage.tsx # Individual retailer ledger + history
│   ├── MedicinesPage.tsx    # Inventory management (add / edit / stock)
│   ├── CollectionPage.tsx   # Record payment collections from retailers
│   ├── LedgerPage.tsx       # Full debit/credit ledger view
│   ├── PaymentsPage.tsx     # Payment history
│   └── SettingsPage.tsx     # Wholesaler profile & preferences
│
├── pages/retailer/          # Retailer-facing pages
│   ├── MarketplacePage.tsx  # Product catalogue / shop
│   ├── CartPage.tsx         # Shopping cart + checkout
│   ├── RetailerOrdersPage.tsx # Retailer's own order history
│   ├── RetailerProfilePage.tsx # Retailer account details
│   └── AgencySetupPage.tsx  # Link/request a wholesaler agency
│
├── store/
│   ├── authStore.ts         # Auth state (JWT, user role, wholesaler/retailer object)
│   ├── cartStore.ts         # Retailer cart state
│   └── dataStore.ts         # Global data cache (orders, medicines, retailers, etc.)
│
├── utils/
│   ├── api.ts               # Axios instance + all API call functions
│   ├── socket.ts            # Socket.IO connection helper
│   ├── formatters.ts        # Currency, date, number formatters
│   └── cn.ts                # Tailwind class merge utility
│
├── dataset/
│   └── Extensive_A_Z_medicines_dataset_of_India.csv  # 2000+ Indian medicine records (seed data)
│
└── backend/
    ├── src/
    │   ├── index.ts         # Express + Socket.IO server entry
    │   ├── seed.ts          # Seed wholesaler + retailer accounts
    │   ├── seedMedicines.ts # Bulk-import medicines from CSV
    │   ├── lib/prisma.ts    # Prisma client singleton
    │   ├── middleware/auth.ts # JWT auth middleware
    │   ├── routes/          # One file per resource (REST endpoints)
    │   └── services/ledgerService.ts # Ledger credit/debit logic
    └── prisma/
        └── schema.prisma    # Database schema
```

---

## 5. Database Models (Prisma / PostgreSQL)

| Model | Purpose |
|---|---|
| `Wholesaler` | The platform operator — owns medicines, retailers, ledger |
| `Retailer` | Customer of the wholesaler; has credit limit & running balance |
| `RetailerAgency` | Many-to-many link between retailer ↔ wholesaler (multi-agency support) |
| `Medicine` | Inventory item; shared catalogue entries (no `wholesaler_id`) or private stock |
| `Order` | A purchase order from retailer to wholesaler |
| `OrderItem` | Line items on an order (medicine, qty, price, GST, discount) |
| `LedgerEntry` | Double-entry style DEBIT/CREDIT ledger tied to orders or payments |
| `Payment` | Cash / UPI / Cheque / Bank Transfer collection records |
| `Notification` | System notifications pushed to wholesaler or retailer rooms |

---

## 6. Backend API Routes

| Prefix | Description |
|---|---|
| `POST /api/auth/...` | Login, register, token refresh |
| `GET/POST/PATCH /api/retailers` | CRUD for retailer accounts |
| `GET/POST/PATCH /api/orders` | Order lifecycle management |
| `GET/POST/PATCH /api/medicines` | Inventory CRUD |
| `GET /api/ledger` | Ledger entries per retailer |
| `GET/POST /api/payments` | Payment records |
| `GET/POST /api/notifications` | Notification feed |
| `GET/POST /api/retailer/agencies` | Retailer → wholesaler agency links |
| `GET/POST /api/wholesaler/agencies` | Wholesaler agency management |
| `GET /api/marketplace` | Public medicine catalogue for retailer browsing |
| `GET /api/health` | Health check |

**Port:** `3001`  
**Auth:** Bearer JWT in `Authorization` header (all routes except login/register)

---

## 7. Real-Time (Socket.IO)

The server uses Socket.IO rooms to push live updates:

- Each wholesaler/retailer joins a private room on login (`wholesaler_<id>` or `retailer_<id>`)
- Events are emitted when: an order is placed, its status changes, a payment is recorded
- The frontend's `dataStore` listens and refreshes relevant slices of state automatically

---

## 8. Key Features

### Wholesaler Dashboard
- **KPI cards:** Total revenue, active retailers, pending orders, outstanding balance
- **Orders:** Accept → Dispatch → Deliver flow; generate PDF invoice & delivery receipt
- **Medicines:** Add products manually or seed from the bundled Indian medicines CSV; manage stock, MRP, GST, expiry
- **Retailers:** Directory with outstanding balance per retailer; drill into individual ledger history
- **Ledger:** Full debit/credit timeline per retailer
- **Payments (Collection):** Record cash/UPI/cheque payments; auto-credits the ledger
- **Settings:** Profile, bank details, GSTIN, drug licence

### Retailer Portal
- **Marketplace:** Browse wholesaler catalogue, search/filter by name or therapeutic class
- **Cart & Checkout:** Add to cart, view GST breakdown, place order
- **Orders:** View own order history and status updates
- **Agency Setup:** Self-register and connect to a wholesaler's agency
- **Profile:** View account details and outstanding balance

---

## 9. Medicine Dataset

The `dataset/` folder contains a CSV with **2000+ Indian medicines (A–Z)** including:
- Name, manufacturer, composition, pack size, MRP
- Therapeutic class (e.g. CARDIAC, ANTI INFECTIVES, GASTRO INTESTINAL)
- Side effects, use cases, chemical class, substitutes

This is used by `backend/src/seedMedicines.ts` to bulk-populate the medicines catalogue.

---

## 10. Authentication & Plans

- **JWT-based** auth; tokens stored in `localStorage` and restored on app load via `authStore.initFromStorage()`
- Wholesaler has a `plan` field: `starter | growth | pro` (feature gating hook in place)
- Retailer can be added by a wholesaler **or** self-register and request agency linkage

---

## 11. Running Locally

```bash
# 1. Frontend (Vite dev server — http://localhost:5173)
npm install
npm run dev

# 2. Backend (Express — http://localhost:3001)
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npx prisma db push     # sync schema to Postgres
npm run seed           # optional: create demo wholesaler + retailers
npm run seed:medicines # optional: import medicine catalogue
npm run dev
```

---

## 12. Environment Variables (backend/.env)

| Key | Example value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/pharma_b2b` | PostgreSQL connection |
| `JWT_SECRET` | `pharma-b2b-super-secret-jwt-key` | JWT signing key |
| `PORT` | `3001` | API server port |
| `NODE_ENV` | `development` | Environment flag |

---

## 13. Summary

PharmaOS is a production-oriented, full-stack pharma B2B platform that handles the complete order-to-payment cycle between a sub-wholesaler and their retailers. It combines a clean React dashboard, a RESTful Express API, a relational PostgreSQL database (via Prisma), and real-time Socket.IO updates — all typed end-to-end in TypeScript.
