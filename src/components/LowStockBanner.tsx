import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Material } from '../types';
import { parseResponseJson } from '../utils/safeFetch';

export default function LowStockBanner() {
  const [lowStock, setLowStock] = useState<Material[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const notifiedItems = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let active = true;

    fetch('/api/materials')
      .then(res => parseResponseJson(res, []))
      .then((materialsData) => {
        if (!active || !Array.isArray(materialsData)) return;
        
        const items = materialsData.filter(m => m && m.stock < m.min_stock);
        setLowStock(items);

        const newLowStock = items.filter(m => !notifiedItems.current.has(m.id));
        
        if (newLowStock.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Low Stock Alert', {
            body: `${newLowStock.length} material(s) have dropped below their minimum stock threshold.`,
          });
          newLowStock.forEach(m => notifiedItems.current.add(m.id));
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  if (lowStock.length === 0 || isDismissed) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start justify-between gap-4 mb-8">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
        <div>
          <h3 className="text-lg font-bold text-red-800">Low Stock Alert</h3>
          <p className="text-red-700 mt-1">
            You have {lowStock.length} material{lowStock.length > 1 ? 's' : ''} running below the minimum stock threshold. Please restock soon.
          </p>
          <div className="mt-2">
            <Link to="/materials" className="text-sm font-medium text-red-800 hover:text-red-900 underline">
              Review Inventory
            </Link>
          </div>
        </div>
      </div>
      <button 
        onClick={() => setIsDismissed(true)}
        className="p-1 hover:bg-red-100 rounded-md transition-colors text-red-500 hover:text-red-700"
        aria-label="Dismiss alert"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
