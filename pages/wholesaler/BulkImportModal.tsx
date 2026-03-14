import React from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface BulkImportModalProps {
  show: boolean;
  onClose: () => void;
  file: File | null;
  setFile: (file: File | null) => void;
  uploading: boolean;
  results: {
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; medicine: string; error: string }>;
  } | null;
  onImport: () => void;
  onDownloadTemplate: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  show,
  onClose,
  file,
  setFile,
  uploading,
  results,
  onImport,
  onDownloadTemplate,
}) => {
  if (!show) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        setFile(selectedFile);
      } else {
        alert('Please select an Excel (.xlsx, .xls) or CSV file');
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bulk Import Medicines</h2>
            <p className="text-xs text-slate-500 mt-1">Upload Excel or CSV file with medicine data</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-2">Required columns in your file:</p>
                <ul className="space-y-1 text-xs">
                  <li><span className="font-bold">medicine_name</span> (required) - Product name</li>
                  <li><span className="font-bold">price</span> (required) - B2B selling price</li>
                  <li><span className="font-bold">brand</span> (optional) - Manufacturer/brand name</li>
                  <li><span className="font-bold">mrp</span> (optional) - Maximum retail price</li>
                  <li><span className="font-bold">stock_qty</span> (optional) - Current stock quantity</li>
                  <li><span className="font-bold">expiry_date</span> (optional) - Format: YYYY-MM or MM/YYYY</li>
                  <li><span className="font-bold">gst_rate</span> (optional) - Default: 5%</li>
                  <li><span className="font-bold">hsn_code</span> (optional) - Default: 3004</li>
                  <li><span className="font-bold">unit_type</span> (optional) - strip, bottle, box, etc.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download template */}
          <div className="flex items-center justify-center">
            <button
              onClick={onDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
            >
              <Download size={16} />
              Download Sample Template
            </button>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select File</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="bulk-file-input"
                disabled={uploading}
              />
              <label
                htmlFor="bulk-file-input"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Upload size={28} className="text-emerald-600" />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700">Click to select file</p>
                    <p className="text-xs text-slate-500">Excel (.xlsx, .xls) or CSV files only</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total</p>
                  <p className="text-2xl font-extrabold text-slate-900">{results.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Success</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{results.success}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                  <p className="text-xs text-rose-600 font-bold uppercase mb-1">Failed</p>
                  <p className="text-2xl font-extrabold text-rose-700">{results.failed}</p>
                </div>
              </div>

              {results.success > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                  <p className="text-emerald-800 text-sm font-medium">
                    Successfully imported {results.success} medicine{results.success !== 1 ? 's' : ''}!
                  </p>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={18} className="text-rose-600" />
                    <p className="font-bold text-rose-900 text-sm">Import Errors ({results.errors.length})</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {results.errors.slice(0, 20).map((err, i) => (
                      <div key={i} className="text-xs bg-white rounded-lg p-2 border border-rose-100">
                        <p className="font-bold text-rose-900">Row {err.row}: {err.medicine}</p>
                        <p className="text-rose-700 mt-0.5">{err.error}</p>
                      </div>
                    ))}
                    {results.errors.length > 20 && (
                      <p className="text-xs text-rose-600 text-center pt-2">
                        ... and {results.errors.length - 20} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
            >
              {results ? 'Close' : 'Cancel'}
            </button>
            {!results && (
              <button
                onClick={onImport}
                disabled={!file || uploading}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Import Medicines
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
