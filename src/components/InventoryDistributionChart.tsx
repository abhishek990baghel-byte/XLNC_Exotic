import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import type { Material } from '../types';
import { Package, Layers, Box } from 'lucide-react';

interface InventoryDistributionChartProps {
  materials: Material[];
}

export default function InventoryDistributionChart({ materials }: InventoryDistributionChartProps) {
  const [groupBy, setGroupBy] = useState<'category' | 'item'>('category');
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Distinct rich color palette with 12 high-contrast luxury colors
  const COLORS = [
    '#18181B', // Dark Onyx
    '#D4AF37', // Luxury Gold
    '#2563EB', // Royal Blue
    '#059669', // Emerald Green
    '#7C3AED', // Deep Purple
    '#D97706', // Amber
    '#DC2626', // Crimson Red
    '#0891B2', // Cyan / Teal
    '#4F46E5', // Indigo
    '#EA580C', // Orange
    '#0D9488', // Dark Teal
    '#64748B', // Slate
  ];

  const { chartData, totalQuantity, uniqueGroupCount } = useMemo(() => {
    if (!materials || materials.length === 0) {
      return { chartData: [], totalQuantity: 0, uniqueGroupCount: 0 };
    }

    const total = materials.reduce((sum, m) => sum + (Number(m.stock) || 0), 0);
    if (total === 0) {
      return { chartData: [], totalQuantity: 0, uniqueGroupCount: 0 };
    }

    if (groupBy === 'category') {
      // Group stock distribution by Category for realistic macro inventory distribution
      const categoryMap: Record<string, { totalStock: number; itemCount: number; sampleUnit: string }> = {};

      materials.forEach((m) => {
        const cat = (m.category && m.category.trim()) || 'Uncategorized';
        const stock = Math.max(0, Number(m.stock) || 0);
        if (!categoryMap[cat]) {
          categoryMap[cat] = { totalStock: 0, itemCount: 0, sampleUnit: m.unit || 'pcs' };
        }
        categoryMap[cat].totalStock += stock;
        categoryMap[cat].itemCount += 1;
      });

      // Sort categories by total stock descending
      const sortedCategories = Object.entries(categoryMap)
        .map(([name, data]) => ({
          name,
          value: data.totalStock,
          itemCount: data.itemCount,
          percentage: total > 0 ? ((data.totalStock / total) * 100).toFixed(1) : '0.0',
          unit: data.sampleUnit,
        }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value);

      // If more than 10 categories, group long-tail (>10) into Other Categories
      let items = sortedCategories;
      if (sortedCategories.length > 10) {
        const top = sortedCategories.slice(0, 9);
        const rest = sortedCategories.slice(9);
        const otherStock = rest.reduce((acc, curr) => acc + curr.value, 0);
        const otherItems = rest.reduce((acc, curr) => acc + curr.itemCount, 0);
        
        items = [
          ...top,
          {
            name: 'Other Categories',
            value: otherStock,
            itemCount: otherItems,
            percentage: total > 0 ? ((otherStock / total) * 100).toFixed(1) : '0.0',
            unit: 'pcs',
          },
        ];
      }

      return {
        chartData: items,
        totalQuantity: total,
        uniqueGroupCount: sortedCategories.length,
      };
    } else {
      // Group by Item with adaptive ranking so "Other" never dominates
      const validMaterials = materials
        .filter((m) => (Number(m.stock) || 0) > 0)
        .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));

      // Display up to 10 top items dynamically
      const maxDisplay = 10;
      let items: Array<{
        name: string;
        value: number;
        itemCount?: number;
        percentage: string;
        unit: string;
      }> = [];

      if (validMaterials.length <= maxDisplay) {
        items = validMaterials.map((m) => ({
          name: m.name,
          value: Number(m.stock) || 0,
          percentage: total > 0 ? (((Number(m.stock) || 0) / total) * 100).toFixed(1) : '0.0',
          unit: m.unit || 'pcs',
        }));
      } else {
        const topMaterials = validMaterials.slice(0, maxDisplay);
        const otherMaterials = validMaterials.slice(maxDisplay);
        const otherStock = otherMaterials.reduce((sum, m) => sum + (Number(m.stock) || 0), 0);

        items = topMaterials.map((m) => ({
          name: m.name,
          value: Number(m.stock) || 0,
          percentage: total > 0 ? (((Number(m.stock) || 0) / total) * 100).toFixed(1) : '0.0',
          unit: m.unit || 'pcs',
        }));

        if (otherStock > 0) {
          items.push({
            name: 'Other Items',
            value: otherStock,
            itemCount: otherMaterials.length,
            percentage: total > 0 ? ((otherStock / total) * 100).toFixed(1) : '0.0',
            unit: 'pcs',
          });
        }
      }

      return {
        chartData: items,
        totalQuantity: total,
        uniqueGroupCount: validMaterials.length,
      };
    }
  }, [materials, groupBy]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs space-y-1.5 z-50">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#D4AF37]">
            {groupBy === 'category' ? <Layers className="w-4 h-4" /> : <Box className="w-4 h-4" />}
            <span>{item.name}</span>
          </div>
          <div className="flex justify-between items-center gap-6 text-zinc-300">
            <span>Total Stock:</span>
            <span className="font-semibold text-white">{item.value.toLocaleString()} {item.unit}</span>
          </div>
          {item.itemCount !== undefined && (
            <div className="flex justify-between items-center gap-6 text-zinc-300">
              <span>{groupBy === 'category' ? 'Material Types:' : 'Aggregated Items:'}</span>
              <span className="font-semibold text-white">{item.itemCount} SKUs</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-6 text-zinc-300">
            <span>Share of Inventory:</span>
            <span className="font-semibold text-emerald-400">{item.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-gray-400 gap-2">
        <Package className="w-8 h-8 text-gray-300" />
        <p className="text-sm font-medium">No stock data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between gap-3">
      {/* Grouping Toggle Selector: By Category vs By Item */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-semibold text-gray-500">Distribution View</span>
        <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => {
              setGroupBy('category');
              setActiveIndex(undefined);
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              groupBy === 'category'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            By Category
          </button>
          <button
            type="button"
            onClick={() => {
              setGroupBy('item');
              setActiveIndex(undefined);
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              groupBy === 'item'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            By Item
          </button>
        </div>
      </div>

      {/* Donut Chart with Center Summary */}
      <div className="relative h-[180px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.4}
                  style={{ transition: 'opacity 0.2s ease, transform 0.2s ease', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Stock</span>
          <span className="text-base font-black text-gray-900">{totalQuantity.toLocaleString()}</span>
          <span className="text-[10px] font-medium text-gray-500">
            {uniqueGroupCount} {groupBy === 'category' ? 'Categories' : 'Items'}
          </span>
        </div>
      </div>

      {/* Detailed Stock Legend List with Real Distribution */}
      <div className="space-y-1.5 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
          <span>{groupBy === 'category' ? 'Category Name' : 'Item Name'}</span>
          <span>Qty & Share</span>
        </div>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
          {chartData.map((item, index) => {
            const color = COLORS[index % COLORS.length];
            const isHovered = activeIndex === index;

            return (
              <div
                key={`${item.name}-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  isHovered ? 'bg-zinc-100 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-gray-800 font-medium text-xs">{item.name}</span>
                  {item.itemCount !== undefined && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                      {item.itemCount} {groupBy === 'category' ? 'types' : 'items'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right font-mono">
                  <span className="text-gray-900 font-semibold">{item.value.toLocaleString()}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${color}18`,
                      color: color === '#18181B' ? '#18181B' : color,
                    }}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
