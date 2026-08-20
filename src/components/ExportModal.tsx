import React, { useState, useMemo } from 'react';
import { X, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel } from '../utils/excel';
import { exportToPdf } from '../utils/pdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  type: 'materials' | 'sales' | 'ledger' | 'purchases';
  filename: string;
}

export default function ExportModal({ isOpen, onClose, data, type, filename }: ExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => {
    if (type !== 'materials') return [];
    const cats = new Set(data.map(item => item.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [data, type]);

  if (!isOpen) return null;

  const getFilteredData = () => {
    let filteredData = [...data];

    if (type === 'materials' && category) {
      filteredData = filteredData.filter(item => item.category === category);
    }

    if ((type === 'sales' || type === 'ledger' || type === 'purchases') && startDate) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.created_at || item.timestamp || item.date);
        return itemDate >= new Date(startDate);
      });
    }

    if ((type === 'sales' || type === 'ledger' || type === 'purchases') && endDate) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.created_at || item.timestamp || item.date);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate <= end;
      });
    }

    return filteredData;
  };

  const handleExportExcel = () => {
    try {
      const filteredData = getFilteredData();
      exportToExcel(filteredData, `${filename}-${new Date().toISOString().split('T')[0]}`);
      toast.success('Excel export successful');
      onClose();
    } catch (e: any) {
      toast.error('Excel export failed: ' + String(e.message || e));
    }
  };

  const handleExportPdf = () => {
    try {
      const filteredData = getFilteredData();
      const title = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
      exportToPdf(filteredData, `${filename}-${new Date().toISOString().split('T')[0]}`, title);
      toast.success('PDF export successful');
      onClose();
    } catch (e: any) {
      toast.error('PDF export failed: ' + String(e.message || e));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6">Export Data</h2>
        
        <div className="space-y-4 mb-6">
          {type === 'materials' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
              >
                <option value="">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={`exp-cat-${cat}-${idx}`} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {(type === 'sales' || type === 'ledger' || type === 'purchases') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>
    </div>
  );
}
