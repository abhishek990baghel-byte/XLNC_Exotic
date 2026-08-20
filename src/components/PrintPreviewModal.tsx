import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Settings2, Layers, CheckSquare, Sparkles, FileText, Plus, Trash2 } from 'lucide-react';
import type { Material } from '../types';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { exportBarcodeSheetsToPdf, chunkItemsIntoSheets } from '../utils/barcodePdf';
import toast from 'react-hot-toast';

function BarcodeRenderer({ 
  value, 
  format, 
  showSku = true 
}: { 
  value: string; 
  format: 'CODE128' | 'QR';
  showSku?: boolean;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (format === 'CODE128' && barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: 1.4,
          height: 40,
          displayValue: false, // We render SKU explicitly below for precise styling
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (e) {
        console.error('Invalid barcode value:', value);
      }
    }
  }, [value, format]);

  if (!value) return <div className="text-red-500 text-xs py-2 font-mono">No SKU</div>;

  if (format === 'QR') {
    return (
      <div className="flex flex-col items-center justify-center p-1">
        <QRCodeSVG value={value} size={64} level="M" />
        {showSku && <span className="mt-1 text-[11px] font-mono font-semibold text-gray-800">{value}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <svg ref={barcodeRef} className="max-w-full h-11"></svg>
      {showSku && <span className="text-[11px] font-mono font-semibold text-gray-800 tracking-wider mt-0.5">{value}</span>}
    </div>
  );
}

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
}

export default function PrintPreviewModal({ isOpen, onClose, materials }: PrintPreviewModalProps) {
  const [format, setFormat] = useState<'CODE128' | 'QR'>(
    () => (localStorage.getItem('barcodeFormat') as 'CODE128' | 'QR') || 'CODE128'
  );

  // Grid preset configuration
  const [cols, setCols] = useState<number>(3);
  const [rows, setRows] = useState<number>(5);
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Fields to include on each label
  const [showName, setShowName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [showCompany, setShowCompany] = useState(true);
  const [companyName, setCompanyName] = useState('XLNC EXOTIC HOMES');

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    localStorage.setItem('barcodeFormat', format);
  }, [format]);

  if (!isOpen) return null;

  // Build expanded materials list based on copiesPerItem
  const expandedList: Material[] = [];
  materials.forEach(mat => {
    const count = Math.max(1, copiesPerItem);
    for (let i = 0; i < count; i++) {
      expandedList.push(mat);
    }
  });

  const itemsPerSheet = Math.max(1, cols * rows);
  const sheets = chunkItemsIntoSheets(expandedList, itemsPerSheet);
  const totalPages = sheets.length;

  const handleDownloadPdf = async () => {
    if (expandedList.length === 0) {
      toast.error('No materials selected to export.');
      return;
    }

    setIsGeneratingPdf(true);
    const toastId = toast.loading(`Generating ${totalPages}-page PDF...`);

    try {
      // Gather all sheet elements
      const sheetElements: HTMLElement[] = [];
      for (let i = 0; i < totalPages; i++) {
        const el = document.getElementById(`barcode-sheet-${i}`);
        if (el) sheetElements.push(el);
      }

      if (sheetElements.length === 0) {
        throw new Error('Sheet elements not found in preview.');
      }

      await exportBarcodeSheetsToPdf(
        sheetElements,
        `Material_Barcodes_${new Date().toISOString().split('T')[0]}.pdf`,
        pageSize,
        orientation
      );

      toast.success(`Successfully downloaded ${totalPages}-page PDF!`, { id: toastId });
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(err.message || 'Failed to generate PDF document', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-gray-100 bg-gray-50/50 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-lg">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Bulk Barcode PDF Generator</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {materials.length} selected items • {expandedList.length} total labels • {totalPages} page{totalPages > 1 ? 's' : ''} ({cols}x{rows} grid)
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || expandedList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c29e30] text-black font-semibold rounded-xl transition-all text-sm shadow-sm hover:shadow disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'Generating PDF...' : 'Download Multi-Page PDF'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Configuration Sidebar */}
          <div className="w-80 border-r border-gray-100 bg-gray-50/80 p-5 overflow-y-auto space-y-6 hidden md:block shrink-0">
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                <Settings2 className="w-4 h-4 text-gray-600" /> Label & Grid Setup
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Barcode Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('CODE128')}
                      className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                        format === 'CODE128' 
                          ? 'bg-black text-white border-black shadow-xs' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Code 128 (1D)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('QR')}
                      className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                        format === 'QR' 
                          ? 'bg-black text-white border-black shadow-xs' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      QR Code (2D)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Grid Preset (Cols x Rows)</label>
                  <select
                    value={`${cols}x${rows}`}
                    onChange={(e) => {
                      const [c, r] = e.target.value.split('x').map(Number);
                      setCols(c);
                      setRows(r);
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-black outline-none"
                  >
                    <option value="2x4">2 x 4 (8 labels/page - Large)</option>
                    <option value="3x5">3 x 5 (15 labels/page - Medium)</option>
                    <option value="4x6">4 x 6 (24 labels/page - Compact)</option>
                    <option value="3x3">3 x 3 (9 labels/page - Square)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Copies per Material</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={copiesPerItem}
                    onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Page Size & Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                      className="bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-black outline-none"
                    >
                      <option value="a4">A4 Paper</option>
                      <option value="letter">Letter Paper</option>
                    </select>

                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                      className="bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-black outline-none"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                <Layers className="w-4 h-4 text-gray-600" /> Label Fields
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCompany}
                    onChange={(e) => setShowCompany(e.target.checked)}
                    className="rounded text-black focus:ring-black border-gray-300"
                  />
                  Company / Header Name
                </label>

                {showCompany && (
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
                  />
                )}

                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(e) => setShowName(e.target.checked)}
                    className="rounded text-black focus:ring-black border-gray-300"
                  />
                  Material Name
                </label>

                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="rounded text-black focus:ring-black border-gray-300"
                  />
                  SKU / Material Code
                </label>

                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-black focus:ring-black border-gray-300"
                  />
                  Price ($)
                </label>

                <label className="flex items-center gap-2 text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCategory}
                    onChange={(e) => setShowCategory(e.target.checked)}
                    className="rounded text-black focus:ring-black border-gray-300"
                  />
                  Category Badge
                </label>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 text-amber-900 text-[11px] leading-relaxed">
              <p className="font-semibold mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Multi-Page Layout
              </p>
              When items exceed {itemsPerSheet} labels per page, sheets are automatically paginated in the PDF and print output.
            </div>
          </div>

          {/* Right Live Multi-Page Document Preview */}
          <div className="flex-1 bg-gray-200/70 p-4 sm:p-6 overflow-y-auto">
            {sheets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">No Materials Selected</p>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Select items in the inventory table to generate a multi-page printable barcode document.
                </p>
              </div>
            ) : (
              <div className="space-y-8 max-w-4xl mx-auto">
                
                {/* Global Print CSS */}
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    .print-container, .print-container * {
                      visibility: visible;
                    }
                    .print-container {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                    }
                    .print-sheet {
                      page-break-after: always;
                      break-after: page;
                      margin: 0 !important;
                      padding: 1.5cm !important;
                      box-shadow: none !important;
                      border: none !important;
                      width: 100% !important;
                      height: 100vh !important;
                    }
                  }
                `}</style>

                <div className="print-container">
                  {sheets.map((sheetItems, sheetIdx) => (
                    <div
                      key={sheetIdx}
                      id={`barcode-sheet-${sheetIdx}`}
                      className="print-sheet bg-white rounded-xl shadow-md border border-gray-200/80 p-6 sm:p-8 transition-all hover:shadow-lg relative overflow-hidden"
                      style={{
                        minHeight: orientation === 'portrait' ? '1020px' : '720px',
                        width: '100%',
                        maxWidth: '820px',
                        margin: '0 auto 2rem auto'
                      }}
                    >
                      {/* Sheet Header */}
                      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                        <div>
                          {showCompany && (
                            <h4 className="font-bold text-gray-900 tracking-wider uppercase text-xs">
                              {companyName}
                            </h4>
                          )}
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                            BARCODE SHEET • {pageSize.toUpperCase()} {orientation.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black text-white">
                            Page {sheetIdx + 1} of {totalPages}
                          </span>
                        </div>
                      </div>

                      {/* Sheet Grid */}
                      <div
                        className="grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                        }}
                      >
                        {sheetItems.map((mat, idx) => (
                          <div
                            key={`${mat.id}-${idx}`}
                            className="flex flex-col items-center justify-between p-3 border border-gray-200 rounded-xl bg-white shadow-2xs hover:border-black transition-colors min-h-[140px] text-center"
                          >
                            {/* Material Name */}
                            {showName && (
                              <p className="font-semibold text-gray-900 text-xs line-clamp-2 leading-tight mb-1">
                                {mat.name}
                              </p>
                            )}

                            {/* Category Badge */}
                            {showCategory && mat.category && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 mb-1">
                                {mat.category}
                              </span>
                            )}

                            {/* Barcode Graphic */}
                            <div className="my-auto py-1 w-full flex items-center justify-center">
                              <BarcodeRenderer value={mat.sku} format={format} showSku={showSku} />
                            </div>

                            {/* Price */}
                            {showPrice && (
                              <p className="text-xs font-bold text-emerald-700 mt-1">
                                ${mat.selling_price ? Number(mat.selling_price).toFixed(2) : '0.00'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Sheet Footer */}
                      <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                        <span>XLNC Inventory Management</span>
                        <span>Sheet {sheetIdx + 1} / {totalPages}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
