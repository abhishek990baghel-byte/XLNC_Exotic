import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Material } from '../types';
import { DollarSign, Layers } from 'lucide-react';

interface InventoryValueChartProps {
  materials: Material[];
}

export default function InventoryValueChart({ materials }: InventoryValueChartProps) {
  const chartData = useMemo(() => {
    if (!materials || materials.length === 0) return [];

    const categoryMap: Record<
      string,
      { category: string; costValue: number; totalStock: number }
    > = {};

    materials.forEach((m) => {
      const cat = m.category || 'Uncategorized';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          costValue: 0,
          totalStock: 0,
        };
      }
      const stock = m.stock || 0;
      const cost = m.cost_price || 0;

      categoryMap[cat].costValue += stock * cost;
      categoryMap[cat].totalStock += stock;
    });

    return Object.values(categoryMap)
      .sort((a, b) => b.costValue - a.costValue)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        costValue: Number(item.costValue.toFixed(2)),
      }));
  }, [materials]);

  const totalInventoryAssetValue = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.stock || 0) * (m.cost_price || 0), 0);
  }, [materials]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs space-y-2 min-w-[180px]">
          <p className="font-bold text-sm text-[#D4AF37] border-b border-zinc-800 pb-1">
            {data.category}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-zinc-300">
              <span>Total Units:</span>
              <span className="font-semibold text-white">{data.totalStock}</span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-300">
              <span>Cost Valuation:</span>
              <span className="font-semibold text-amber-400">
                ${data.costValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-gray-400 gap-2">
        <Layers className="w-8 h-8 text-gray-300" />
        <p className="text-sm font-medium">No material inventory data found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
            <Bar
              dataKey="costValue"
              name="Asset Cost ($)"
              fill="#D4AF37"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
          <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          Total Asset: ${totalInventoryAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
