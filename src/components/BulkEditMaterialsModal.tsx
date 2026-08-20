import React, { useState } from 'react';
import { X, Sliders, DollarSign, Tag, MapPin, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import type { Material } from '../types';
import toast from 'react-hot-toast';

interface BulkEditMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: Material[];
  existingCategories: string[];
  onSuccess: () => void;
}

export default function BulkEditMaterialsModal({
  isOpen,
  onClose,
  selectedMaterials,
  existingCategories,
  onSuccess,
}: BulkEditMaterialsModalProps) {
  const [updateCategory, setUpdateCategory] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');

  const [updateSellingPrice, setUpdateSellingPrice] = useState(false);
  const [sellingPriceMode, setSellingPriceMode] = useState<'set' | 'percent' | 'add'>('set');
  const [sellingPriceValue, setSellingPriceValue] = useState<string>('');

  const [updateCostPrice, setUpdateCostPrice] = useState(false);
  const [costPriceMode, setCostPriceMode] = useState<'set' | 'percent' | 'add'>('set');
  const [costPriceValue, setCostPriceValue] = useState<string>('');

  const [updateLocation, setUpdateLocation] = useState(false);
  const [locationValue, setLocationValue] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const validCategories = Array.from(new Set(existingCategories.filter((c) => c && c !== 'All')));

  const finalCategory =
    categoryMode === 'new' ? customCategory.trim() : selectedCategory.trim();

  const calculateNewValue = (
    current: number,
    mode: 'set' | 'percent' | 'add',
    valStr: string
  ): number => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return current;
    if (mode === 'set') return Math.max(0, val);
    if (mode === 'percent') return Math.max(0, current * (1 + val / 100));
    if (mode === 'add') return Math.max(0, current + val);
    return current;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!updateCategory && !updateSellingPrice && !updateCostPrice && !updateLocation) {
      toast.error('Please select at least one field to update.');
      return;
    }

    if (updateCategory && !finalCategory) {
      toast.error('Please select or enter a valid category.');
      return;
    }

    if (
      updateSellingPrice &&
      (sellingPriceValue === '' || isNaN(parseFloat(sellingPriceValue)))
    ) {
      toast.error('Please enter a valid numeric value for selling price adjustment.');
      return;
    }

    if (
      updateCostPrice &&
      (costPriceValue === '' || isNaN(parseFloat(costPriceValue)))
    ) {
      toast.error('Please enter a valid numeric value for cost price adjustment.');
      return;
    }

    if (updateLocation && !locationValue.trim()) {
      toast.error('Please enter a location name.');
      return;
    }

    setIsSubmitting(true);

    try {
      for (const mat of selectedMaterials) {
        const itemUpdates: Partial<Material> = {};
        if (updateCategory) {
          itemUpdates.category = finalCategory;
        }
        if (updateSellingPrice) {
          itemUpdates.selling_price = Number(
            calculateNewValue(mat.selling_price, sellingPriceMode, sellingPriceValue).toFixed(2)
          );
        }
        if (updateCostPrice) {
          itemUpdates.cost_price = Number(
            calculateNewValue(mat.cost_price, costPriceMode, costPriceValue).toFixed(2)
          );
        }
        if (updateLocation) {
          itemUpdates.location = locationValue.trim();
        }

        await fetch(`/api/materials/${mat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemUpdates)
        });
      }

      toast.success(`Successfully updated ${selectedMaterials.length} materials`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error performing bulk update:', err);
      toast.error(err.message || 'Error performing bulk update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-bold shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Bulk Edit Materials</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Updating <span className="text-[#D4AF37] font-semibold">{selectedMaterials.length}</span> selected items in Database
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleApply} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Selected items summary chip list */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-700" /> Target Items
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-medium text-zinc-700 hover:text-black underline cursor-pointer"
              >
                {showPreview ? 'Hide Details' : 'Show Affected Items'}
              </button>
            </div>
            {showPreview ? (
              <div className="max-h-32 overflow-y-auto divide-y divide-zinc-200 text-xs">
                {selectedMaterials.map((m) => (
                  <div key={m.id} className="py-1.5 flex justify-between items-center">
                    <span className="font-medium text-zinc-800 truncate max-w-[240px]">{m.name}</span>
                    <span className="text-zinc-500 font-mono text-[11px]">{m.sku} | ${(m.selling_price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 line-clamp-1">
                {selectedMaterials.map((m) => m.name).join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {/* 1. Category Field */}
            <div className={`p-4 rounded-xl border transition-all ${updateCategory ? 'border-zinc-900 bg-zinc-50/50 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={updateCategory}
                    onChange={(e) => setUpdateCategory(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm">
                    <Tag className="w-4 h-4 text-[#D4AF37]" />
                    Update Category
                  </div>
                </div>
                <span className="text-xs text-gray-400">Assign new or existing category</span>
              </label>

              {updateCategory && (
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="catMode"
                        checked={categoryMode === 'existing'}
                        onChange={() => setCategoryMode('existing')}
                        className="text-black focus:ring-black"
                      />
                      Select Existing Category
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="catMode"
                        checked={categoryMode === 'new'}
                        onChange={() => setCategoryMode('new')}
                        className="text-black focus:ring-black"
                      />
                      Create New Category
                    </label>
                  </div>

                  {categoryMode === 'existing' ? (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                    >
                      <option value="">-- Choose Category --</option>
                      {validCategories.map((cat, idx) => (
                        <option key={`cat-${cat}-${idx}`} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter new category name (e.g. Italian Marble, Fixtures)..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                    />
                  )}
                </div>
              )}
            </div>

            {/* 2. Selling Price Field */}
            <div className={`p-4 rounded-xl border transition-all ${updateSellingPrice ? 'border-zinc-900 bg-zinc-50/50 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={updateSellingPrice}
                    onChange={(e) => setUpdateSellingPrice(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Update Selling Price
                  </div>
                </div>
                <span className="text-xs text-gray-400">Set fixed amount or % adjustment</span>
              </label>

              {updateSellingPrice && (
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSellingPriceMode('set')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        sellingPriceMode === 'set'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Fixed Price ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellingPriceMode('percent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        sellingPriceMode === 'percent'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Percent Change (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellingPriceMode('add')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        sellingPriceMode === 'add'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Add/Sub Amount ($)
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder={
                        sellingPriceMode === 'set'
                          ? 'Enter new selling price (e.g. 150.00)'
                          : sellingPriceMode === 'percent'
                          ? 'Enter percentage change (e.g. 10 for +10%, -5 for -5%)'
                          : 'Enter amount to add/subtract (e.g. 15 or -10)'
                      }
                      value={sellingPriceValue}
                      onChange={(e) => setSellingPriceValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Cost Price Field */}
            <div className={`p-4 rounded-xl border transition-all ${updateCostPrice ? 'border-zinc-900 bg-zinc-50/50 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={updateCostPrice}
                    onChange={(e) => setUpdateCostPrice(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    Update Cost Price
                  </div>
                </div>
                <span className="text-xs text-gray-400">Set unit cost or % adjustment</span>
              </label>

              {updateCostPrice && (
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCostPriceMode('set')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        costPriceMode === 'set'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Fixed Cost ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostPriceMode('percent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        costPriceMode === 'percent'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Percent Change (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostPriceMode('add')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        costPriceMode === 'add'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Add/Sub Amount ($)
                    </button>
                  </div>

                  <input
                    type="number"
                    step="any"
                    placeholder={
                      costPriceMode === 'set'
                        ? 'Enter new cost price (e.g. 75.00)'
                        : costPriceMode === 'percent'
                        ? 'Enter percentage change (e.g. 5 for +5%)'
                        : 'Enter amount to add/subtract (e.g. 5 or -2.50)'
                    }
                    value={costPriceValue}
                    onChange={(e) => setCostPriceValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
              )}
            </div>

            {/* 4. Storage Location Field */}
            <div className={`p-4 rounded-xl border transition-all ${updateLocation ? 'border-zinc-900 bg-zinc-50/50 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={updateLocation}
                    onChange={(e) => setUpdateLocation(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Update Storage Location
                  </div>
                </div>
                <span className="text-xs text-gray-400">Reassign warehouse or rack position</span>
              </label>

              {updateLocation && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <input
                    type="text"
                    placeholder="Enter new storage location (e.g. Main Warehouse, Rack B-12)..."
                    value={locationValue}
                    onChange={(e) => setLocationValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Impact preview summary */}
          {(updateSellingPrice || updateCostPrice || updateCategory || updateLocation) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Proposed Modifications Summary
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                {updateCategory && (
                  <li>Category will change to <span className="font-medium">{finalCategory || '(Not specified yet)'}</span></li>
                )}
                {updateSellingPrice && sellingPriceValue !== '' && (
                  <li>
                    Selling price adjustment: <span className="font-medium">
                      {sellingPriceMode === 'set' && `$${sellingPriceValue}`}
                      {sellingPriceMode === 'percent' && `${sellingPriceValue}%`}
                      {sellingPriceMode === 'add' && `${parseFloat(sellingPriceValue) >= 0 ? '+' : ''}$${sellingPriceValue}`}
                    </span>
                  </li>
                )}
                {updateCostPrice && costPriceValue !== '' && (
                  <li>
                    Cost price adjustment: <span className="font-medium">
                      {costPriceMode === 'set' && `$${costPriceValue}`}
                      {costPriceMode === 'percent' && `${costPriceValue}%`}
                      {costPriceMode === 'add' && `${parseFloat(costPriceValue) >= 0 ? '+' : ''}$${costPriceValue}`}
                    </span>
                  </li>
                )}
                {updateLocation && (
                  <li>Storage location will change to <span className="font-medium">{locationValue || '(Not specified yet)'}</span></li>
                )}
              </ul>
            </div>
          )}

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-[#c29e30] text-black rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  Apply Bulk Updates ({selectedMaterials.length})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
