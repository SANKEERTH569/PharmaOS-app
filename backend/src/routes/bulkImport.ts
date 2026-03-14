import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireRole('MAIN_WHOLESALER'));

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

/**
 * POST /api/bulk-import/medicines
 * Bulk import medicines from Excel/CSV file
 * 
 * Expected columns (case-insensitive, flexible):
 * - medicine_name / name / medicine (required)
 * - brand (optional)
 * - mrp (optional)
 * - price / selling_price / rate (required)
 * - stock_qty / stock / quantity (optional)
 * - expiry_date / expiry (optional, format: YYYY-MM or YYYY-MM-DD)
 * - gst_rate / gst (optional, default: 5)
 * - hsn_code / hsn (optional, default: 3004)
 * - unit_type / unit (optional, default: strip)
 */
router.post('/medicines', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mwId = req.user!.main_wholesaler_id!;

    // Parse the Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no data rows' });
    }

    // Normalize column names (handle different naming conventions)
    const normalizeKey = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_');
    
    const results = {
      total: rawData.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; medicine: string; error: string }>,
    };

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Normalize keys
        const normalized: Record<string, any> = {};
        for (const key in row) {
          normalized[normalizeKey(key)] = row[key];
        }

        // Extract medicine name (required)
        const medicine_name = 
          normalized.medicine_name || 
          normalized.name || 
          normalized.medicine ||
          normalized.product_name ||
          normalized.product;

        if (!medicine_name || String(medicine_name).trim() === '') {
          results.failed++;
          results.errors.push({
            row: rowNum,
            medicine: 'Unknown',
            error: 'Medicine name is required',
          });
          continue;
        }

        // Extract price (required)
        const priceValue = 
          normalized.price || 
          normalized.selling_price || 
          normalized.rate ||
          normalized.cost;

        if (!priceValue || isNaN(parseFloat(String(priceValue)))) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            medicine: String(medicine_name),
            error: 'Valid price is required',
          });
          continue;
        }

        // Extract optional fields
        const brand = normalized.brand || null;
        const mrp = normalized.mrp ? parseFloat(String(normalized.mrp)) : null;
        const price = parseFloat(String(priceValue));
        
        const stockValue = normalized.stock_qty || normalized.stock || normalized.quantity || normalized.qty;
        const stock_qty = stockValue && !isNaN(parseInt(String(stockValue))) 
          ? parseInt(String(stockValue)) 
          : null;

        // Parse expiry date (handle YYYY-MM or YYYY-MM-DD formats)
        let expiry_date: Date | null = null;
        const expiryValue = normalized.expiry_date || normalized.expiry || normalized.exp_date;
        if (expiryValue) {
          const expiryStr = String(expiryValue).trim();
          // Try parsing as date
          if (expiryStr.match(/^\d{4}-\d{2}(-\d{2})?$/)) {
            // YYYY-MM or YYYY-MM-DD format
            expiry_date = new Date(expiryStr.includes('-') && expiryStr.split('-').length === 2 
              ? `${expiryStr}-01` 
              : expiryStr);
          } else if (expiryStr.match(/^\d{2}\/\d{4}$/)) {
            // MM/YYYY format
            const [month, year] = expiryStr.split('/');
            expiry_date = new Date(`${year}-${month}-01`);
          }
        }

        const gstValue = normalized.gst_rate || normalized.gst || normalized.tax;
        const gst_rate = gstValue && !isNaN(parseFloat(String(gstValue))) 
          ? parseFloat(String(gstValue)) 
          : 5;

        const hsn_code = normalized.hsn_code || normalized.hsn || '3004';
        const unit_type = normalized.unit_type || normalized.unit || 'strip';

        // Check if medicine already exists
        const existing = await prisma.mainWholesalerMedicine.findFirst({
          where: {
            main_wholesaler_id: mwId,
            medicine_name: String(medicine_name).trim(),
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            medicine: String(medicine_name),
            error: 'Medicine already exists in catalog',
          });
          continue;
        }

        // Create medicine
        await prisma.mainWholesalerMedicine.create({
          data: {
            main_wholesaler_id: mwId,
            medicine_name: String(medicine_name).trim(),
            brand: brand ? String(brand).trim() : null,
            mrp,
            price,
            stock_qty,
            expiry_date,
            gst_rate,
            hsn_code: String(hsn_code).trim(),
            unit_type: String(unit_type).trim(),
            is_active: true,
          },
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          medicine: row.medicine_name || row.name || 'Unknown',
          error: err.message || 'Failed to import',
        });
      }
    }

    return res.json(results);
  } catch (err: any) {
    console.error('Bulk import error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

/**
 * GET /api/bulk-import/template
 * Download a sample Excel template for bulk import
 */
router.get('/template', (_req, res) => {
  try {
    const sampleData = [
      {
        medicine_name: 'Paracetamol 500mg',
        brand: 'Crocin',
        mrp: 25.00,
        price: 20.00,
        stock_qty: 100,
        expiry_date: '2025-12',
        gst_rate: 5,
        hsn_code: '3004',
        unit_type: 'strip',
      },
      {
        medicine_name: 'Amoxicillin 250mg',
        brand: 'Novamox',
        mrp: 45.00,
        price: 35.00,
        stock_qty: 50,
        expiry_date: '2026-06',
        gst_rate: 5,
        hsn_code: '3004',
        unit_type: 'strip',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines');

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // medicine_name
      { wch: 15 }, // brand
      { wch: 10 }, // mrp
      { wch: 10 }, // price
      { wch: 10 }, // stock_qty
      { wch: 12 }, // expiry_date
      { wch: 10 }, // gst_rate
      { wch: 10 }, // hsn_code
      { wch: 12 }, // unit_type
    ];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=medicine_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    console.error('Template generation error:', err);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

export default router;
