import { useTableColumns } from '../hooks/useTableColumns';
import ColumnToggle from '../components/ColumnToggle';
import ResizableHeader from '../components/ResizableHeader';
import toast from "react-hot-toast";
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Printer, Search, Download, Upload as Export, Import, Trash, Upload, Plus, Mail, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import jsPDF from 'jspdf';
import type { Sale, Settings } from '../types';
import ExportModal from '../components/ExportModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { importFromExcel } from '../utils/excel';
import { emailInvoice } from '../utils/invoice';
import { formatCurrency, formatDate } from '../utils/formatters';

import { parseResponseJson } from '../utils/safeFetch';

export default function SalesList() {
  const [sales, setSales] = useState<Sale[]>([]);
  const { columns, toggleVisibility, setWidth } = useTableColumns('sales-cols-v3', [
    { id: 'invoice', label: 'Invoice #', visible: true },
    { id: 'date', label: 'Date', visible: true },
    { id: 'customer', label: 'Customer', visible: true },
    { id: 'payment', label: 'Payment', visible: true },
    { id: 'total', label: 'Total', visible: true },
  ]);
  const isColVisible = (id: string) => columns.find(c => c.id === id)?.visible ?? true;
  const getColWidth = (id: string) => columns.find(c => c.id === id)?.width;
  const [search, setSearch] = useState('');
  type SortField = 'date' | 'customer' | 'total';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [settings, setSettings] = useState<Settings | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Sale | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredSales.map(s => s.id));
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => 
        fetch(`/api/sales/${id}`, { 
          method: 'DELETE',
          headers: {
            'x-user-role': localStorage.getItem('auth_role') || 'admin'
          }
        })
      ));
      setSales(prev => prev.filter(s => !selectedIds.includes(s.id)));
      toast.success(`${selectedIds.length} sale invoice(s) deleted successfully`);
      setBulkDeleteModal(false);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Error deleting sales');
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const loadData = () => {
    fetch('/api/sales')
      .then(res => parseResponseJson(res, []))
      .then(data => {
        if (Array.isArray(data)) {
          setSales(data);
        } else {
          setSales([]);
        }
      })
      .catch(err => {
        console.error(err);
        setSales([]);
      });
  };

  useEffect(() => {
    loadData();
    fetch('/api/settings').then(r => parseResponseJson(r, {})).then(setSettings);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const results = await importFromExcel(file);
      const salesData = results.map((row: any) => {
        const lowerRow: any = {};
        for (const key of Object.keys(row)) {
          lowerRow[key.toLowerCase().trim()] = row[key];
        }
        return {
        invoice_number: row.invoice_number || row.Invoice || row['Invoice Number'] || lowerRow['invoice number'] || lowerRow['invoice'] || '',
        date: row.date || row.Date || lowerRow['date'] || new Date().toISOString(),
        customer_name: row.customer_name || row.Customer || row['Customer Name'] || lowerRow['customer name'] || lowerRow['customer'] || lowerRow['client'] || '',
        customer_phone: row.customer_phone || row.Phone || row['Customer Phone'] || lowerRow['customer phone'] || lowerRow['phone'] || lowerRow['mobile'] || '',
        customer_address: row.customer_address || row.Address || row['Customer Address'] || lowerRow['customer address'] || lowerRow['address'] || lowerRow['location'] || '',
        customer_tax_id: row.customer_tax_id || row.TaxID || row['Customer Tax ID'] || lowerRow['customer tax id'] || lowerRow['tax id'] || lowerRow['gst'] || '',
        payment_mode: row.payment_mode || row.Payment || row['Payment Mode'] || lowerRow['payment mode'] || lowerRow['payment'] || 'Cash',
        subtotal: parseFloat(row.subtotal || row.Subtotal || lowerRow['subtotal']) || 0,
        discount: parseFloat(row.discount || row.Discount || lowerRow['discount']) || 0,
        tax_rate: parseFloat(row.tax_rate || row.TaxRate || row['Tax Rate'] || lowerRow['tax rate'] || lowerRow['tax %']) || 0,
        tax_amount: parseFloat(row.tax_amount || row.TaxAmount || row['Tax Amount'] || lowerRow['tax amount'] || lowerRow['tax']) || 0,
        grand_total: parseFloat(row.grand_total || row.Total || row['Grand Total'] || lowerRow['grand total'] || lowerRow['total']) || 0,
        remarks: row.remarks || row.Remarks || lowerRow['remarks'] || lowerRow['notes'] || ''
      };});

      const res = await fetch('/api/sales/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales: salesData })
      });

      if (res.ok) {
        toast.success('Sales imported successfully');
        loadData();
      } else {
        toast.error('Failed to import sales');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error parsing or uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteClick = (sale: Sale) => {
    setItemToDelete(sale);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const invoiceNum = target.invoice_number || target.id;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/sales/${target.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': localStorage.getItem('auth_role') || 'Admin'
        }
      });

      if (res.ok) {
        setSales(prev => prev.filter(s => s.id !== target.id));
        setSelectedIds(prev => prev.filter(id => id !== target.id));
        toast.success(`Sale invoice "${invoiceNum}" successfully deleted`);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } else {
        toast.error('Failed to delete sale invoice');
        loadData();
      }
    } catch (e) {
      console.error('Error deleting sale:', e);
      toast.error('Error deleting sale');
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSales = (Array.isArray(sales) ? sales : []).filter(s => 
    s.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
    s.customer_name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'customer') {
      comparison = a.customer_name.localeCompare(b.customer_name);
    } else if (sortField === 'total') {
      comparison = a.grand_total - b.grand_total;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });


  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sales History</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer sales, POS transactions, and outbound inventory.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.length > 0 && localStorage.getItem('auth_role') === 'admin' && (
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm shadow-2xs"
            >
              <Trash className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs disabled:opacity-50"
          >
            <Import className="w-4 h-4" /> {isUploading ? 'Importing...' : 'Import'}
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs"
          >
            <Export className="w-4 h-4" /> Export
          </button>
          <Link
            to="/sales/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold text-sm shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Manual Entry
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by invoice number or customer..."
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
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" onChange={handleSelectAll} checked={filteredSales.length > 0 && selectedIds.length === filteredSales.length} className="rounded border-gray-300 text-black focus:ring-black" />
                </th>
                {isColVisible('invoice') && (
                  <ResizableHeader 
                    width={getColWidth('invoice')} 
                    onResize={(w) => setWidth('invoice', w)} 
                    className="p-4 select-none w-[15%] min-w-[130px]"
                  >
                    <span>Invoice #</span>
                  </ResizableHeader>
                )}
                {isColVisible('date') && (
                  <ResizableHeader 
                    width={getColWidth('date')} 
                    onResize={(w) => setWidth('date', w)} 
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none w-[15%] min-w-[120px]"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      {sortField === 'date' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                {isColVisible('customer') && (
                  <ResizableHeader 
                    width={getColWidth('customer')} 
                    onResize={(w) => setWidth('customer', w)} 
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none w-[32%] min-w-[200px]"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer</span>
                      {sortField === 'customer' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                {isColVisible('payment') && (
                  <ResizableHeader 
                    width={getColWidth('payment')} 
                    onResize={(w) => setWidth('payment', w)} 
                    className="p-4 select-none w-[14%] min-w-[130px]"
                  >
                    <span>Payment Mode</span>
                  </ResizableHeader>
                )}
                {isColVisible('total') && (
                  <ResizableHeader 
                    width={getColWidth('total')} 
                    onResize={(w) => setWidth('total', w)} 
                    className="p-4 cursor-pointer hover:bg-gray-100/60 select-none text-right w-[14%] min-w-[130px]"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Amount</span>
                      {sortField === 'total' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black" /> : <ArrowDown className="w-3.5 h-3.5 text-black" />) : <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </ResizableHeader>
                )}
                <th className="p-4 text-right w-44 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 text-sm">
              {filteredSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 text-center">
                    <input type="checkbox" aria-label={`Select invoice ${s.invoice_number}`} checked={selectedIds.includes(s.id)} onChange={(e) => handleSelectOne(e, s.id)} className="rounded border-gray-300 text-black focus:ring-black" />
                  </td>
                  {isColVisible('invoice') && (
                    <td className="p-4 font-mono text-xs text-gray-600">
                      {s.invoice_number}
                    </td>
                  )}
                  {isColVisible('date') && (
                    <td className="p-4 text-gray-600">
                      {formatDate(s.date)}
                    </td>
                  )}
                  {isColVisible('customer') && (
                    <td className="p-4 font-semibold text-gray-900">
                      {s.customer_name || 'Walk-in Customer'}
                    </td>
                  )}
                  {isColVisible('payment') && (
                    <td className="p-4 text-gray-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 uppercase tracking-wider">
                        {s.payment_mode || 'Cash'}
                      </span>
                    </td>
                  )}
                  {isColVisible('total') && (
                    <td className="p-4 text-right font-bold text-gray-900">
                      {formatCurrency(s.grand_total)}
                    </td>
                  )}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/sales/${s.id}/print`}
                        aria-label={`Print invoice ${s.invoice_number}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print
                      </Link>
                      <button
                        onClick={() => emailInvoice(s.id, settings)}
                        aria-label={`Email invoice ${s.invoice_number}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteClick(s);
                        }}
                        className="inline-flex items-center justify-center p-1.5 border border-red-200 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                        title="Delete Sale Invoice"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-700">No sales found.</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Manual Entry" to record a new customer sale.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Sale Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Sale Invoice"
        itemName={itemToDelete ? `Invoice #${itemToDelete.invoice_number}` : undefined}
        itemNoun="sale invoice"
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Deletion"
        itemCount={selectedIds.length}
        itemNoun="sale invoice"
        isDeleting={isDeleting}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={sales}
        type="sales"
        filename="sales_history"
      />
    </div>
  );
}
