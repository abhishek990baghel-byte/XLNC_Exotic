import { useState, useEffect, useRef } from 'react';
import { Search, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Material } from '../types';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(mats => {
        setMaterials(Array.isArray(mats) ? mats : []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMaterials = query
    ? materials.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.sku.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search materials by name or SKU..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm"
        />
      </div>

      {isOpen && query && filteredMaterials.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="max-h-96 overflow-y-auto py-2">
            <div className="px-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Materials</div>
            {filteredMaterials.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelect(`/materials/${m.id}`)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Package className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{m.name}</div>
                  <div className="text-xs text-gray-500">SKU: {m.sku}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {isOpen && query && filteredMaterials.length === 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500 z-50">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
