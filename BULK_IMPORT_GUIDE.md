# Bulk Medicine Import Guide

## Overview
The bulk import feature allows main wholesalers to import hundreds or thousands of medicines at once using an Excel or CSV file, instead of manually adding them one by one.

## How to Use

### 1. Access Bulk Import
- Log in as a Main Wholesaler
- Navigate to the **Product Catalog** page
- Click the **"Bulk Import"** button (green button with upload icon)

### 2. Download Template
- In the bulk import modal, click **"Download Sample Template"**
- This will download an Excel file with the correct column structure and sample data

### 3. Prepare Your Data
Fill in your Excel/CSV file with the following columns:

#### Required Columns:
- **medicine_name** - The name of the medicine (e.g., "Paracetamol 500mg")
- **price** - Your B2B selling price in rupees (e.g., 20.00)

#### Optional Columns:
- **brand** - Manufacturer or brand name (e.g., "Crocin", "Micro Labs")
- **mrp** - Maximum Retail Price in rupees (e.g., 25.00)
- **stock_qty** - Current stock quantity (e.g., 100)
- **expiry_date** - Expiry date in YYYY-MM format (e.g., "2025-12") or MM/YYYY format (e.g., "12/2025")
- **gst_rate** - GST percentage (default: 5)
- **hsn_code** - HSN code for GST (default: 3004)
- **unit_type** - Unit type: strip, bottle, box, tube, vial, inhaler, sachet (default: strip)

### 4. Column Name Flexibility
The system accepts various column name formats (case-insensitive):
- Medicine name: `medicine_name`, `name`, `medicine`, `product_name`, `product`
- Price: `price`, `selling_price`, `rate`, `cost`
- Stock: `stock_qty`, `stock`, `quantity`, `qty`
- Expiry: `expiry_date`, `expiry`, `exp_date`
- GST: `gst_rate`, `gst`, `tax`
- HSN: `hsn_code`, `hsn`
- Unit: `unit_type`, `unit`

### 5. Upload and Import
- Click **"Select File"** or drag and drop your Excel/CSV file
- Supported formats: .xlsx, .xls, .csv
- Maximum file size: 10MB
- Click **"Import Medicines"** to start the import process

### 6. Review Results
After import completes, you'll see:
- **Total** - Number of rows processed
- **Success** - Number of medicines successfully imported
- **Failed** - Number of rows that failed to import
- **Error Details** - Specific errors for each failed row (row number, medicine name, error message)

## Common Errors and Solutions

### "Medicine name is required"
- Ensure every row has a value in the medicine_name column
- Check for empty rows in your file

### "Valid price is required"
- Ensure the price column contains numeric values
- Remove any currency symbols or text from the price column

### "Medicine already exists in catalog"
- This medicine name is already in your catalog
- Either skip this row or update the existing medicine manually

### "Invalid date format"
- Use YYYY-MM format (e.g., "2025-12") or MM/YYYY format (e.g., "12/2025")
- Ensure dates are valid (month 01-12)

## Tips for Best Results

1. **Start Small** - Test with 10-20 medicines first to ensure your format is correct
2. **Clean Data** - Remove any extra spaces, special characters, or formatting
3. **Consistent Naming** - Use consistent medicine names to avoid duplicates
4. **Backup** - Keep a backup of your original file before importing
5. **Review Errors** - If some rows fail, fix the errors and re-import just those rows

## Example Data

```
medicine_name          | brand      | mrp   | price | stock_qty | expiry_date | gst_rate | hsn_code | unit_type
Paracetamol 500mg     | Crocin     | 25.00 | 20.00 | 100       | 2025-12     | 5        | 3004     | strip
Amoxicillin 250mg     | Novamox    | 45.00 | 35.00 | 50        | 2026-06     | 5        | 3004     | strip
Cetirizine 10mg       | Cetrizet   | 15.00 | 12.00 | 200       | 2025-08     | 5        | 3004     | strip
Azithromycin 500mg    | Azithral   | 85.00 | 70.00 | 75        | 2026-03     | 5        | 3004     | strip
```

## Admin Console Feature (Coming Soon)
Administrators will be able to:
- Upload bulk data on behalf of any wholesaler
- Select the target wholesaler from a dropdown
- Import medicines directly to their catalog
- Monitor import history and statistics

## Support
If you encounter any issues with bulk import:
1. Check this guide for common errors
2. Verify your file format matches the template
3. Contact support with your error details and sample file
