import React, { useState, useRef, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import type { ColumnDef } from '../hooks/useTableColumns';

interface ColumnToggleProps {
  columns: ColumnDef[];
  onToggle: (id: string) => void;
}

export default function ColumnToggle({ columns, onToggle }: ColumnToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
        title="Toggle Columns"
      >
        <Settings2 className="w-4 h-4" />
        <span className="hidden sm:inline">Columns</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
          <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Visible Columns</div>
          <div className="space-y-1">
            {columns.map(col => (
              <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggle(col.id)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
