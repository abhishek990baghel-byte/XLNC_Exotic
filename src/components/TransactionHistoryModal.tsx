import React, { useEffect, useState } from 'react';
import { X, FileText, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import type { Material } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
}

export default function TransactionHistoryModal({ isOpen, onClose, material }: Props) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && material) {
      setLoading(true);
      fetch(`/api/materials/${material.id}/transactions`)
        .then(res => res.json())
        .then(data => {
          setTransactions(data);
          setLoading(false);
        });
    }
  }, [isOpen, material]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
            <p className="text-sm text-gray-500 mt-1">{material.name} (SKU: {material.sku})</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No transactions found for this material.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                        tx.movement_type.includes('In') ? 'bg-emerald-100 text-emerald-800' :
                        tx.movement_type.includes('Out') ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.movement_type.includes('In') ? <ArrowRight className="w-3 h-3" /> :
                         tx.movement_type.includes('Out') ? <ArrowLeft className="w-3 h-3" /> :
                         <RefreshCw className="w-3 h-3" />}
                        {tx.movement_type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${tx.quantity_changed > 0 ? 'text-emerald-600' : tx.quantity_changed < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {tx.quantity_changed > 0 ? '+' : ''}{tx.quantity_changed} {material.unit}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">Balance: {tx.balance}</p>
                    </div>
                  </div>
                  
                  {(tx.sale_invoice || tx.purchase_invoice || tx.user_name) && (
                    <div className="bg-gray-50 rounded p-3 text-sm flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      {tx.sale_invoice && (
                        <div>
                          <span className="text-gray-500 mr-2">Sale Invoice:</span>
                          <span className="font-medium text-gray-900">{tx.sale_invoice}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500 mr-2">Customer:</span>
                          <span className="font-medium text-gray-900">{tx.customer_name}</span>
                        </div>
                      )}
                      {tx.purchase_invoice && (
                        <div>
                          <span className="text-gray-500 mr-2">Purchase Invoice:</span>
                          <span className="font-medium text-gray-900">{tx.purchase_invoice}</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-500 mr-2">Vendor:</span>
                          <span className="font-medium text-gray-900">{tx.vendor_name}</span>
                        </div>
                      )}
                      {!tx.sale_invoice && !tx.purchase_invoice && tx.user_name && (
                        <div>
                          <span className="text-gray-500 mr-2">Action by:</span>
                          <span className="font-medium text-gray-900">{tx.user_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
