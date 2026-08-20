import React from 'react';
import { Settings } from '../types';

interface Props {
  config: Partial<Settings>;
  onChange: (config: Partial<Settings>) => void;
}

export default function PrintHeaderConfig({ config, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, [e.target.name]: e.target.value });
  };

  return (
    <div className="no-print bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div className="col-span-full">
        <h3 className="font-semibold text-gray-700 text-sm mb-2">Customize Header for Export/Print</h3>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
        <input 
          type="text" 
          name="business_name"
          value={config.business_name || ''}
          onChange={handleChange}
          className="w-full text-sm border-gray-300 rounded focus:ring-black focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
        <input 
          type="text" 
          name="logo_url"
          value={config.logo_url || ''}
          onChange={handleChange}
          placeholder="https://example.com/logo.png"
          className="w-full text-sm border-gray-300 rounded focus:ring-black focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
        <input 
          type="text" 
          name="address"
          value={config.address || ''}
          onChange={handleChange}
          className="w-full text-sm border-gray-300 rounded focus:ring-black focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contact Info</label>
        <input 
          type="text" 
          name="contact"
          value={config.contact || ''}
          onChange={handleChange}
          className="w-full text-sm border-gray-300 rounded focus:ring-black focus:border-black"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tax ID</label>
        <input 
          type="text" 
          name="tax_id"
          value={config.tax_id || ''}
          onChange={handleChange}
          className="w-full text-sm border-gray-300 rounded focus:ring-black focus:border-black"
        />
      </div>
    </div>
  );
}
