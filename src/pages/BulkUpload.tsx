import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Upload as Export, Import, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, ArrowLeft, XCircle } from 'lucide-react';
import { importFromExcel } from '../utils/excel';
import { z } from 'zod';

import { parseResponseJson } from '../utils/safeFetch';

// Define the expected schema for an imported material row
const materialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional().default(''),
  unit: z.string().optional().default('pcs'),
  cost_price: z.number().min(0, "Cost Price must be >= 0").optional().default(0),
  selling_price: z.number().min(0, "Selling Price must be >= 0").optional().default(0),
  stock: z.number().int().min(0, "Stock must be >= 0").optional().default(0),
  min_stock: z.number().int().min(0, "Min Stock must be >= 0").optional().default(0),
  supplier: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

type Mode = 'import' | 'export';

interface ValidatedRow {
  original: any;
  parsed: any;
  isValid: boolean;
  errors: string[];
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('import');
  
  // Import state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidatedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    availableStock: true,
    soldItems: false,
    lowStock: false
  });

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setFile(null);
    setValidationReport([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
      toast.error('Invalid file type. Please upload a .xlsx or .csv file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    await validateFile(selectedFile);
  };

  const validateFile = async (selectedFile: File) => {
    setIsValidating(true);
    setValidationReport([]);
    try {
      const rawData = await importFromExcel(selectedFile);
      
      console.log('Raw Excel Data (before processing):', rawData);
      
      const report: ValidatedRow[] = rawData.map(row => {
        // Map common Excel column variations to our schema keys
        const mappedRow = {
          name: row.name || row.Name || row['Material Name'] || '',
          sku: row.sku || row.SKU || row['Item Code'] || '',
          category: row.category || row.Category || row['Type'] || '',
          unit: row.unit || row.Unit || row['UOM'] || 'pcs',
          cost_price: parseFloat(row.cost_price || row.CostPrice || row['Cost Price']) || 0,
          selling_price: parseFloat(row.selling_price || row.SellingPrice || row['Selling Price']) || 0,
          stock: parseInt(row.stock || row.Stock || row['Quantity']) || 0,
          min_stock: parseInt(row.min_stock || row.MinStock || row['Min Stock']) || 0,
          supplier: row.supplier || row.Supplier || row['Vendor'] || '',
          notes: row.notes || row.Notes || row['Remarks'] || ''
        };

        const result = materialSchema.safeParse(mappedRow);
        
        return {
          original: row,
          parsed: result.success ? result.data : mappedRow,
          isValid: result.success,
          errors: result.success ? [] : result.error.issues.map(e => e.message)
        };
      });

      // Filter out completely empty rows
      const nonEmptyReport = report.filter(r => Object.values(r.original).some(v => v !== undefined && v !== null && String(v).trim() !== ''));
      setValidationReport(nonEmptyReport);
      
      const invalidCount = nonEmptyReport.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
        toast.error(`Validation found ${invalidCount} invalid row(s). Please review the errors.`);
      } else if (nonEmptyReport.length > 0) {
        toast.success(`Validation successful! ${nonEmptyReport.length} row(s) ready to import.`);
      } else {
        toast.error('The uploaded file appears to be empty.');
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to parse Excel file. Please ensure it is a valid format.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first.');
      return;
    }

    const validItems = validationReport.filter(r => r.isValid).map(r => r.parsed);
    
    if (validItems.length === 0) {
      toast.error('No valid items to import.');
      return;
    }

    setIsUploading(true);
    
    try {
      const res = await fetch('/api/materials/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems })
      });

      if (res.ok) {
        toast.success(`Successfully imported ${validItems.length} materials!`);
        setFile(null);
        setValidationReport([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => {
          navigate('/materials');
        }, 1500);
      } else {
        const errData = await parseResponseJson<any>(res, {});
        toast.error(errData.error || 'Failed to import materials.');
      }
    } catch (error) {
      toast.error('Failed to import data. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Placeholder for actual export logic
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // simulate network delay
      toast.success('Excel file generated successfully!');
    } catch (error) {
      toast.error('Failed to generate Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Data Import & Export</h1>
      </div>

      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* 1. Import/Export Mode Toggle */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What would you like to do?</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className={`flex-1 cursor-pointer relative p-4 border-2 rounded-xl transition-all ${mode === 'import' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input 
                type="radio" 
                name="mode" 
                value="import" 
                checked={mode === 'import'} 
                onChange={() => handleModeChange('import')}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${mode === 'import' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Import className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold ${mode === 'import' ? 'text-black' : 'text-gray-700'}`}>Import Data</h3>
                  <p className="text-sm text-gray-500">Upload Excel (.xlsx, .csv)</p>
                </div>
              </div>
              {mode === 'import' && <div className="absolute top-4 right-4 text-black"><CheckCircle className="w-5 h-5" /></div>}
            </label>

            <label className={`flex-1 cursor-pointer relative p-4 border-2 rounded-xl transition-all ${mode === 'export' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input 
                type="radio" 
                name="mode" 
                value="export" 
                checked={mode === 'export'} 
                onChange={() => handleModeChange('export')} 
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${mode === 'export' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Export className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold ${mode === 'export' ? 'text-black' : 'text-gray-700'}`}>Export Data</h3>
                  <p className="text-sm text-gray-500">Download Excel</p>
                </div>
              </div>
              {mode === 'export' && <div className="absolute top-4 right-4 text-black"><CheckCircle className="w-5 h-5" /></div>}
            </label>
          </div>
        </div>

        <div className="h-px w-full bg-gray-200 mb-8" />

        {/* Conditional UI based on Mode */}
        {mode === 'import' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-900">Upload Excel File</h3>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">Click to select a file or drag and drop</p>
              <p className="text-sm text-gray-500">.xlsx or .csv up to 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                className="hidden" 
              />
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  disabled={isUploading}
                >
                  Clear
                </button>
              </div>
            )}

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
              <p>Please ensure your Excel file matches the standard template structure. The system will automatically attempt to map columns during upload.</p>
            </div>

            {isValidating && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500 font-medium">Validating data...</span>
              </div>
            )}

            {validationReport.length > 0 && !isValidating && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Validation Report</h4>
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {validationReport.filter(r => r.isValid).length} Valid
                    </span>
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> {validationReport.filter(r => !r.isValid).length} Invalid
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">SKU</th>
                        <th className="px-4 py-2 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {validationReport.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                          <td className="px-4 py-2">
                            {row.isValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900">{row.parsed.name || <span className="text-gray-400 italic">Empty</span>}</td>
                          <td className="px-4 py-2 text-gray-500">{row.parsed.sku}</td>
                          <td className="px-4 py-2 text-red-600 text-xs">{row.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleImport}
                disabled={!file || isUploading || isValidating || validationReport.filter(r => r.isValid).length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading & Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload & Import {validationReport.filter(r => r.isValid).length > 0 ? `(${validationReport.filter(r => r.isValid).length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={exportOptions.availableStock}
                  onChange={(e) => setExportOptions({...exportOptions, availableStock: e.target.checked})}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                />
                <span className="text-gray-700 font-medium">Available Stock (Current Inventory)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={exportOptions.soldItems}
                  onChange={(e) => setExportOptions({...exportOptions, soldItems: e.target.checked})}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                />
                <span className="text-gray-700 font-medium">Sold Items (Historical Sales)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={exportOptions.lowStock}
                  onChange={(e) => setExportOptions({...exportOptions, lowStock: e.target.checked})}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                />
                <span className="text-gray-700 font-medium">Low Stock Alerts Only</span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleExport}
                disabled={isExporting || (!exportOptions.availableStock && !exportOptions.soldItems && !exportOptions.lowStock)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Excel...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Inventory Excel
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
