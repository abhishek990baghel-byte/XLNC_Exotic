import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailInvoice } from '../utils/invoice';
import type { Settings } from '../types';
import PrintHeaderConfig from '../components/PrintHeaderConfig';

import { parseResponseJson } from '../utils/safeFetch';

export default function InvoicePrint() {
  const { id } = useParams();
  const [sale, setSale] = useState<any>(null);
  const [settings, setSettings] = useState<Partial<Settings>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/${id}`).then(r => parseResponseJson(r, null)),
      fetch('/api/settings').then(r => parseResponseJson(r, {})).catch(() => ({}))
    ]).then(([saleData, settingsData]) => {
      setSale(saleData);
      if (settingsData) setSettings(settingsData);
    });
  }, [id]);


  const handlePrint = () => {
    try {
      window.print();
    } catch (err: any) {
      toast.error('Print failed: ' + String(err.message || err));
    }
  };

  if (!sale) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 print:bg-white print:p-0">
      <PrintHeaderConfig config={settings} onChange={setSettings} />
      <div className="bg-white p-10 shadow-sm border border-gray-200 print:border-none print:shadow-none print:p-0">
      <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
        <div>
          {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-4" />}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {settings?.business_name || 'XLNC Exotic Homes'}
          </h1>
          {settings?.address && <p className="text-gray-600">{settings.address}</p>}
          {settings?.contact && <p className="text-gray-600">Contact: {settings.contact}</p>}
          {settings?.tax_id && <p className="text-gray-600">Tax ID: {settings.tax_id}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-200 mb-2 uppercase tracking-widest">Invoice</h2>
          <p className="text-gray-600 font-medium">Invoice #: {sale.invoice_number}</p>
          <p className="text-gray-600">Date: {new Date(sale.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
        <p className="text-lg font-medium text-gray-900">{sale.customer_name}</p>
        {sale.customer_address && <p className="text-gray-600">{sale.customer_address}</p>}
        {sale.customer_phone && <p className="text-gray-600">{sale.customer_phone}</p>}
      </div>

      <table className="w-full text-left mb-8">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="py-3 text-sm font-bold text-gray-900">Item Description</th>
            <th className="py-3 text-sm font-bold text-gray-900 text-center">Qty</th>
            <th className="py-3 text-sm font-bold text-gray-900 text-right">Unit Price</th>
            <th className="py-3 text-sm font-bold text-gray-900 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sale.items.map((item: any) => (
            <tr key={item.id}>
              <td className="py-4 text-gray-900">{item.material_name}</td>
              <td className="py-4 text-gray-900 text-center">{item.quantity}</td>
              <td className="py-4 text-gray-900 text-right">${item.unit_price.toFixed(2)}</td>
              <td className="py-4 text-gray-900 text-right font-medium">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-${sale.discount.toFixed(2)}</span>
            </div>
          )}
          {sale.tax_amount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax ({sale.tax_rate}%)</span>
              <span>${sale.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-900 border-t-2 border-gray-900 pt-3 mt-3">
            <span>Total</span>
            <span>${sale.grand_total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {sale.remarks && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks / Notes</h4>
          <p className="text-gray-600">{sale.remarks}</p>
        </div>
      )}
      
      {sale.customer_signature && (
        <div className="mt-12 pt-8 flex justify-end">
          <div className="text-center">
            <img src={sale.customer_signature} alt="Customer Signature" className="h-16 object-contain mb-2 border-b border-gray-400" />
            <p className="text-sm text-gray-600 font-medium">Customer Signature</p>
          </div>
        </div>
      )}

      <div className="mt-16 text-center text-sm text-gray-500 no-print flex items-center justify-center gap-4">
        <button onClick={() => emailInvoice(id!, settings)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
          <Mail className="w-4 h-4" /> Email Invoice
        </button>
        <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
          Print Invoice
        </button>
      </div>
    </div>
    </div>
  );
}
