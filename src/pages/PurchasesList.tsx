import React, { useEffect, useState, useRef } from "react";
import toast from 'react-hot-toast';
import { Upload, Upload as Export, Import, FileText, Camera, Check, X, Plus, Trash, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Eye, Paperclip, RefreshCw, FileImage } from 'lucide-react';
import { importFromExcel } from '../utils/excel';
import ExportModal from '../components/ExportModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import type { Purchase, Material } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useTableColumns } from '../hooks/useTableColumns';
import ColumnToggle from '../components/ColumnToggle';
import ResizableHeader from '../components/ResizableHeader';
import { parseResponseJson } from '../utils/safeFetch';

export default function PurchasesList() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const { columns, toggleVisibility, setWidth } = useTableColumns('purchases-cols', [
    { id: 'vendor', label: 'Vendor', visible: true, width: 250 },
    { id: 'invoice', label: 'Invoice #', visible: true, width: 150 },
    { id: 'date', label: 'Date', visible: true, width: 150 },
    { id: 'total', label: 'Total', visible: true, width: 150 },
  ]);
  const isColVisible = (id: string) => columns.find(c => c.id === id)?.visible ?? true;
  const getColWidth = (id: string) => columns.find(c => c.id === id)?.width;
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileDropRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<{
    vendor_name: string;
    invoice_number: string;
    date: string;
    total_amount: number;
    fileUrl?: string;
    items: Array<{
      material_id: string;
      name?: string;
      quantity: number;
      unit_price: number;
      total: number;
      isNew?: boolean;
    }>;
  }>({
    vendor_name: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    fileUrl: '',
    items: []
  });

  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  type SortField = 'date' | 'vendor' | 'total';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Purchase | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
    fetch('/api/materials')
      .then(r => parseResponseJson(r, []))
      .then(data => Array.isArray(data) ? setMaterials(data) : setMaterials([]))
      .catch(() => setMaterials([]));
  }, []);

  const loadData = () => {
    fetch(`/api/purchases`)
      .then(r => parseResponseJson(r, []))
      .then(data => {
        if (Array.isArray(data)) {
          setPurchases(data);
        } else {
          setPurchases([]);
        }
      })
      .catch(err => {
        console.error(err);
        setPurchases([]);
      });
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const results = await importFromExcel(file);
      const purchasesData = results.map((row: any) => {
        const lowerRow: any = {};
        for (const key of Object.keys(row)) {
          lowerRow[key.toLowerCase().trim()] = row[key];
        }
        return {
          id: crypto.randomUUID(),
          vendor_name: row.vendor_name || row.Vendor || row['Vendor Name'] || lowerRow['vendor name'] || lowerRow['vendor'] || lowerRow['supplier'] || lowerRow['supplier name'] || '',
          invoice_number: row.invoice_number || row.Invoice || row['Invoice Number'] || lowerRow['invoice number'] || lowerRow['invoice'] || '',
          date: row.date || row.Date || lowerRow['date'] || new Date().toISOString().split('T')[0],
          invoice_file_url: row.invoice_file_url || lowerRow['file url'] || lowerRow['url'] || '',
          total_amount: parseFloat(row.total_amount || row.Total || row['Total Amount'] || lowerRow['total amount'] || lowerRow['total'] || lowerRow['amount']) || 0,
          items: []
        };
      });
      setPurchases(prev => [...purchasesData, ...prev]);
      toast.success('Purchases imported successfully!');
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Failed to import. Please check the Excel format.');
    } finally {
      setIsImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPurchases.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteClick = (purchase: Purchase) => {
    setItemToDelete(purchase);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const invoiceNum = target.invoice_number || target.id;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/purchases/${target.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPurchases(prev => prev.filter(p => p.id !== target.id));
        setSelectedIds(prev => prev.filter(id => id !== target.id));
        toast.success(`Purchase invoice "${invoiceNum}" successfully deleted`);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } else {
        toast.error('Failed to delete purchase invoice');
        loadData();
      }
    } catch (err) {
      console.error('Error deleting purchase invoice:', err);
      toast.error('Error deleting purchase invoice');
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => 
        fetch(`/api/purchases/${id}`, { method: 'DELETE' })
      ));
      setPurchases(prev => prev.filter(p => !selectedIds.includes(p.id)));
      toast.success(`${selectedIds.length} purchase(s) deleted successfully`);
      setBulkDeleteModal(false);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Error deleting purchases');
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNewManualEntry = () => {
    setParsedData({
      vendor_name: '',
      invoice_number: `PUR-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      fileUrl: '',
      items: [
        { material_id: '', quantity: 1, unit_price: 0, total: 0, isNew: true }
      ]
    });
    setVerifyModal(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.fileUrl) {
        setParsedData(prev => ({ ...prev, fileUrl: data.fileUrl }));
        toast.success('Document attached successfully!');
      } else {
        // Fallback create local object URL
        const localUrl = URL.createObjectURL(file);
        setParsedData(prev => ({ ...prev, fileUrl: localUrl }));
        toast.success('Document attached locally.');
      }
    } catch (err) {
      console.warn('Backend upload deferred, using local preview URL:', err);
      const localUrl = URL.createObjectURL(file);
      setParsedData(prev => ({ ...prev, fileUrl: localUrl }));
      toast.success('Document attached.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAddManualItem = () => {
    const newItems = [...(parsedData?.items || [])];
    newItems.push({ material_id: '', quantity: 1, unit_price: 0, total: 0, isNew: true });
    setParsedData({ ...parsedData, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = (parsedData.items || []).filter((_, idx) => idx !== index);
    const updatedTotal = newItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    setParsedData({
      ...parsedData,
      items: newItems,
      total_amount: Math.round(updatedTotal * 100) / 100
    });
  };

  const handleScan = (sku: string) => {
    const mat = materials.find(m => m.sku === sku);
    if (mat) {
      const newItems = [...(parsedData?.items || [])];
      const unitPrice = mat.cost_price || mat.selling_price || 0;
      newItems.push({ 
        material_id: mat.id, 
        name: mat.name,
        quantity: 1, 
        unit_price: unitPrice, 
        total: Math.round(unitPrice * 100) / 100, 
        isNew: false 
      });
      const updatedTotal = newItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
      setParsedData({ 
        ...parsedData, 
        items: newItems,
        total_amount: Math.round(updatedTotal * 100) / 100
      });
      toast.success(`Scanned: ${mat.name}`);
    } else {
      toast.error(`No material found with SKU: ${sku}`);
    }
  };

  const updateParsedItem = (index: number, field: string, value: any) => {
    const newItems = [...(parsedData.items || [])];
    const currentItem = { ...newItems[index], [field]: value };

    if (field === 'material_id') {
      if (value !== '') {
        currentItem.isNew = false;
        const selectedMat = materials.find(m => m.id === value);
        if (selectedMat) {
          currentItem.name = selectedMat.name;
          if (!currentItem.unit_price || currentItem.unit_price === 0) {
            currentItem.unit_price = selectedMat.cost_price || selectedMat.selling_price || 0;
          }
        }
      } else {
        currentItem.isNew = true;
      }
    }

    // Auto-calculate line total whenever quantity or unit_price changes
    const qty = Number(currentItem.quantity ?? 1);
    const price = Number(currentItem.unit_price ?? 0);
    
    if (field === 'quantity' || field === 'unit_price' || field === 'material_id') {
      currentItem.total = Math.round((qty * price) * 100) / 100;
    } else if (field === 'total') {
      currentItem.total = Number(value) || 0;
    } else if (currentItem.total === undefined || currentItem.total === null) {
      currentItem.total = Math.round((qty * price) * 100) / 100;
    }

    newItems[index] = currentItem;

    // Recalculate invoice overall total amount
    const overallTotal = newItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    setParsedData({ 
      ...parsedData, 
      items: newItems,
      total_amount: Math.round(overallTotal * 100) / 100
    });
  };

  const handleConfirmPurchase = async () => {
    if (!parsedData.vendor_name || !parsedData.vendor_name.trim()) {
      toast.error('Please specify a Vendor name.');
      return;
    }
    if (!parsedData.items || parsedData.items.length === 0) {
      toast.error('Please add at least one line item to this purchase entry.');
      return;
    }

    for (const item of parsedData.items) {
      if (item.isNew && (!item.name || !item.name.trim())) {
        toast.error('Please specify a name for newly created material items.');
        return;
      }
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: parsedData.vendor_name.trim(),
          invoice_number: parsedData.invoice_number,
          date: parsedData.date,
          invoice_file_url: parsedData.fileUrl || '',
          total_amount: Number(parsedData.total_amount) || 0,
          items: parsedData.items
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        toast.success('Purchase entry saved and stock ledger updated!');
        setVerifyModal(false);
        loadData();
      } else {
        const errorMsg = data?.error || (typeof data === 'string' ? data : 'Failed to save purchase.');
        toast.error(errorMsg);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving purchase entry.');
    }
  };

  const filteredPurchases = (Array.isArray(purchases) ? purchases : []).filter(p =>
    (p.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.vendor_name || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'vendor') {
      comparison = (a.vendor_name || '').localeCompare(b.vendor_name || '');
    } else if (sortField === 'total') {
      comparison = (a.total_amount || 0) - (b.total_amount || 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const isPdf = parsedData.fileUrl?.toLowerCase().endsWith('.pdf') || parsedData.fileUrl?.includes('application/pdf');

  return (
    <div className="w-full space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendor purchases, attached invoice documents, and inventory intake</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && localStorage.getItem('auth_role') === 'admin' && (
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm shadow-2xs"
            >
              <Trash className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
          )}
          
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={importFileRef} onChange={handleExcelImport} />
          <button 
            onClick={() => importFileRef.current?.click()} 
            disabled={isImporting} 
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs disabled:opacity-50"
          >
            <Import className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import'}
          </button>
          
          <button 
            onClick={() => setIsExportModalOpen(true)} 
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs"
          >
            <Export className="w-4 h-4" /> Export
          </button>

          {/* Primary Action Button */}
          <button 
            onClick={handleNewManualEntry} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold text-sm shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by invoice number or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-black outline-none transition-all shadow-2xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ColumnToggle columns={columns} onToggle={toggleVisibility} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={filteredPurchases.length > 0 && selectedIds.length === filteredPurchases.length} 
                    className="rounded border-gray-300 text-black focus:ring-black" 
                  />
                </th>
                {isColVisible('vendor') && (
                  <ResizableHeader 
                    width={getColWidth('vendor')} 
                    onResize={(w) => setWidth('vendor', w)}
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none"
                    onClick={() => handleSort('vendor')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vendor</span>
                      {sortField === 'vendor' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                {isColVisible('invoice') && (
                  <ResizableHeader 
                    width={getColWidth('invoice')} 
                    onResize={(w) => setWidth('invoice', w)}
                    className="p-4 select-none"
                  >
                    <span>Invoice #</span>
                  </ResizableHeader>
                )}
                {isColVisible('date') && (
                  <ResizableHeader 
                    width={getColWidth('date')} 
                    onResize={(w) => setWidth('date', w)}
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      {sortField === 'date' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                {isColVisible('total') && (
                  <ResizableHeader 
                    width={getColWidth('total')} 
                    onResize={(w) => setWidth('total', w)}
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none text-right"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Amount</span>
                      {sortField === 'total' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                <th className="p-4 text-center w-28">Attachment</th>
                <th className="p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 text-sm">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(purchase.id)}
                      onChange={(e) => handleSelectOne(e, purchase.id)}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                  </td>
                  {isColVisible('vendor') && (
                    <td className="p-4 font-semibold text-gray-900">
                      {purchase.vendor_name || '—'}
                    </td>
                  )}
                  {isColVisible('invoice') && (
                    <td className="p-4 font-mono text-xs text-gray-600">
                      {purchase.invoice_number || '—'}
                    </td>
                  )}
                  {isColVisible('date') && (
                    <td className="p-4 text-gray-600">
                      {purchase.date ? new Date(purchase.date).toLocaleDateString() : '—'}
                    </td>
                  )}
                  {isColVisible('total') && (
                    <td className="p-4 text-right font-bold text-gray-900">
                      ${Number(purchase.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    {purchase.invoice_file_url ? (
                      <a 
                        href={purchase.invoice_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                        title="View Attached Invoice Document"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>View</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteClick(purchase)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete purchase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">No purchases found</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Manual Entry" to record a new supplier purchase</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />

      {/* Side-by-Side Quickbooks-Style Purchase Entry Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex justify-between items-center border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 text-white rounded-xl border border-gray-700 shadow-inner">
                  <FileText className="w-5 h-5 text-gray-200" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    New Purchase Entry
                  </h2>
                  <p className="text-xs text-gray-400">
                    Record supplier purchase details, add inventory line items, and attach invoice/receipt files
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setVerifyModal(false)} 
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body - Side by Side layout */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/40">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Panel: Invoice Attachment & Document Preview */}
                <div className="lg:col-span-5 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-gray-600" /> Invoice Attachment
                    </span>
                    {parsedData.fileUrl && (
                      <div className="flex items-center gap-2">
                        <a 
                          href={parsedData.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Full View
                        </a>
                        <button
                          type="button"
                          onClick={() => setParsedData(prev => ({ ...prev, fileUrl: '' }))}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold ml-1 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {parsedData.fileUrl ? (
                    <div className="border border-gray-300 rounded-2xl overflow-hidden bg-gray-900 h-[500px] flex items-center justify-center relative shadow-inner">
                      {isPdf ? (
                        <iframe 
                          src={parsedData.fileUrl} 
                          className="w-full h-full border-0" 
                          title="Attached Invoice Document" 
                        />
                      ) : (
                        <img 
                          src={parsedData.fileUrl} 
                          alt="Attached Invoice Document" 
                          className="max-h-full max-w-full object-contain p-2" 
                        />
                      )}
                    </div>
                  ) : (
                    /* Interactive File Dropzone */
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileDropRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl h-[500px] flex flex-col items-center justify-center text-center p-8 transition-all cursor-pointer ${
                        isDragOver 
                          ? 'border-black bg-gray-100 scale-[0.99]' 
                          : 'border-gray-300 bg-white hover:bg-gray-50/80 hover:border-gray-400'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileDropRef} 
                        accept="application/pdf,image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                      
                      {uploadingAttachment ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 text-black animate-spin" />
                          <p className="text-sm font-semibold text-gray-700">Uploading invoice document...</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                            <Upload className="w-6 h-6 text-gray-700" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-800">Attach Invoice Document</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                            Drag & drop PDF, JPG, PNG, or WebP invoice here, or click to browse
                          </p>
                          <span className="mt-4 px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full border border-gray-200">
                            Supported: PDF & Images (up to 25MB)
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-gray-500 flex items-center justify-between px-1">
                    <span>Preview stays beside form while you enter items</span>
                    {parsedData.fileUrl && (
                      <button
                        type="button"
                        onClick={() => fileDropRef.current?.click()}
                        className="text-gray-700 font-semibold hover:underline cursor-pointer"
                      >
                        Replace file
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Right Panel: Form Fields & Line Items */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Vendor & Header Info
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Vendor / Supplier Name *</label>
                        <input 
                          list="vendors-list" 
                          type="text" 
                          placeholder="e.g. Acme Stone Supplies" 
                          value={parsedData.vendor_name || ''} 
                          onChange={e => setParsedData({...parsedData, vendor_name: e.target.value})} 
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-medium shadow-2xs" 
                        />
                        <datalist id="vendors-list">
                          {Array.from(new Set(purchases.map(p => p.vendor_name).filter(Boolean))).map((vName, idx) => (
                            <option key={`vendor-opt-${vName}-${idx}`} value={vName} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Invoice / Bill Number</label>
                        <input 
                          type="text" 
                          value={parsedData.invoice_number || ''} 
                          onChange={e => setParsedData({...parsedData, invoice_number: e.target.value})} 
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-mono font-medium shadow-2xs" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Invoice Date</label>
                        <input 
                          type="date" 
                          value={parsedData.date || ''} 
                          onChange={e => setParsedData({...parsedData, date: e.target.value})} 
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-medium shadow-2xs" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Total Amount ($)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={parsedData.total_amount || ''} 
                          onChange={e => setParsedData({...parsedData, total_amount: Number(e.target.value)})} 
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-gray-50 font-bold text-gray-900 shadow-2xs" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Section */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        Line Items ({parsedData.items?.length || 0})
                      </h3>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button" 
                          onClick={() => setIsScannerOpen(true)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" /> Scan Barcode
                        </button>
                        <button 
                          type="button" 
                          onClick={handleAddManualItem} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-xl hover:bg-gray-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Row
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                      {parsedData.items && parsedData.items.length > 0 ? (
                        parsedData.items.map((item, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 shadow-2xs space-y-2 hover:border-gray-300 transition-colors">
                            <div className="flex gap-2 items-center">
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Inventory Material Match</label>
                                <select 
                                  value={item.material_id} 
                                  onChange={e => updateParsedItem(i, 'material_id', e.target.value)}
                                  className="w-full text-xs p-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-black outline-none"
                                >
                                  <option value="">Auto-Create as New Material Item</option>
                                  {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(i)}
                                title="Remove line item"
                                className="mt-4 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {item.isNew && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-blue-700 uppercase">New Material Name *</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Italian Carrara White Marble Slab"
                                  value={item.name || ''} 
                                  onChange={e => updateParsedItem(i, 'name', e.target.value)} 
                                  className="w-full text-xs p-2 border border-blue-300 rounded-xl bg-blue-50/30 focus:bg-white font-medium" 
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-gray-500">Qty</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={item.quantity || 1} 
                                  onChange={e => updateParsedItem(i, 'quantity', Number(e.target.value))} 
                                  className="w-full text-xs p-2 border border-gray-300 rounded-xl bg-white font-medium" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-gray-500">Unit Price ($)</label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  min="0"
                                  value={item.unit_price || 0} 
                                  onChange={e => updateParsedItem(i, 'unit_price', Number(e.target.value))} 
                                  className="w-full text-xs p-2 border border-gray-300 rounded-xl bg-white font-medium" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-gray-500">Line Total ($)</label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={item.total || 0} 
                                  onChange={e => updateParsedItem(i, 'total', Number(e.target.value))} 
                                  className="w-full text-xs p-2 border border-gray-300 rounded-xl font-bold text-gray-900 bg-white" 
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          No line items added yet. Click "Add Row" or scan barcodes to begin adding items.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Calculated Total:</span>
                <span className="text-base font-bold text-gray-900">
                  ${Number(parsedData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => setVerifyModal(false)} 
                  className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmPurchase} 
                  className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  Confirm & Save Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modals */}
      <DeleteConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Purchase Invoice"
        itemName={itemToDelete ? `Invoice #${itemToDelete.invoice_number}` : undefined}
        itemNoun="purchase invoice"
        isDeleting={isDeleting}
      />

      <DeleteConfirmationModal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Deletion"
        itemCount={selectedIds.length}
        itemNoun="purchase invoice"
        isDeleting={isDeleting}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={purchases}
        type="purchases"
        filename="purchases_history"
      />
    </div>
  );
}
