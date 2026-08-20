import React, { useState } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { safeFetch, parseResponseJson } from '../utils/safeFetch';

interface Material {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface AllocateToSiteModalProps {
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

const AUTHORIZED_BY = [
  "Mohan",
  "Pablo Yovani",
  "Juventino",
  "Carlos Team",
  "Oscar"
];

export default function AllocateToSiteModal({ isOpen, onClose, onSuccess, material }: AllocateToSiteModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [jobSite, setJobSite] = useState(JOB_SITES[0]);
  const [authorizedBy, setAuthorizedBy] = useState(AUTHORIZED_BY[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !material) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (quantity > material.stock) {
      toast.error(`Insufficient stock. Available: ${material.stock}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await safeFetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: material.id,
          quantity,
          job_site: jobSite,
          authorized_by: authorizedBy,
          notes
        }),
      });
      await parseResponseJson(res);
      toast.success('Successfully allocated stock to site');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to allocate stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Allocate to Site</h2>
              <p className="text-xs text-gray-500 mt-0.5">Transfer materials to active job site</p>
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
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm font-medium text-gray-900">{material.name}</p>
            <p className="text-xs text-gray-500 mt-1">SKU: {material.sku} • Current Stock: {material.stock}</p>
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
                Authorized By (Contractor/Lead)
              </label>
              <select
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {AUTHORIZED_BY.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Allocate
              </label>
              <input
                type="number"
                min="1"
                max={material.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              {quantity > material.stock && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Cannot exceed available stock
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="e.g., specific area or purpose..."
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
              disabled={isSubmitting || quantity <= 0 || quantity > material.stock}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <Truck size={16} />
                  Allocate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
