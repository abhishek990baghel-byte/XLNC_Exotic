import React, { useEffect, useState, useRef } from 'react';
import { List } from 'react-window';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { importFromExcel, parseInventoryExcel } from '../utils/excel';
import { Plus, Search, Package, Upload as Export, Import, Camera, Printer, Trash, Sliders, X, FileText, Truck, RotateCcw } from 'lucide-react';
import type { Material } from '../types';
import ExportModal from '../components/ExportModal';
import QuickScanModal from '../components/QuickScanModal';
import PrintPreviewModal from '../components/PrintPreviewModal';
import BulkEditMaterialsModal from '../components/BulkEditMaterialsModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import AllocateToSiteModal from '../components/AllocateToSiteModal';
import ReturnWastageModal from '../components/ReturnWastageModal';
import { useTableColumns } from '../hooks/useTableColumns';
import ColumnToggle from '../components/ColumnToggle';
import ResizableHeader from '../components/ResizableHeader';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { parseResponseJson } from '../utils/safeFetch';

interface MaterialRowData {
  materials: Material[];
  selectedMaterialIds: Set<string>;
  handleSelect: (id: string, checked: boolean) => void;
  isColVisible: (id: string) => boolean;
  onDeleteMaterial: (e: React.MouseEvent, id: string) => void;
  onViewMaterial: (e: React.MouseEvent, material: Material) => void;
  onAllocateMaterial: (e: React.MouseEvent, material: Material) => void;
  onReturnMaterial: (e: React.MouseEvent, material: Material) => void;
  isAdmin: boolean;
  role: string | null;
}

function MaterialRow({ index, style, materials, selectedMaterialIds, handleSelect, isColVisible, onDeleteMaterial, onViewMaterial, onAllocateMaterial, onReturnMaterial, isAdmin, role }: { index: number; style: React.CSSProperties } & MaterialRowData) {
  const m = materials[index];
  if (!m) return null;
  const isSelected = selectedMaterialIds.has(m.id);

  return (
    <div
      style={style}
      className={`flex items-center px-4 py-2 border-b border-gray-100 transition-colors ${
        isSelected ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-gray-50'
      }`}
    >
      <div className="w-12 shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleSelect(m.id, e.target.checked)}
          className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
        />
      </div>

      {isColVisible('material') && (
        <div className="flex-1 min-w-[200px] flex items-center gap-3 pr-2">
          {m.photo_url ? (
            <img src={m.photo_url} alt={m.name || 'Material'} className="w-10 h-10 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div className="truncate">
            <p className="font-semibold text-gray-900 text-sm truncate">{m.name || 'Unnamed Material'}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{m.sku || 'N/A'}</p>
          </div>
        </div>
      )}

      {isColVisible('category') && (
        <div className="w-36 shrink-0 pr-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 truncate">
            {m.category || 'Uncategorized'}
          </span>
        </div>
      )}

      {isColVisible('price') && (
        <div className="w-36 shrink-0 pr-2">
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(m.selling_price)}</p>
          <p className="text-xs text-gray-500">
            Cost: {role !== 'Sales Associate' && role !== 'Auditor' ? formatCurrency(m.cost_price) : <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold tracking-widest">Restricted</span>}
          </p>
        </div>
      )}

      {isColVisible('stock') && (
        <div className="w-32 shrink-0 pr-2">
          <div className="flex flex-col">
            <span className={`font-semibold text-sm ${Number(m.stock || 0) < Number(m.min_stock || 0) ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatNumber(m.stock ?? 0)} {m.unit || 'pcs'}
            </span>
            {Number(m.stock || 0) < Number(m.min_stock || 0) && (
              <span className="text-[10px] text-red-500 font-medium">Low stock</span>
            )}
          </div>
        </div>
      )}

      <div className="w-40 shrink-0 text-right pr-2 flex items-center justify-end gap-1.5">
        <button
          onClick={(e) => onReturnMaterial(e, m)}
          aria-label={`Log Return / Wastage for ${m.name || 'material'}`}
          className="inline-flex items-center justify-center p-1.5 border border-emerald-200 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
          title="Log Return / Wastage"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={(e) => onAllocateMaterial(e, m)}
          aria-label={`Allocate ${m.name || 'material'}`}
          className="inline-flex items-center justify-center p-1.5 border border-indigo-200 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
          title="Allocate to Site"
        >
          <Truck className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <Link
          to={`/materials/${m.id}`}
          onClick={(e) => onViewMaterial(e, m)}
          aria-label={`View details for ${m.name || 'material'}`}
          className="inline-flex items-center justify-center px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black shadow-2xs cursor-pointer"
        >
          View
        </Link>
        {isAdmin && (
          <button
            onClick={(e) => onDeleteMaterial(e, m.id)}
            aria-label={`Delete ${m.name || 'material'}`}
            className="inline-flex items-center justify-center p-1.5 border border-red-200 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors cursor-pointer"
            title="Delete Material"
          >
            <Trash className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function MaterialsList() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  const { columns, toggleVisibility, setWidth } = useTableColumns('materials-cols', [
    { id: 'material', label: 'Material', visible: true, width: 250 },
    { id: 'category', label: 'Category', visible: true, width: 150 },
    { id: 'price', label: 'Price', visible: true, width: 150 },
    { id: 'stock', label: 'Stock', visible: true, width: 150 },
  ]);
  
  const isColVisible = (id: string) => columns.find(c => c.id === id)?.visible ?? true;
  const getColWidth = (id: string) => columns.find(c => c.id === id)?.width;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [allocatingMaterial, setAllocatingMaterial] = useState<Material | null>(null);
  const [returningMaterial, setReturningMaterial] = useState<Material | null>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // REST API Fetch
  useEffect(() => {
    fetch('/api/materials')
      .then(r => parseResponseJson(r, []))
      .then((data) => {
        setMaterials(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch materials', err);
        setLoading(false);
      });
  }, []);

  const handleViewMaterial = (e: React.MouseEvent, material: Material) => {
    e.stopPropagation();
    e.preventDefault();
    if (material?.id) {
      navigate(`/materials/${material.id}`);
    }
  };

  const handleAllocateMaterial = (e: React.MouseEvent, material: Material) => {
    e.stopPropagation();
    e.preventDefault();
    setAllocatingMaterial(material);
  };

  const handleReturnMaterial = (e: React.MouseEvent, material: Material) => {
    e.stopPropagation();
    e.preventDefault();
    setReturningMaterial(material);
  };

  const handleDeleteOneMaterial = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!id) return;
    const target = materials.find(m => m.id === id);
    if (target) {
      setDeletingMaterial(target);
    }
  };

  const confirmDeleteSingle = async () => {
    if (!deletingMaterial) return;
    const target = deletingMaterial;
    setIsDeleting(true);

    try {
      // 1. Immediately update UI state for instant reactivity
      setMaterials(prev => prev.filter(m => m.id !== target.id));
      setSelectedMaterialIds(prev => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });

      // 2. Execute deletion in Express backend
      await fetch(`/api/materials/${target.id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': role || 'admin' }
      });

      toast.success('Material deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting material:', err);
      toast.error('Failed to delete material.');
    } finally {
      setIsDeleting(false);
      setDeletingMaterial(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedMaterialIds.size === 0) return;
    setIsBatchDeleteOpen(true);
  };

  const confirmDeleteBatch = async () => {
    if (selectedMaterialIds.size === 0) return;
    const ids = Array.from(selectedMaterialIds);
    const count = ids.length;
    setIsDeleting(true);

    try {
      // 1. Filter out all deleted IDs from active materials list immediately
      const idSet = new Set(ids);
      setMaterials(prev => prev.filter(m => !idSet.has(m.id)));
      setSelectedMaterialIds(new Set());

      // 2. Execute batch deletion in Express backend
      await fetch('/api/materials/batch-delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role || 'admin' 
        },
        body: JSON.stringify({ ids })
      });

      toast.success(`${count} materials deleted successfully.`);
    } catch (error) {
      console.error('Error batch deleting materials:', error);
      toast.error('Failed to delete selected materials.');
    } finally {
      setIsDeleting(false);
      setIsBatchDeleteOpen(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const toastId = toast.loading('Parsing and importing inventory from Excel...');
    try {
      // 1. Parse Excel data with strict column mappings:
      // SKU -> sku, Material Name -> name, Category -> category,
      // Unit Cost ($) -> cost_price (Number), Quantity on Hand -> stock (Integer), Location -> location
      // Ignoring "Retail Price ($)" and "Status"
      const parsedItems = await parseInventoryExcel(file);

      if (parsedItems.length === 0) {
        toast.error('No valid material rows found in the uploaded file.', { id: toastId });
        return;
      }

      // Filter out existing SKUs to avoid duplicates if any
      const existingSkus = new Set(materials.map(m => m.sku.toLowerCase().trim()));
      let duplicateCount = 0;
      const validItems = parsedItems.filter(item => {
        if (existingSkus.has(item.sku.toLowerCase().trim())) {
          duplicateCount++;
          return false;
        }
        return true;
      });

      if (validItems.length === 0) {
        toast('All materials in this Excel file already exist in inventory.', { id: toastId });
        return;
      }

      // 2. Perform atomic batch import into Express backend
      await fetch('/api/materials/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role || 'admin'
        },
        body: JSON.stringify({ materials: validItems })
      });

      const feedback = duplicateCount > 0 
        ? `Successfully imported ${validItems.length} materials (${duplicateCount} existing skipped).`
        : `Successfully imported ${validItems.length} materials into inventory.`;

      toast.success(feedback, { id: toastId });
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast.error(`Failed to import Excel file: ${error?.message || 'Invalid format'}`, { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const categories = ['All', ...new Set(materials.map(m => m.category).filter(Boolean))].sort();

  const filtered = materials.filter(m => 
    (selectedCategory === 'All' || m.category === selectedCategory) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.sku.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedMaterials = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMaterialIds(new Set(filtered.map(m => m.id)));
    } else {
      setSelectedMaterialIds(new Set());
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedMaterialIds(new Set(filtered.map(m => m.id)));
  };

  const handleClearSelection = () => {
    setSelectedMaterialIds(new Set());
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedMaterialIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedMaterialIds(newSelected);
  };

  const selectedMaterials = materials.filter(m => selectedMaterialIds.has(m.id));

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Live Inventory Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time PostgreSQL inventory sync, stock levels, and barcode PDF generation.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs cursor-pointer"
          >
            <Camera className="w-4 h-4 text-gray-500" /> Quick Scan
          </button>
          
          <button
            onClick={() => {
              if (selectedMaterialIds.size === 0) {
                setSelectedMaterialIds(new Set(filtered.map(m => m.id)));
              }
              setIsPreviewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c29e30] text-black rounded-xl transition-colors font-semibold text-sm shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Barcodes {selectedMaterialIds.size > 0 ? `(${selectedMaterialIds.size})` : ''}
          </button>

          {role === 'admin' && (
            <>
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleExcelImport} />
              <button
                onClick={() => fileInputRef.current?.click()} disabled={isImporting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 shadow-2xs cursor-pointer"
              >
                <Import className="w-4 h-4 text-gray-500" /> {isImporting ? 'Importing...' : 'Import'}
              </button>
            </>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs cursor-pointer"
          >
            <Export className="w-4 h-4 text-gray-500" /> Export
          </button>

          {role === 'admin' && (
            <Link
              to="/materials/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Manual Entry
            </Link>
          )}
        </div>
      </div>

      {/* Floating Bulk Selection Action Bar */}
      {selectedMaterialIds.size > 0 && (
        <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#D4AF37] text-black font-bold text-xs">
              {selectedMaterialIds.size}
            </span>
            <div>
              <p className="font-semibold text-sm">
                {selectedMaterialIds.size} material{selectedMaterialIds.size > 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-gray-400">
                Ready for multi-page barcode PDF generation or batch operations.
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-2 ml-4 border-l border-gray-800 pl-4">
              {selectedMaterialIds.size < filtered.length && (
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-xs text-[#D4AF37] hover:underline font-medium cursor-pointer"
                >
                  Select all {filtered.length} filtered items
                </button>
              )}
              <button
                onClick={handleClearSelection}
                className="text-xs text-gray-400 hover:text-white font-medium cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c29e30] text-black rounded-xl font-semibold text-sm transition-all shadow-2xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Print Barcodes PDF ({selectedMaterialIds.size})
            </button>

            {role === 'admin' && (
              <>
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" /> Bulk Edit
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </>
            )}

            <button
              onClick={handleClearSelection}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors md:hidden"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Category Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sticky top-6">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Categories</h2>
            <div className="space-y-1">
              {categories.map((cat, idx) => (
                <button
                  key={`mat-cat-${cat}-${idx}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Table Container */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            
            {/* Table Search Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search live inventory by name, SKU, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-500">
                <ColumnToggle columns={columns} onToggle={toggleVisibility} />
                <span>Showing {filtered.length} of {materials.length} items</span>
              </div>
            </div>

            {/* Virtualized Table Container */}
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                {/* Table Header */}
                <div className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center px-4 py-3 select-none">
                  <div className="w-12 shrink-0">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedMaterialIds.size === filtered.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                      title="Select All"
                    />
                  </div>
                  {isColVisible('material') && (
                    <div className="flex-1 min-w-[200px] text-left font-semibold">
                      Material
                    </div>
                  )}
                  {isColVisible('category') && (
                    <div className="w-36 shrink-0 text-left font-semibold">
                      Category
                    </div>
                  )}
                  {isColVisible('price') && (
                    <div className="w-36 shrink-0 text-left font-semibold">
                      Price
                    </div>
                  )}
                  {isColVisible('stock') && (
                    <div className="w-32 shrink-0 text-left font-semibold">
                      Stock
                    </div>
                  )}
                  <div className="w-28 shrink-0 text-right pr-2 font-semibold">Actions</div>
                </div>

                {/* Virtualized List Body */}
                {loading ? (
                  <div className="divide-y divide-gray-100">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                        <div className="flex-1 space-y-1">
                          <div className="w-32 h-4 bg-gray-200 rounded"></div>
                          <div className="w-20 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : paginatedMaterials.length > 0 ? (
                  <List<MaterialRowData>
                    rowCount={paginatedMaterials.length}
                    rowHeight={64}
                    rowComponent={MaterialRow}
                    rowProps={{
                      materials: paginatedMaterials,
                      selectedMaterialIds,
                      handleSelect,
                      isColVisible,
                      onDeleteMaterial: handleDeleteOneMaterial,
                      onViewMaterial: handleViewMaterial,
                      onAllocateMaterial: handleAllocateMaterial,
                      onReturnMaterial: handleReturnMaterial,
                      isAdmin: role === 'admin',
                      role: role
                    }}
                    style={{ height: Math.min(520, Math.max(120, paginatedMaterials.length * 64)) }}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No materials found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {filtered.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
                <div>
                  Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * pageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-semibold text-gray-900">{filtered.length}</span> items
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 cursor-pointer"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={500}>500 per page</option>
                    <option value={10000}>All (Virtualized)</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold text-gray-800">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={selectedMaterialIds.size > 0 ? selectedMaterials : materials}
        type="materials"
        filename="inventory_master"
      />
      <QuickScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        materials={materials}
      />
      <PrintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        materials={selectedMaterialIds.size > 0 ? selectedMaterials : filtered}
      />
      <BulkEditMaterialsModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedMaterials={selectedMaterials}
        existingCategories={categories}
        onSuccess={() => {
          setSelectedMaterialIds(new Set());
        }}
      />
      
      {/* Delete Confirmation Modal for Single Item */}
      <DeleteConfirmationModal
        isOpen={!!deletingMaterial}
        onClose={() => setDeletingMaterial(null)}
        onConfirm={confirmDeleteSingle}
        itemName={deletingMaterial?.name}
        isDeleting={isDeleting}
      />

      {/* Delete Confirmation Modal for Batch Items */}
      <DeleteConfirmationModal
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={confirmDeleteBatch}
        itemCount={selectedMaterialIds.size}
        isDeleting={isDeleting}
      />

      <AllocateToSiteModal
        isOpen={!!allocatingMaterial}
        onClose={() => setAllocatingMaterial(null)}
        material={allocatingMaterial}
        onSuccess={() => {
          // Re-fetch materials to update stock
          fetch('/api/materials')
            .then(r => parseResponseJson(r, []))
            .then((data) => setMaterials(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to fetch after allocation', err));
        }}
      />

      <ReturnWastageModal
        isOpen={!!returningMaterial}
        onClose={() => setReturningMaterial(null)}
        material={returningMaterial}
        onSuccess={() => {
          // Re-fetch materials to update stock
          fetch('/api/materials')
            .then(r => parseResponseJson(r, []))
            .then((data) => setMaterials(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to fetch after return/wastage', err));
        }}
      />
    </div>
  );
}
