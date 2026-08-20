import toast from "react-hot-toast";
import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Edit, Trash, Printer, Package, History, FileText } from 'lucide-react';
import type { Material, StockLedger as StockLedgerType } from '../types';
import StockLedger from '../components/StockLedger';
import StockTrendChart from '../components/StockTrendChart';
import { TrendingUp } from 'lucide-react';
import TransactionHistoryModal from '../components/TransactionHistoryModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

import { parseResponseJson } from '../utils/safeFetch';
import { useAuth } from '../context/AuthContext';

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isRestricted = role === 'Sales Associate' || role === 'Auditor';
  const [material, setMaterial] = useState<Material | null>(null);
  const [history, setHistory] = useState<StockLedgerType[]>([]);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'QR'>((localStorage.getItem('barcodeFormat') as 'CODE128' | 'QR') || 'QR');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    fetch(`/api/materials/${id}`).then(r => parseResponseJson(r, null)).then(setMaterial);
    fetch(`/api/stock-ledger/${id}`).then(r => parseResponseJson(r, [])).then(data => setHistory(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const confirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete material');
      toast.success('Material deleted successfully');
      navigate('/materials');
    } catch (err) {
      console.error('Error deleting material:', err);
      toast.error('Failed to delete material');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAdjustStock = async (newStock: number, quantityChanged: number) => {
    try {
      const res = await fetch(`/api/materials/${id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStock, quantityChanged })
      });
      if (res.ok) {
        loadData();
        toast.success('Stock adjusted');
      } else {
        toast.error('Failed to adjust stock');
      }
    } catch (e) {
      toast.error('Error adjusting stock');
    }
  };

  const printBarcode = () => {
    try {
      window.print();
    } catch (err: any) {
      toast.error('Print failed: ' + String(err.message || err));
    }
  };

  if (!material) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{material?.name || 'Material Details'}</h1>
        <div className="flex gap-2 no-print">
          {material?.id && (
            <Link to={`/materials/${material.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
              <Edit className="w-4 h-4" /> Edit
            </Link>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDeleteDialogOpen(true);
            }} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm cursor-pointer"
          >
            <Trash className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row gap-8">
            <div className="w-48 h-48 flex-shrink-0 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {material?.photo_url ? (
                <img src={material.photo_url} alt={material?.name || 'Material'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="mt-1 text-gray-900">{material?.category || 'Uncategorized'}</p>
              </div>
              {!isRestricted && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor / Supplier</p>
                  <p className="mt-1 text-gray-900">{material?.supplier || 'N/A'}</p>
                </div>
              )}
              {!isRestricted && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Cost Price</p>
                  <p className="mt-1 text-gray-900">${Number(material?.cost_price || 0).toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Selling Price</p>
                <p className="mt-1 text-gray-900">${Number(material?.selling_price || 0).toFixed(2)}</p>
              </div>
              {!isRestricted && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Profit Margin</p>
                  <p className="mt-1 font-medium text-emerald-600">
                    {material?.cost_price && material.cost_price > 0 
                      ? `${(((material.selling_price || 0) - (material.cost_price || 0)) / (material.cost_price || 1) * 100).toFixed(1)}%` 
                      : 'N/A'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Current Stock</p>
                <p className={`mt-1 font-bold ${Number(material?.stock || 0) < Number(material?.min_stock || 0) ? 'text-red-600' : 'text-emerald-600'}`}>
                  {material?.stock ?? 0} {material?.unit || 'pcs'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Low Stock Threshold</p>
                <p className="mt-1 text-gray-900">{material?.min_stock ?? 0} {material?.unit || 'pcs'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="mt-1 text-gray-900">{material?.notes || 'No notes'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-800">30-Day Stock Trend</h2>
            </div>
            <div className="p-6 bg-white">
              <StockTrendChart history={history} currentStock={material?.stock ?? 0} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-gray-800">Stock Movement History & Adjustment</h2>
              </div>
              <button 
                onClick={() => setIsTransactionModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm no-print cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Full History
              </button>
            </div>
            <div className="p-6 bg-white">
              <StockLedger 
                history={history} 
                currentStock={material?.stock ?? 0} 
                onAdjustStock={handleAdjustStock} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <h3 className="font-semibold text-gray-800 mb-4">Barcode Label</h3>
            <div className="flex justify-center gap-4 mb-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" value="CODE128" checked={barcodeFormat === 'CODE128'} onChange={() => { setBarcodeFormat('CODE128'); localStorage.setItem('barcodeFormat', 'CODE128'); }} className="text-black focus:ring-black" />
                <span className="text-sm font-medium">Code 128</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" value="QR" checked={barcodeFormat === 'QR'} onChange={() => { setBarcodeFormat('QR'); localStorage.setItem('barcodeFormat', 'QR'); }} className="text-black focus:ring-black" />
                <span className="text-sm font-medium">QR Code</span>
              </label>
            </div>

            <div className="bg-white p-4 inline-block mx-auto rounded-lg" ref={barcodeRef}>
              {barcodeFormat === 'CODE128' ? (
                <Barcode value={material?.sku || 'N/A'} width={1.5} height={60} fontSize={14} background="#ffffff" />
              ) : (
                <div className="flex flex-col items-center">
                  <QRCodeSVG value={material?.sku || 'N/A'} size={120} level="M" />
                  <span className="mt-2 font-mono text-sm">{material?.sku || 'N/A'}</span>
                </div>
              )}
            </div>
            <button
              onClick={printBarcode}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm no-print cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Label
            </button>
          </div>
        </div>
      </div>
      
      <TransactionHistoryModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        material={material}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Material"
        itemName={material?.name}
        itemNoun="material"
        isDeleting={isDeleting}
      />
    </div>
  );
}
