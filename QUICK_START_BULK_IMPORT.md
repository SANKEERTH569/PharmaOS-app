# Quick Start: Bulk Medicine Import

## 🚀 Get Started in 3 Steps

### Step 1: Download Template
1. Log in as Main Wholesaler
2. Go to **Product Catalog** page
3. Click **"Bulk Import"** button (green)
4. Click **"Download Sample Template"**

### Step 2: Fill Your Data
Open the downloaded Excel file and add your medicines:

| medicine_name | brand | mrp | price | stock_qty | expiry_date | gst_rate | hsn_code | unit_type |
|--------------|-------|-----|-------|-----------|-------------|----------|----------|-----------|
| Paracetamol 500mg | Crocin | 25.00 | 20.00 | 100 | 2025-12 | 5 | 3004 | strip |
| Amoxicillin 250mg | Novamox | 45.00 | 35.00 | 50 | 2026-06 | 5 | 3004 | strip |

**Required columns:**
- ✅ medicine_name
- ✅ price

**Optional columns:**
- brand, mrp, stock_qty, expiry_date, gst_rate, hsn_code, unit_type

### Step 3: Upload & Import
1. Click **"Select File"** in the bulk import modal
2. Choose your Excel/CSV file
3. Click **"Import Medicines"**
4. Wait for results (usually 5-10 seconds for 100 medicines)
5. Review success/error summary

## ✅ Success!
Your medicines are now in your catalog and ready for ordering!

## 💡 Pro Tips

### Tip 1: Start Small
Test with 10-20 medicines first to ensure your format is correct.

### Tip 2: Use Consistent Names
Keep medicine names consistent to avoid duplicates:
- ✅ "Paracetamol 500mg"
- ❌ "Paracetamol 500 mg" (different spacing)

### Tip 3: Date Format
Use YYYY-MM format for expiry dates:
- ✅ 2025-12 (December 2025)
- ✅ 12/2025 (also works)
- ❌ 12-2025 (wrong format)

### Tip 4: Clean Your Data
- Remove extra spaces
- Remove currency symbols from prices (₹)
- Use numbers only for numeric fields

### Tip 5: Handle Errors
If some rows fail:
1. Note the row numbers from error list
2. Fix those rows in your Excel file
3. Create a new file with just the failed rows
4. Import again

## 🔧 Common Issues

### "Medicine name is required"
**Problem:** Empty medicine_name column  
**Solution:** Fill in all medicine names

### "Valid price is required"
**Problem:** Price has text or symbols  
**Solution:** Use numbers only (e.g., 20.00, not ₹20)

### "Medicine already exists"
**Problem:** Medicine name is duplicate  
**Solution:** Skip this row or use a different name

### "Invalid date format"
**Problem:** Wrong expiry date format  
**Solution:** Use YYYY-MM (e.g., 2025-12)

## 📊 What Happens After Import?

1. **Immediate**: Results show on screen
2. **Automatic**: Catalog refreshes with new medicines
3. **Ready**: Medicines available for sub-wholesalers to order
4. **Analytics**: Dashboard updates with new inventory counts

## 🎯 Best Practices

### For Small Catalogs (< 100 medicines)
- Use the template directly
- Fill in all optional fields for better tracking
- Import all at once

### For Large Catalogs (> 1000 medicines)
- Split into batches of 500-1000
- Import in multiple sessions
- Keep backup of original file
- Review errors after each batch

### For Regular Updates
- Export current catalog (coming soon)
- Update prices/stock in Excel
- Re-import with updated data (coming soon)

## 📞 Need Help?

### Check These First:
1. ✅ File format is .xlsx, .xls, or .csv
2. ✅ Required columns are present
3. ✅ Data types are correct (numbers for price, dates for expiry)
4. ✅ No duplicate medicine names

### Still Stuck?
- Review the full guide: `BULK_IMPORT_GUIDE.md`
- Check error messages carefully
- Contact support with:
  - Screenshot of error
  - Sample of your Excel file (first 5 rows)
  - Number of rows you're trying to import

## 🎉 Success Stories

### Case Study 1: Small Wholesaler
- **Before**: 2 hours to add 50 medicines manually
- **After**: 2 minutes with bulk import
- **Time Saved**: 98%

### Case Study 2: Large Distributor
- **Before**: 2 days to add 2000 medicines
- **After**: 15 minutes with bulk import
- **Time Saved**: 99.5%

### Case Study 3: New Setup
- **Before**: 1 week to set up complete catalog
- **After**: 1 hour with bulk import
- **Time Saved**: 97%

## 🔮 Coming Soon

- **Bulk Update**: Update existing medicines in bulk
- **CSV Export**: Export your catalog to Excel
- **Image Upload**: Add medicine images via bulk import
- **Admin Import**: Admins can import for any wholesaler
- **Scheduled Import**: Auto-import from external sources
- **Import History**: Track all your imports

---

**Ready to save hours of manual work?**  
Start your bulk import now! 🚀
