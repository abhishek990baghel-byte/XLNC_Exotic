import React from "react";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from 'react';
import { Download, Upload, Plus, Trash, Activity, Database, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Settings } from '../types';

import { parseResponseJson } from '../utils/safeFetch';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    contact: '',
    tax_id: '',
    logo_url: ''
  });
  
  const [taxRates, setTaxRates] = useState<{ id: string, name: string, rate: number }[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    fetch('/api/settings').then(r => parseResponseJson<any>(r, {})).then(data => {
      if (data) {
        setFormData({
          business_name: data.business_name || '',
          address: data.address || '',
          contact: data.contact || '',
          tax_id: data.tax_id || '',
          logo_url: data.logo_url || ''
        });
        if (data.logo_url) {
          setPreview(data.logo_url);
        }
        if (data.tax_rates) {
          try {
            const parsed = JSON.parse(data.tax_rates);
            if (Array.isArray(parsed)) {
              setTaxRates(parsed.map((tr: any, idx: number) => ({
                id: tr.id || `tax-${idx}-${Date.now()}`,
                name: tr.name || '',
                rate: Number(tr.rate) || 0
              })));
            }
          } catch (e) {
            console.error('Failed to parse tax rates', e);
          }
        }
      }
    });

    fetch('/api/system-health')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return parseResponseJson(r, null);
      })
      .then(data => {
        setSystemHealth(data);
      })
      .catch(err => {
        console.error('Failed to fetch system health', err);
      })
      .finally(() => {
        setLoadingHealth(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleAddTaxRate = () => {
    setTaxRates([...taxRates, { id: Date.now().toString(), name: '', rate: 0 }]);
  };

  const handleTaxRateChange = (id: string, field: 'name' | 'rate', value: string | number) => {
    setTaxRates(taxRates.map(tr => tr.id === id ? { ...tr, [field]: value } : tr));
  };

  const handleRemoveTaxRate = (id: string) => {
    setTaxRates(taxRates.filter(tr => tr.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = new FormData();
    payload.append('business_name', formData.business_name);
    payload.append('address', formData.address);
    payload.append('contact', formData.contact);
    payload.append('tax_id', formData.tax_id);
    payload.append('logo_url', formData.logo_url);
    payload.append('tax_rates', JSON.stringify(taxRates));

    if (logoFile) {
      payload.append('logo', logoFile);
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: payload
      });
      if (res.ok) {
        toast.success('Settings saved successfully!');
        window.location.reload(); // Reload to update sidebar logo
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const data = await parseResponseJson(res, {});
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to generate backup');
    }
  };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring will overwrite all current data. Are you sure you want to proceed?')) {
      if (restoreFileRef.current) restoreFileRef.current.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const text = await file.text();
      const parsedData = JSON.parse(text);

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });

      if (res.ok) {
        toast.success('Backup restored successfully!');
        window.location.reload();
      } else {
        const err = await parseResponseJson(res, { error: 'Unknown error' });
        toast.error('Failed to restore backup: ' + (err.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Failed to process backup file. Please ensure it is a valid JSON backup.');
    } finally {
      setIsRestoring(false);
      if (restoreFileRef.current) restoreFileRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Business Settings</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Company Logo</h2>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 flex-shrink-0 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden relative">
              {preview ? (
                <img src={preview} alt="Logo Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm p-4 text-center">Upload Logo</div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Upload official logo</p>
              <p className="text-sm text-gray-500 mt-1">This logo will be used on the sidebar, invoices, and barcode labels.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <input required type="text" name="business_name" value={formData.business_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Business Address</label>
            <textarea required rows={3} name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Contact Number / Email</label>
            <input required type="text" name="contact" value={formData.contact} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tax ID / GST Number</label>
            <input type="text" name="tax_id" value={formData.tax_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm" />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">Tax Rates</h2>
              <p className="text-sm text-gray-500">Define custom tax rates for sales and invoices.</p>
            </div>
            <button
              type="button"
              onClick={handleAddTaxRate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Tax Rate
            </button>
          </div>

          <div className="space-y-4">
            {taxRates.map((tax, index) => (
              <div key={tax.id || `tax-${index}`} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tax Name (e.g. VAT, GST)</label>
                  <input
                    type="text"
                    value={tax.name}
                    onChange={(e) => handleTaxRateChange(tax.id, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-black focus:border-black"
                    placeholder="e.g. State Tax"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tax.rate}
                    onChange={(e) => handleTaxRateChange(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-black focus:border-black"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTaxRate(tax.id)}
                  className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove tax rate"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            {taxRates.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                No custom tax rates defined.
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Data Backup & Restore</h2>
          <p className="text-sm text-gray-500">Export your complete database to a JSON file, or restore from an existing backup.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6">
          <button 
            type="button"
            onClick={handleBackup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" /> Export Backup (JSON)
          </button>
          
          <button 
            type="button"
            onClick={() => restoreFileRef.current?.click()}
            disabled={isRestoring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {isRestoring ? 'Restoring...' : 'Restore Backup'}
          </button>
          <input 
            type="file" 
            accept=".json"
            ref={restoreFileRef}
            onChange={handleRestore}
            className="hidden"
          />
        </div>
      </div>
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">System Health & Diagnostics</h2>
          <p className="text-sm text-gray-500">Monitor application status, API connections, and database record counts.</p>
        </div>

        {loadingHealth ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : systemHealth ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-4">
                <Database className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">Database Records</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Materials:</span> <span className="font-medium text-gray-900">{systemHealth.counts?.materials || 0}</span></div>
                    <div className="flex justify-between"><span>Sales:</span> <span className="font-medium text-gray-900">{systemHealth.counts?.sales || 0}</span></div>
                    <div className="flex justify-between"><span>Purchases:</span> <span className="font-medium text-gray-900">{systemHealth.counts?.purchases || 0}</span></div>
                    <div className="flex justify-between"><span>Stock Ledger:</span> <span className="font-medium text-gray-900">{systemHealth.counts?.ledger || 0}</span></div>
                    <div className="flex justify-between col-span-2 pt-1 border-t border-gray-200 mt-1"><span>Total Audit Logs:</span> <span className="font-medium text-gray-900">{systemHealth.counts?.audit_logs || 0}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-4">
                <Activity className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="w-full">
                  <h3 className="font-medium text-gray-900 text-sm">Services & Storage</h3>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Storage & File Server</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Operational
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Errors & Warnings</h3>
              {systemHealth.recentErrors && systemHealth.recentErrors.length > 0 ? (
                <div className="space-y-2">
                  {systemHealth.recentErrors.map((err: any, i: number) => (
                    <div key={i} className="p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{err.action}</span>
                        <span className="text-xs text-red-600/70">{new Date(err.timestamp).toLocaleString()}</span>
                      </div>
                      <span className="text-red-700">{err.details}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm border border-green-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No recent errors logged. System is running smoothly.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load diagnostic data.</span>
          </div>
        )}
      </div>
    </div>
  );
}
