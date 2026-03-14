# Bulk Import Flow Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Main Wholesaler Login                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Navigate to Catalog Page                        │
│  • View existing medicines                                       │
│  • See analytics and inventory status                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Click "Bulk Import" Button                          │
│  (Green button with upload icon)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Bulk Import Modal Opens                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Instructions & Required Columns                          │  │
│  │  • medicine_name (required)                               │  │
│  │  • price (required)                                       │  │
│  │  • brand, mrp, stock, expiry, gst (5% default), etc.     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Download Sample Template] Button                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  File Upload Area (Drag & Drop)                          │  │
│  │  📁 Click to select or drag Excel/CSV file               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼──────────┐   ┌───▼────────────────┐
         │ Download Template   │   │  Select Own File   │
         │ (Optional)          │   │  (.xlsx/.xls/.csv) │
         └──────────┬──────────┘   └───┬────────────────┘
                    │                  │
                    └─────────┬────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Prepare Excel/CSV File                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ medicine_name | brand  | mrp  | price | stock | expiry   │  │
│  │ Paracetamol   | Crocin | 25   | 20    | 100   | 2025-12  │  │
│  │ Amoxicillin   | Novamox| 45   | 35    | 50    | 2026-06  │  │
│  │ (GST defaults to 5% if not specified)                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Upload File & Click "Import"                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Processing                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Validate file format (.xlsx/.xls/.csv)                │  │
│  │ 2. Parse Excel/CSV using xlsx library                    │  │
│  │ 3. Normalize column names (case-insensitive)             │  │
│  │ 4. For each row:                                         │  │
│  │    • Validate required fields                            │  │
│  │    • Check for duplicates                                │  │
│  │    • Parse dates and numbers                             │  │
│  │    • Create medicine record in database                  │  │
│  │ 5. Collect success/failure results                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Results Display                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📊 Import Summary                                        │  │
│  │  ┌─────────┬─────────┬─────────┐                        │  │
│  │  │ Total   │ Success │ Failed  │                        │  │
│  │  │  100    │   95    │    5    │                        │  │
│  │  └─────────┴─────────┴─────────┘                        │  │
│  │                                                           │  │
│  │  ✅ Successfully imported 95 medicines!                  │  │
│  │                                                           │  │
│  │  ❌ Import Errors (5)                                    │  │
│  │  • Row 12: Aspirin - Already exists in catalog          │  │
│  │  • Row 25: Ibuprofen - Invalid price format             │  │
│  │  • Row 38: Omeprazole - Medicine name is required       │  │
│  │  • Row 47: Metformin - Invalid date format              │  │
│  │  • Row 89: Losartan - Already exists in catalog         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Catalog Auto-Refreshes                              │
│  • New medicines appear in the list                              │
│  • Analytics update with new counts                              │
│  • User can continue working                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MainWholesalerCatalogPage.tsx                           │  │
│  │  • Bulk Import Button                                    │  │
│  │  • State Management (file, results, loading)             │  │
│  │  • Event Handlers (upload, download template)            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BulkImportModal.tsx                                     │  │
│  │  • File Upload UI                                        │  │
│  │  • Instructions Display                                  │  │
│  │  • Results Display                                       │  │
│  │  • Error List                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP POST (multipart/form-data)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/bulk-import/medicines                              │  │
│  │  • Authentication Middleware (JWT)                       │  │
│  │  • Role Check (MAIN_WHOLESALER)                          │  │
│  │  • Multer File Upload Middleware                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  bulkImport.ts Route Handler                             │  │
│  │  1. Validate file exists                                 │  │
│  │  2. Parse with XLSX library                              │  │
│  │  3. Normalize column names                               │  │
│  │  4. Process each row:                                    │  │
│  │     • Extract & validate data                            │  │
│  │     • Check duplicates                                   │  │
│  │     • Create medicine via Prisma                         │  │
│  │  5. Return results                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM                                              │  │
│  │  • MainWholesalerMedicine.create()                       │  │
│  │  • Transaction support                                   │  │
│  │  • Duplicate detection                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                     │  │
│  │  • main_wholesaler_medicine table                        │  │
│  │  • Unique constraint on (main_wholesaler_id, name)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    JSON Response with Results
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  • Display results                                               │
│  • Refresh medicine list                                         │
│  • Show success/error messages                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Excel/CSV File
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Raw Data (XLSX/CSV format)                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ medicine_name | brand  | mrp | price | stock | expiry    │  │
│  │ Paracetamol   | Crocin | 25  | 20    | 100   | 2025-12   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Parsed JSON Array                                              │
│  [                                                               │
│    {                                                             │
│      "medicine_name": "Paracetamol",                            │
│      "brand": "Crocin",                                         │
│      "mrp": 25,                                                 │
│      "price": 20,                                               │
│      "stock": 100,                                              │
│      "expiry": "2025-12",                                       │
│      "gst_rate": 5                                              │
│    }                                                             │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Normalized & Validated Data                                    │
│  {                                                               │
│    main_wholesaler_id: "cuid123",                               │
│    medicine_name: "Paracetamol",                                │
│    brand: "Crocin",                                             │
│    mrp: 25.00,                                                  │
│    price: 20.00,                                                │
│    stock_qty: 100,                                              │
│    expiry_date: Date("2025-12-01"),                             │
│    gst_rate: 5,                                                 │
│    hsn_code: "3004",                                            │
│    unit_type: "strip",                                          │
│    is_active: true                                              │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database Record (PostgreSQL)                                   │
│  main_wholesaler_medicine table                                 │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  API Response                                                    │
│  {                                                               │
│    "total": 100,                                                │
│    "success": 95,                                               │
│    "failed": 5,                                                 │
│    "errors": [...]                                              │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Row Processing
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Validation Checks                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ✓ Medicine name exists?                                   │  │
│  │ ✓ Price is valid number?                                  │  │
│  │ ✓ Date format correct?                                    │  │
│  │ ✓ Medicine not duplicate?                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────┴─────────┐
│                   │
▼                   ▼
┌─────────────┐   ┌─────────────┐
│  All Valid  │   │  Has Error  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────────────────────┐
│   Create    │   │  Add to Error List          │
│  Medicine   │   │  {                          │
│             │   │    row: 12,                 │
│  Success++  │   │    medicine: "Aspirin",     │
└─────────────┘   │    error: "Already exists"  │
                  │  }                          │
                  │  Failed++                   │
                  └─────────────────────────────┘
```

## Security Flow

```
HTTP Request
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Authentication Middleware                                      │
│  • Verify JWT token                                             │
│  • Extract user info                                            │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Authorization Middleware                                       │
│  • Check role = MAIN_WHOLESALER                                 │
│  • Reject if unauthorized                                       │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  File Validation                                                │
│  • Check file type (.xlsx/.xls/.csv)                            │
│  • Check file size (< 10MB)                                     │
│  • Scan for malicious content                                   │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Data Validation                                                │
│  • Sanitize inputs (trim, type check)                           │
│  • Prevent SQL injection (Prisma ORM)                           │
│  • Validate data types                                          │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database Operations                                            │
│  • Use parameterized queries                                    │
│  • Enforce unique constraints                                   │
│  • Transaction support                                          │
└─────────────────────────────────────────────────────────────────┘
```
