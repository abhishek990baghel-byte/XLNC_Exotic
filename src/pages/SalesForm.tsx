import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import SignaturePad from '../components/SignaturePad';
import { Plus, Trash, ArrowLeft, Save, Mail, Printer, CheckCircle  , Camera } from 'lucide-react';
import { emailInvoice } from '../utils/invoice';
import type { Material, Settings } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const saleSchema = z.object({
  customerName: z.string().min(1, 'Customer Name is required'),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerTaxId: z.string().optional(),
  items: z.array(z.object({
    material_id: z.string().min(1, 'Material is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be >= 0'),
  })).min(1, 'At least one item is required'),
});

import { parseResponseJson } from '../utils/safeFetch';

export default function SalesForm() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [taxRates, setTaxRates] = useState<{ id: string, name: string, rate: number }[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [successSaleId, setSuccessSaleId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [discount, setDiscount] = useState(0);
  const [selectedTaxRate, setSelectedTaxRate] = useState<number>(0);
  
  const [items, setItems] = useState<{ id: string, material_id: string, quantity: number, unit_price: number }[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScan = (sku: string) => {
    const mat = materials.find(m => m.sku === sku);
    if (mat) {
      setItems([...items, { id: Date.now().toString(), material_id: mat.id, quantity: 1, unit_price: mat.selling_price }]);
      toast.success(`Added ${mat.name}`);
    } else {
      toast.error(`No material found with SKU: ${sku}`);
    }
  };


  useEffect(() => {
    fetch('/api/materials')
      .then(r => parseResponseJson(r, []))
      .then(data => setMaterials(Array.isArray(data) ? data : []))
      .catch(() => setMaterials([]));
    fetch('/api/settings').then(r => parseResponseJson<any>(r, null)).then(data => {
      if (data) {
        setSettings(data);
        if (data.tax_rates) {
          try {
            const parsed = JSON.parse(data.tax_rates);
            setTaxRates(parsed);
          } catch (e) {
            console.error("Failed to parse tax rates", e);
          }
        }
      }
    });
  }, []);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), material_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      if (field === 'material_id') {
        const mat = materials.find(m => m.id === value);
        if (mat) {
          updatedItem.unit_price = mat.selling_price;
          updatedItem.quantity = 1;
        }
      }

      if (field === 'quantity') {
        const mat = materials.find(m => m.id === updatedItem.material_id);
        if (mat && value > mat.stock) {
          toast.error(`Cannot exceed available stock of ${mat.stock} for ${mat.name}`);
          updatedItem.quantity = mat.stock;
        } else if (value < 1) {
          updatedItem.quantity = 1;
        }
      }
      
      return updatedItem;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const amountAfterDiscount = subtotal - discount;
  const taxAmount = amountAfterDiscount * (selectedTaxRate / 100);
  const grandTotal = amountAfterDiscount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      saleSchema.parse({
        customerName,
        customerPhone,
        customerAddress,
        customerTaxId,
        items
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        (error as any).errors.forEach(err => toast.error(err.message));
        return;
      }
    }

    const payload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_tax_id: customerTaxId,
      payment_mode: paymentMode,
      remarks,
      discount,
      tax_rate: selectedTaxRate,
      subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      customer_signature: customerSignature,
      items: items.map(i => ({
        material_id: i.material_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.quantity * i.unit_price
      }))
    };

    const loadingToast = toast.loading('Creating sale...');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await parseResponseJson<any>(res, {});
        setSuccessSaleId(data.id);
        toast.success('Sale created successfully!', { id: loadingToast });
      } else {
        const err = await parseResponseJson<any>(res, {});
        toast.error(err.error || 'Failed to create sale', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error creating sale', { id: loadingToast });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Manual Sale</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Customer Name *</label>
              <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email / Address</label>
              <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tax ID</label>
              <input type="text" value={customerTaxId} onChange={e => setCustomerTaxId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-lg font-semibold text-gray-800">Items</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsScannerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors">
              <Camera className="w-4 h-4" /> Scan Item
            </button>
            <button type="button" onClick={handleAddItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No items added. Click 'Add Item' to start.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 w-32">Quantity</th>
                      <th className="px-4 py-3 w-32">Unit Price</th>
                      <th className="px-4 py-3 w-32">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(item => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-2">
                          <select 
                            required
                            value={item.material_id}
                            onChange={(e) => handleItemChange(item.id, 'material_id', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-black focus:border-black"
                          >
                            <option value="">Select Material...</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.sku}) - {m.stock} in stock</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            min="1" 
                            max={materials.find(m => m.id === item.material_id)?.stock || 1}
                            required
                            value={item.quantity} 
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-black focus:border-black"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            required
                            value={item.unit_price} 
                            onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-black focus:border-black"
                          />
                        </td>
                        <td className="px-4 py-2 font-medium text-sm">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">Summary & Payment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Credit</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Remarks / Notes</label>
                <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black" />
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Discount ($)</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={discount || ''} 
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right focus:ring-black focus:border-black" 
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Tax</span>
                <select
                  value={selectedTaxRate}
                  onChange={e => setSelectedTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-48 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-black focus:border-black"
                >
                  <option value={0}>No Tax (0%)</option>
                  {taxRates.map(tr => (
                    <option key={tr.id} value={tr.rate}>{tr.name} ({tr.rate}%)</option>
                  ))}
                </select>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax Amount</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-end mt-4">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-2xl font-bold text-black">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
          <SignaturePad onSignatureChange={setCustomerSignature} />
        </div>

        <div className="flex justify-end pt-4 pb-12">
          <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-base">
            <Save className="w-5 h-5" /> Save Sale
          </button>
        </div>
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />

      </form>
      {successSaleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sale Completed</h2>
            <p className="text-gray-500 mb-6">The sale has been successfully recorded.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => emailInvoice(successSaleId, settings)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-5 h-5" /> Email Invoice to Customer
              </button>
              <button
                onClick={() => navigate(`/sales/${successSaleId}/print`)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-5 h-5" /> Print Invoice
              </button>
              <button
                onClick={() => navigate('/sales')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Sales List
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
