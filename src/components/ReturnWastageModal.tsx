import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { safeFetch, parseResponseJson } from '../utils/safeFetch';

interface Material {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface ReturnWastageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  material: Material | null;
}

const JOB_SITES = [
  "4162 Delta St",
  "10956 Martinique Way ADU",
  "832 Kalpati Cir",
  "Merritage",
  "Showroom"
];

export default function ReturnWastageModal({ isOpen, onClose, onSuccess, material }: ReturnWastageModalProps) {
  const [type, setType] = useState<'return' | 'wastage'>('return');
  const [quantity, setQuantity] = useState<number>(1);
  const [jobSite, setJobSite] = useState(JOB_SITES[0]);
  const [processedBy, setProcessedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !material) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    
    if (type === 'wastage' && quantity > material.stock) {
      toast.error(`Cannot write-off more than current stock (${material.stock})`);
      return;
    }

    if (!processedBy.trim()) {
      toast.error('Please enter the name of the person processing this.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await safeFetch('/api/returns-wastage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: material.id,
          quantity,
          type,
          job_site: jobSite,
          processed_by: processedBy,
          notes
        }),
      });
      
      const data = await parseResponseJson(res);
      toast.success(data.message || `Successfully logged ${type}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || `Failed to log ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReturn = type === 'return';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className={`flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 ${isReturn ? 'bg-emerald-50/50' : 'bg-amber-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isReturn ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {isReturn ? <RotateCcw size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isReturn ? 'Job Site Return' : 'Site Wastage'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isReturn ? 'Restock unused materials' : 'Write-off damaged/scrap materials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Material Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm font-medium text-gray-900">{material.name}</p>
            <p className="text-xs text-gray-500 mt-1">SKU: {material.sku} • Current Stock: {material.stock}</p>
          </div>

          {/* Type Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('return')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                isReturn ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Return (Restock)
            </button>
            <button
              type="button"
              onClick={() => setType('wastage')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                !isReturn ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Wastage (Write-off)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Site Location
              </label>
              <select
                value={jobSite}
                onChange={(e) => setJobSite(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {JOB_SITES.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max={type === 'wastage' ? material.stock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              {type === 'wastage' && quantity > material.stock && (
                <p className="text-red-500 text-xs mt-1">Cannot write-off more than current stock</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Processed By (Name)
              </label>
              <input
                type="text"
                value={processedBy}
                onChange={(e) => setProcessedBy(e.target.value)}
                required
                placeholder="Contractor or Supervisor name"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder={isReturn ? "e.g., Leftover un-opened box of LVP flooring" : "e.g., Damaged corner during tile cut"}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || quantity <= 0 || (type === 'wastage' && quantity > material.stock)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:bg-gray-400 flex justify-center items-center gap-2 ${
                isReturn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isReturn ? <RotateCcw size={16} /> : <AlertTriangle size={16} />}
                  {isReturn ? 'Log Return' : 'Log Wastage'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
