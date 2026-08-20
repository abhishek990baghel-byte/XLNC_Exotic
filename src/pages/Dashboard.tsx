import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, DollarSign, Plus, Upload, ArrowRight, CheckCircle, PieChart as PieChartIcon, MapPin, TrendingUp, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Material, Sale, Purchase } from '../types';
import InventoryDistributionChart from '../components/InventoryDistributionChart';
import TopSellingChart from '../components/TopSellingChart';
import InventoryValueChart from '../components/InventoryValueChart';
import { motion } from 'motion/react';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

import { parseResponseJson } from '../utils/safeFetch';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/materials').then(r => parseResponseJson(r, [])).catch(() => []),
      fetch('/api/stock-ledger').then(r => parseResponseJson(r, [])).catch(() => []),
      fetch('/api/purchases').then(r => parseResponseJson(r, [])).catch(() => []),
      fetch('/api/sales').then(r => parseResponseJson(r, [])).catch(() => [])
    ]).then(([mats, tx, pur, sls]) => {
      setMaterials(Array.isArray(mats) ? mats : []);
      setTransactions(Array.isArray(tx) ? tx : []);
      setPurchases(Array.isArray(pur) ? pur : []);
      setSales(Array.isArray(sls) ? sls : []);
      setLoading(false);
    });
  }, []);

  const totalValue = (materials || []).reduce((sum, m) => sum + ((m?.stock || 0) * (m?.cost_price || 0)), 0);
  const lowStockMaterials = (materials || []).filter(m => m && (m.stock <= m.min_stock));
  const recentSalesCount = (sales || []).filter(s => {
    if (!s || !s.date) return false;
    const d = new Date(s.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, s) => {
    if (Array.isArray(s.items)) {
      return sum + s.items.reduce((itemSum: number, item: any) => itemSum + (Number(item?.quantity) || 0), 0);
    }
    return sum + 1;
  }, 0);

  // Build movement data dynamically from real-time transactions + materials
  const movementData = React.useMemo(() => {
    const last14Days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    return last14Days.map(dayStr => {
      const dayTx = transactions.filter(t => t.timestamp && typeof t.timestamp === 'string' && t.timestamp.startsWith(dayStr));
      const added = dayTx.filter(t => t.movement_type?.includes('In') || t.movement_type === 'Manual Adjustment' && t.quantity_changed > 0).reduce((s, t) => s + (t.quantity_changed || 0), 0);
      const sold = dayTx.filter(t => t.movement_type?.includes('Out') || t.movement_type === 'Manual Adjustment' && t.quantity_changed < 0).reduce((s, t) => s + Math.abs(t.quantity_changed || 0), 0);
      return {
        day: dayStr,
        added: added,
        sold: sold
      };
    });
  }, [transactions]);

  // Location breakdown logic
  const locationsMap = (materials || []).reduce((acc, m) => {
    if (!m) return acc;
    const loc = m.location || 'Main Warehouse';
    if (!acc[loc]) {
      acc[loc] = { totalItems: 0, totalStock: 0, value: 0 };
    }
    acc[loc].totalItems += 1;
    acc[loc].totalStock += (m.stock || 0);
    acc[loc].value += ((m.stock || 0) * (m.cost_price || 0));
    return acc;
  }, {} as Record<string, { totalItems: number, totalStock: number, value: number }>);
  
  const locationBreakdown = (Object.entries(locationsMap) as [string, { totalItems: number, totalStock: number, value: number }][])
    .map(([location, stats]) => ({ location, ...stats }))
    .sort((a, b) => b.totalStock - a.totalStock);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div className="flex flex-col gap-6 w-full font-sans" variants={containerVariants} initial="hidden" animate="show">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Control Center</h1>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostgreSQL Database Synchronized
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
        <button onClick={() => navigate('/materials/new')} className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-2xs cursor-pointer">
          <Plus className="w-5 h-5" /> Add Stock
        </button>
        <button onClick={() => navigate('/materials/bulk-upload')} className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl hover:border-black transition-colors font-medium shadow-2xs cursor-pointer">
          <Upload className="w-5 h-5 text-gray-500" /> Upload Excel
        </button>
      </motion.div>

      {/* 3 Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <motion.div 
          variants={itemVariants}
          onClick={() => !loading && navigate('/materials')}
          className={`bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 ${!loading ? 'cursor-pointer hover:border-black hover:shadow-md transition-all group' : ''}`}
        >
          {loading ? (
            <>
              <div className="p-4 bg-gray-200 rounded-full w-14 h-14 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-gray-50 text-gray-800 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Asset Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div 
          variants={itemVariants}
          onClick={() => !loading && navigate('/materials')}
          className={`bg-white p-6 rounded-2xl border ${!loading ? 'border-red-100 cursor-pointer hover:border-red-500 hover:shadow-md transition-all group' : 'border-gray-200/80'} shadow-2xs flex items-center gap-4`}
        >
          {loading ? (
            <>
              <div className="p-4 bg-gray-200 rounded-full w-14 h-14 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Critical Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(lowStockMaterials.length)} Items</p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div 
          variants={itemVariants}
          onClick={() => !loading && navigate('/sales')}
          className={`bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 ${!loading ? 'cursor-pointer hover:border-[#D4AF37] hover:shadow-md transition-all group' : ''}`}
        >
          {loading ? (
            <>
              <div className="p-4 bg-gray-200 rounded-full w-14 h-14 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-amber-50 text-[#D4AF37] rounded-2xl group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items Sold (MTD)</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(recentSalesCount)}</p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Inventory Movement Insight */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Live Inventory Flow</h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-end gap-2 animate-pulse pb-4">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="flex-1 bg-gray-200 rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(val) => formatDate(val, 'en-US', { month: 'short', day: 'numeric' })} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="added" name="Stock Added" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorAdded)" />
                  <Area type="monotone" dataKey="sold" name="Stock Allocated/Sold" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorSold)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Stock Distribution */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#D4AF37]" />
              Stock Distribution
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center animate-pulse">
                <div className="w-48 h-48 rounded-full bg-gray-200"></div>
              </div>
            ) : (
              <InventoryDistributionChart materials={materials} />
            )}
          </div>
        </motion.div>
      </div>

      {/* Visual Recharts Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Top Selling Materials */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                Top Selling Materials
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Top performing inventory items by quantity sold</p>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            {loading ? (
              <div className="w-full h-full flex flex-col gap-3 justify-center animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded-md w-full"></div>
                ))}
              </div>
            ) : (
              <TopSellingChart sales={sales} materials={materials} />
            )}
          </div>
        </motion.div>

        {/* Current Inventory Value */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-zinc-900" />
                Current Inventory Value
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Asset cost valuation per category</p>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            {loading ? (
              <div className="w-full h-full flex items-end gap-3 justify-center animate-pulse pb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-12 bg-gray-200 rounded-t-md" style={{ height: `${i * 18}%` }}></div>
                ))}
              </div>
            ) : (
              <InventoryValueChart materials={materials} />
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Needs Attention Panel */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Needs Attention
            </h2>
          </div>
          <div className="p-4 flex-1">
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50 animate-pulse flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {lowStockMaterials.length > 0 ? (
                  <div 
                    onClick={() => navigate('/materials')}
                    className="p-4 rounded-xl border border-red-100 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <h3 className="font-semibold text-red-800 text-sm">Critical Restock</h3>
                      <p className="text-xs text-red-600 mt-1">{lowStockMaterials.length} items dropped below reorder levels.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transform group-hover:translate-x-1 transition-all" />
                  </div>
                ) : (
                  <div className="col-span-full p-8 text-center text-gray-500 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-medium">Inventory levels are healthy.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Location Overview */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Location Overview
            </h2>
          </div>
          <div className="p-4 flex-1">
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50 animate-pulse flex flex-col gap-2">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/4 mt-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : locationBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {locationBreakdown.map((loc, idx) => (
                  <div key={`loc-${loc.location}-${idx}`} className="p-5 rounded-xl border border-gray-100 bg-white shadow-2xs flex flex-col group hover:border-[#D4AF37] transition-all">
                    <h3 className="font-semibold text-gray-900 text-sm">{loc.location}</h3>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{formatNumber(loc.totalStock)}</span>
                      <span className="text-xs text-gray-500 font-medium">units</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                      <span>Across {formatNumber(loc.totalItems)} items</span>
                      <span className="font-medium text-gray-900">{formatCurrency(loc.value)} val</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border border-gray-100 rounded-xl">
                <MapPin className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium">No location data available.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
