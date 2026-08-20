import { useEffect, useState } from 'react';

import type { StockLedger as StockLedgerType, Settings } from '../types';
import StockLedger from '../components/StockLedger';
import { parseResponseJson } from '../utils/safeFetch';

export default function LedgerPage() {
  const [ledger, setLedger] = useState<StockLedgerType[]>([]);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  useEffect(() => {
    fetch('/api/stock-ledger')
      .then(r => parseResponseJson(r, []))
      .then(data => setLedger(Array.isArray(data) ? data : []))
      .catch(() => setLedger([]));

    fetch('/api/settings')
      .then(r => parseResponseJson<any>(r, {}))
      .then(data => { if (data) setSettings(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">High-level financial & movement audit trail for XLNC Exotic Homes inventory</p>
        </div>
      </div>

      {/* Main Stock Ledger Component with Summary Cards, Filters & Excel Export */}
      <StockLedger showFilters={true} showSummaryCards={true} />
    </div>
  );
}
