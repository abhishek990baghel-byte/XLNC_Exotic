import React, { useState, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { 
  Search, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw,
  PlusCircle,
  Calendar,
  Filter,
  Layers,
  User,
  ArrowUpDown
} from 'lucide-react';
import type { StockLedger as StockLedgerType } from '../types';
import { calculateNewStock } from '../utils/inventory';
import { exportToExcel } from '../utils/excel';
import { parseResponseJson } from '../utils/safeFetch';

interface StockLedgerProps {
  materialId?: string;
  history?: StockLedgerType[];
  currentStock?: number;
  onAdjustStock?: (newStock: number, quantityChanged: number) => Promise<void>;
  showFilters?: boolean;
  showSummaryCards?: boolean;
}

interface StockLedgerRowData {
  transactions: StockLedgerType[];
}

function StockLedgerRow({ index, style, transactions }: { index: number; style: React.CSSProperties } & StockLedgerRowData) {
  const h = transactions[index];
  if (!h) return null;
  const isPositive = h.quantity_changed > 0;
  const isNegative = h.quantity_changed < 0;

  return (
    <div
      style={style}
      className="flex items-center px-4 py-2 border-b border-gray-100 hover:bg-gray-50/80 transition-colors text-xs text-gray-700"
    >
      <div className="w-48 shrink-0 font-medium text-gray-600 truncate">
        {new Date(h.timestamp).toLocaleString()}
      </div>
      <div className="flex-1 min-w-[180px] font-semibold text-gray-900 text-sm truncate">
        {h.material_name || 'N/A'}
      </div>
      <div className="w-32 shrink-0 font-mono text-gray-500 truncate">
        {h.material_sku || 'N/A'}
      </div>
      <div className="w-36 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          isNegative ? 'bg-rose-50 text-rose-700 border border-rose-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <Layers className="w-3 h-3" />
          {h.movement_type}
        </span>
      </div>
      <div className={`w-28 shrink-0 text-right font-bold text-sm ${
        isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-gray-700'
      }`}>
        {isPositive ? `+${h.quantity_changed}` : h.quantity_changed}
      </div>
      <div className="w-28 shrink-0 text-right font-bold text-gray-900 text-sm">
        {Number(h.balance || 0).toLocaleString()}
      </div>
      <div className="w-36 shrink-0 pl-4 text-gray-600 truncate">
        <span className="inline-flex items-center gap-1">
          <User className="w-3 h-3 text-gray-400" />
          {h.user_name || 'Admin'}
        </span>
      </div>
    </div>
  );
}

export default function StockLedger({
  materialId,
  history: propsHistory,
  currentStock,
  onAdjustStock,
  showFilters = true,
  showSummaryCards = true,
}: StockLedgerProps) {
  // Filters State
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data & Summary State
  const [transactions, setTransactions] = useState<StockLedgerType[]>(propsHistory || []);
  const [summary, setSummary] = useState({
    totalAdded: 0,
    totalAllocatedOrSold: 0,
    netChange: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;
  const paginatedTransactions = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, type, period, startDate, endDate]);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'Add' | 'Subtract'>('Add');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Fetch Ledger data from API
  const fetchLedger = useCallback(async () => {
    if (propsHistory) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (type && type !== 'all') queryParams.set('type', type);
      if (period && period !== 'all') queryParams.set('period', period);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (materialId) queryParams.set('materialId', materialId);

      const res = await fetch(`/api/ledger?${queryParams.toString()}`);
      const data = await parseResponseJson<any>(res, null);

      if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setSummary(data.summary || {
          totalAdded: 0,
          totalAllocatedOrSold: 0,
          netChange: 0,
          totalCount: data.transactions.length
        });
      } else {
        // Fallback or legacy array response
        const list = Array.isArray(data) ? data : [];
        setTransactions(list);
        recalculateLocalSummary(list);
      }
    } catch (err) {
      console.error('[StockLedger] Failed to fetch ledger data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, type, period, startDate, endDate, materialId, propsHistory]);

  const recalculateLocalSummary = (items: StockLedgerType[]) => {
    let added = 0;
    let sold = 0;
    let net = 0;
    for (const item of items) {
      const q = item.quantity_changed || 0;
      if (q > 0) added += q;
      else sold += Math.abs(q);
      net += q;
    }
    setSummary({
      totalAdded: added,
      totalAllocatedOrSold: sold,
      netChange: net,
      totalCount: items.length
    });
  };

  useEffect(() => {
    if (propsHistory) {
      setTransactions(propsHistory);
      recalculateLocalSummary(propsHistory);
    } else {
      fetchLedger();
    }
  }, [fetchLedger, propsHistory]);

  // Handle Manual Stock Adjustment
  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdjustStock || currentStock === undefined) return;

    const amount = Number(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const quantityChanged = adjustType === 'Add' ? amount : -amount;
    const newStock = calculateNewStock(currentStock, quantityChanged, 'Adjustment');
    
    setIsAdjusting(true);
    try {
      await onAdjustStock(newStock, quantityChanged);
      setAdjustAmount('');
      fetchLedger();
    } finally {
      setIsAdjusting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!transactions || transactions.length === 0) return;

    const exportRows = transactions.map((t, idx) => ({
      '#': idx + 1,
      'Transaction ID': t.id,
      'Date & Time': new Date(t.timestamp).toLocaleString(),
      'Material Name': t.material_name || 'N/A',
      'SKU': t.material_sku || 'N/A',
      'Movement Type': t.movement_type,
      'Quantity Changed': t.quantity_changed > 0 ? `+${t.quantity_changed}` : t.quantity_changed,
      'Balance After': t.balance,
      'User / Operator': t.user_name || 'Admin',
      'Reference ID': t.reference_id || '-'
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(exportRows, `XLNC_Stock_Ledger_${dateStr}`);
  };

  const hasActiveFilters = search !== '' || type !== 'all' || period !== 'all' || startDate !== '' || endDate !== '';

  const resetFilters = () => {
    setSearch('');
    setType('all');
    setPeriod('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Summary Cards Panel */}
      {showSummaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Items Added</p>
                <p className="text-2xl font-bold text-emerald-600">+{summary.totalAdded.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Purchases, Imports & Manual Adds</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Allocated / Sold</p>
                <p className="text-2xl font-bold text-rose-600">-{summary.totalAllocatedOrSold.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Sales & Allocations Out</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Net Inventory Delta</p>
                <p className={`text-2xl font-bold ${summary.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {summary.netChange > 0 ? `+${summary.netChange.toLocaleString()}` : summary.netChange.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <ArrowUpDown className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Net movement balance</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Audit Logs</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Filtered transaction entries</p>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Control (when inside single item page) */}
      {onAdjustStock && currentStock !== undefined && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Manual Stock Adjustment</h3>
          </div>
          <form onSubmit={handleAdjust} data-testid="adjustment-form" className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
              <select
                data-testid="adjust-type"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as 'Add' | 'Subtract')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black"
              >
                <option value="Add">Add Stock (+)</option>
                <option value="Subtract">Subtract / Deduct Stock (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                data-testid="adjust-amount"
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black"
                placeholder="0"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isAdjusting}
              className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isAdjusting ? 'Adjusting...' : 'Commit Adjustment'}
            </button>
            <div data-testid="preview-calc" className="text-xs text-gray-500 pb-2">
              New Stock Balance: <span className="font-bold text-gray-900">{calculateNewStock(currentStock, adjustType === 'Add' ? Number(adjustAmount) || 0 : -(Number(adjustAmount) || 0), 'Adjustment')}</span>
            </div>
          </form>
        </div>
      )}

      {/* 2. Advanced Filtering Bar */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Material SKU or Name..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg text-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">Type:</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-gray-800 focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="all">All Movements</option>
                  <option value="add">Add / Purchases</option>
                  <option value="sell">Sell / Sales</option>
                  <option value="allocate">Allocations</option>
                </select>
              </div>

              {/* Date Preset Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">Period:</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-gray-800 focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={handleExportExcel}
                disabled={transactions.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-2xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Ledger to Excel
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                  title="Reset Filters"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {period === 'custom' && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Data-Dense Table UI (Virtualized with react-window) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center px-4 py-3 select-none">
              <div className="w-48 shrink-0">Date & Time</div>
              <div className="flex-1 min-w-[180px]">Material Name</div>
              <div className="w-32 shrink-0">SKU</div>
              <div className="w-36 shrink-0">Transaction Type</div>
              <div className="w-28 shrink-0 text-right">Qty Changed</div>
              <div className="w-28 shrink-0 text-right">Balance After</div>
              <div className="w-36 shrink-0 pl-4">User / Operator</div>
            </div>

            {/* Virtualized Table Body */}
            {loading ? (
              <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                Loading stock ledger data...
              </div>
            ) : paginatedTransactions.length > 0 ? (
              <List<StockLedgerRowData>
                rowCount={paginatedTransactions.length}
                rowHeight={52}
                rowComponent={StockLedgerRow}
                rowProps={{ transactions: paginatedTransactions }}
                style={{ height: Math.min(500, Math.max(120, paginatedTransactions.length * 52)) }}
              />
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p className="text-sm font-medium text-gray-700 mb-1">No transaction history found</p>
                <p className="text-xs text-gray-400">Try adjusting your date range, search query, or movement type filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Bar */}
        {transactions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * pageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, transactions.length)}</span> of <span className="font-semibold text-gray-900">{transactions.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={500}>500 per page</option>
                <option value={10000}>All (Virtualized)</option>
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold text-gray-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
