import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemName?: string;
  itemCount?: number;
  itemNoun?: string;
  message?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  itemName,
  itemCount,
  itemNoun = "item",
  message,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const isBatch = typeof itemCount === 'number' && itemCount > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-stone-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden p-6 text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-stone-400 hover:text-amber-400 transition-colors p-1 rounded-lg hover:bg-stone-800 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-100 font-serif tracking-wide">{title}</h3>
            <p className="text-xs text-amber-400/80 uppercase tracking-widest font-mono">XLNC Exotic Homes Inventory</p>
          </div>
        </div>

        {/* Body Message */}
        <div className="my-5 p-3.5 bg-stone-950/60 border border-stone-800 rounded-lg">
          <p className="text-sm text-stone-300 leading-relaxed">
            {message ? (
              message
            ) : isBatch ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-amber-300">{itemCount} selected {itemNoun}s</span>? This action cannot be undone.
              </>
            ) : itemName ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-amber-300">"{itemName}"</span>? This action cannot be undone.
              </>
            ) : (
              `Are you sure you want to delete this ${itemNoun}? This action cannot be undone.`
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-stone-300 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-500 rounded-lg hover:bg-red-700 hover:border-red-600 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
