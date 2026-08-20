import toast from "react-hot-toast";
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShoppingCart, Plus, Minus, Trash, Camera, Check, History, Undo2 } from 'lucide-react';
import type { Material } from '../types';
import { useAuth } from '../context/AuthContext';
import { parseResponseJson } from '../utils/safeFetch';

interface CartItem extends Material {
  cart_quantity: number;
}

export default function ScanCart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanHistory, setScanHistory] = useState<{ id: string, sku: string, name: string, timestamp: Date }[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [scanActive, setScanActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Live Fetch
  useEffect(() => {
    let active = true;
    fetch('/api/materials')
      .then(res => parseResponseJson(res, []))
      .then(data => {
        if (active) setMaterials(Array.isArray(data) ? data : []);
      })
      .catch(console.error);

    return () => {
      active = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleScan = (decodedText: string) => {
    addToCartBySku(decodedText);
  };

  const startScanner = () => {
    setScanActive(true);
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250}, rememberLastUsedCamera: true },
        false
      );
      scannerRef.current.render(handleScan, () => {});
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => setScanActive(false)).catch(console.error);
    } else {
      setScanActive(false);
    }
  };

  const addToCartBySku = (sku: string) => {
    const mat = materials.find(m => m.sku.toLowerCase() === sku.trim().toLowerCase());
    if (!mat) {
      toast.error(`No material found with SKU: ${sku}`);
      return;
    }
    
    const existing = cart.find(item => item.id === mat.id);
    if (existing && existing.cart_quantity >= existing.stock) {
      toast.error('Cannot add more than available stock!');
      return;
    }
    if (!existing && mat.stock <= 0) {
      toast.error('Item is out of stock!');
      return;
    }

    setCart(prev => {
      const existingInPrev = prev.find(item => item.id === mat.id);
      if (existingInPrev) {
        return prev.map(item => item.id === mat.id ? { ...item, cart_quantity: item.cart_quantity + 1 } : item);
      }
      return [...prev, { ...mat, cart_quantity: 1 }];
    });

    setScanHistory(prev => [
      { id: Math.random().toString(36).substring(7), sku: mat.sku, name: mat.name, timestamp: new Date() },
      ...prev
    ].slice(0, 10));

    setSkuInput('');
  };

  const undoScan = (historyId: string, sku: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.sku === sku);
      if (existing) {
        if (existing.cart_quantity > 1) {
          return prev.map(item => item.sku === sku ? { ...item, cart_quantity: item.cart_quantity - 1 } : item);
        } else {
          return prev.filter(item => item.sku !== sku);
        }
      }
      return prev;
    });
    setScanHistory(prev => prev.filter(h => h.id !== historyId));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.cart_quantity + delta;
        if (newQ > item.stock) {
          toast.error('Cannot exceed available stock!');
          return item;
        }
        if (newQ < 1) return item;
        return { ...item, cart_quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.selling_price * item.cart_quantity), 0);

  const [saleModal, setSaleModal] = useState(false);
  const [saleData, setSaleData] = useState({
    customer_name: '', customer_phone: '', customer_address: '', customer_tax_id: '',
    payment_mode: 'Cash', discount: 0, tax_rate: 0, remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const saleItems = cart.map(item => ({
        material_id: item.id,
        quantity: item.cart_quantity,
        unit_price: item.selling_price
      }));

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: saleData.customer_name,
          customer_phone: saleData.customer_phone,
          customer_address: saleData.customer_address,
          customer_tax_id: saleData.customer_tax_id,
          payment_mode: saleData.payment_mode,
          items: saleItems,
          discount: saleData.discount,
          tax_rate: saleData.tax_rate,
          remarks: saleData.remarks
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create sale');
      }

      toast.success('Sale and stock allocation recorded successfully!');
      setCart([]);
      setSaleModal(false);
      navigate('/materials');
    } catch (err: any) {
      console.error('Sale creation error:', err);
      toast.error('Failed to complete sale: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Quick Scan & Cart</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 text-center">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Barcode Scanner</h3>
            {!scanActive ? (
              <button onClick={startScanner} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-[#D4AF37] rounded-xl hover:bg-amber-100 transition-colors font-semibold text-sm cursor-pointer">
                <Camera className="w-5 h-5" /> Start Camera Scan
              </button>
            ) : (
              <div className="space-y-4">
                <div id="reader" className="overflow-hidden rounded-xl border border-gray-200"></div>
                <button onClick={stopScanner} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-xs cursor-pointer">
                  Stop Camera
                </button>
              </div>
            )}
            
            <div className="mt-6 flex items-center gap-2">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400 uppercase font-medium">OR</span>
              <hr className="flex-1 border-gray-200" />
            </div>

            <div className="mt-6 space-y-2 text-left">
              <label className="text-xs font-semibold text-gray-700">Manual SKU Entry</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuInput}
                  onChange={e => setSkuInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addToCartBySku(skuInput)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  placeholder="Scan or type SKU..."
                />
                <button
                  onClick={() => addToCartBySku(skuInput)}
                  className="px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-800 text-xs">Recent Scans</h3>
              </div>
              <span className="text-[10px] text-gray-500">Last 10 items</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {scanHistory.length === 0 ? (
                <p className="text-xs text-gray-400 p-6 text-center">No recent scans.</p>
              ) : (
                scanHistory.map((scan) => (
                  <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 line-clamp-1">{scan.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 font-mono">
                        <span>{scan.sku}</span>
                        <span>•</span>
                        <span>{scan.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => undoScan(scan.id, scan.sku)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Undo scan"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Current Cart</h2>
              <span className="bg-black text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {cart.length}
              </span>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear the entire batch?')) {
                    setCart([]);
                    setScanHistory([]);
                  }
                }}
                disabled={cart.length === 0}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" /> Clear Batch
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <ShoppingCart className="w-12 h-12 text-gray-300" />
                  <p className="text-sm">Cart is empty. Scan an item or enter SKU to begin.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1">${(item.selling_price || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-xl">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-gray-50 text-gray-600 cursor-pointer">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-bold text-sm">{item.cart_quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-gray-50 text-gray-600 cursor-pointer">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-bold w-20 text-right text-sm">${(item.cart_quantity * (item.selling_price || 0)).toFixed(2)}</p>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeFromCart(item.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer" title="Remove from cart">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                <span className="text-2xl font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => setSaleModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-bold text-base disabled:opacity-50 cursor-pointer"
              >
                Proceed to Checkout & Allocation <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {saleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Complete Sale & Allocate Stock</h2>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Customer Name *</label>
                  <input type="text" value={saleData.customer_name} onChange={e => setSaleData({...saleData, customer_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Customer Phone</label>
                  <input type="text" value={saleData.customer_phone} onChange={e => setSaleData({...saleData, customer_phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Customer Address</label>
                  <input type="text" value={saleData.customer_address} onChange={e => setSaleData({...saleData, customer_address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Tax ID (Optional)</label>
                  <input type="text" value={saleData.customer_tax_id} onChange={e => setSaleData({...saleData, customer_tax_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Payment Mode</label>
                  <select value={saleData.payment_mode} onChange={e => setSaleData({...saleData, payment_mode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm">
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount ($)</span>
                  <input type="number" value={saleData.discount || ''} onChange={e => setSaleData({...saleData, discount: Number(e.target.value)})} className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tax Rate (%)</span>
                  <input type="number" value={saleData.tax_rate || ''} onChange={e => setSaleData({...saleData, tax_rate: Number(e.target.value)})} className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm" />
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-3">
                  <span>Grand Total</span>
                  <span>${(cartTotal - (saleData.discount || 0) + ((cartTotal - (saleData.discount || 0)) * ((saleData.tax_rate || 0) / 100))).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Remarks / Notes</label>
                <textarea value={saleData.remarks} onChange={e => setSaleData({...saleData, remarks: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" rows={2} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setSaleModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleCreateSale} disabled={!saleData.customer_name || isSubmitting} className="px-5 py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                {isSubmitting ? 'Processing Allocation...' : 'Confirm Sale & Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
