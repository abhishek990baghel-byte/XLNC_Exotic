import React, { useEffect, useState } from 'react';
import { ArrowLeft, Settings2, History, Download, FileText, CheckSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Material } from '../types';
import PrintPreviewModal from '../components/PrintPreviewModal';

import { parseResponseJson } from '../utils/safeFetch';

export default function BarcodePrintPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const location = useLocation();

  type PrintJob = { id: string; timestamp: string; count: number };
  const [printHistory, setPrintHistory] = useState<PrintJob[]>(() => {
    try {
      const saved = localStorage.getItem('printHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch('/api/materials')
      .then(r => parseResponseJson(r, []))
      .then(data => {
        if (Array.isArray(data)) {
          setMaterials(data);
          // Default select all or location state ids
          if (location.state?.selectedIds) {
            setSelectedIds(new Set(location.state.selectedIds));
          } else {
            setSelectedIds(new Set(data.map(m => m.id)));
          }
        }
      })
      .catch(() => setMaterials([]));
  }, [location.state]);

  const toggleSelectAll = () => {
    if (selectedIds.size === materials.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(materials.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedMaterials = materials.filter(m => selectedIds.has(m.id));

  return (
    <div className="bg-gray-100 min-h-screen -m-6 p-6 print:m-0 print:p-0 print:bg-white">
      {/* Top Header Controls */}
      <div className="print:hidden w-full mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link to="/materials" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory List
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            aria-label="Select or Deselect All Materials"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs font-semibold"
          >
            <CheckSquare className="w-4 h-4 text-gray-500" />
            {selectedIds.size === materials.length ? 'Deselect All' : `Select All (${materials.length})`}
          </button>

          <button
            aria-label="Open PDF Generator Preview"
            onClick={() => setIsPreviewOpen(true)}
            disabled={selectedMaterials.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c29e30] text-black rounded-xl transition-all font-semibold text-sm shadow-xs disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Multi-Page PDF Generator ({selectedMaterials.length})
          </button>

          </div>
      </div>
      
      {/* Print Activity History */}
      {printHistory.length > 0 && (
        <div className="print:hidden w-full mb-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800 text-xs">Recent Label Print Jobs</h3>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">Last {printHistory.length} print tasks</span>
            </div>
            <div className="divide-y divide-gray-100">
              {printHistory.map((job) => (
                <div key={job.id} className="px-6 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="text-xs font-medium text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Printed {job.count} barcode labels
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {new Date(job.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Materials Cards Grid */}
      <div className="bg-white w-full print:m-0 print:p-0 p-8 min-h-screen rounded-2xl border border-gray-200/80 shadow-2xs print:shadow-none">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inventory Barcode Directory</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click items to toggle selection for bulk multi-page PDF generation.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
            {selectedMaterials.length} of {materials.length} selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4 print:text-xs">
          {materials.map(mat => {
            const isSelected = selectedIds.has(mat.id);
            return (
              <div
                key={mat.id}
                onClick={() => toggleSelect(mat.id)}
                className={`flex flex-col items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-black bg-amber-50/40 shadow-xs ring-1 ring-black' 
                    : 'border-gray-200 bg-white hover:border-gray-300 opacity-60'
                }`}
              >
                <div className="w-full flex justify-between items-start mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-gray-400 uppercase">{mat.category}</span>
                </div>

                <span className="font-bold text-center mb-2 line-clamp-1 text-xs text-gray-900">{mat.name}</span>
                
                <div className="py-2 text-center w-full bg-white rounded-lg border border-gray-100 p-2">
                  <p className="font-mono text-xs font-semibold text-gray-800">{mat.sku}</p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-1">
                    ${mat.selling_price ? Number(mat.selling_price).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            );
          })}

          {materials.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-12 text-sm">
              No inventory materials found.
            </div>
          )}
        </div>
      </div>

      {/* Multi-Page PDF Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        materials={selectedMaterials}
      />
    </div>
  );
}
