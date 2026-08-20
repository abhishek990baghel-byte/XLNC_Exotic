import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Material, Sale } from '../types';
import { TrendingUp, ShoppingBag } from 'lucide-react';

interface TopSellingChartProps {
  sales: Sale[];
  materials: Material[];
}

export default function TopSellingChart({ sales, materials }: TopSellingChartProps) {
  const chartData = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};

    if (sales && sales.length > 0) {
      sales.forEach((sale) => {
        if (Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const itemAny = item as any;
            const matName = item.material_name || itemAny.name || 'Unknown Material';
            if (!map[matName]) {
              map[matName] = { name: matName, quantity: 0, revenue: 0 };
            }
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price ?? itemAny.price) || 0;
            const total = Number(item.total) || (qty * price);
            map[matName].quantity += qty;
            map[matName].revenue += total;
          });
        }
      });
    }

    const sorted = Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    if (sorted.length > 0) {
      return sorted;
    }

    return [];
  }, [sales, materials]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs space-y-1.5">
          <p className="font-bold text-sm text-[#D4AF37]">{data.name}</p>
          <div className="flex justify-between gap-4 text-zinc-300">
            <span>Units Sold:</span>
            <span className="font-semibold text-white">{data.quantity} units</span>
          </div>
          <div className="flex justify-between gap-4 text-zinc-300">
            <span>Total Revenue:</span>
            <span className="font-semibold text-emerald-400">
              ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-gray-400 gap-2">
        <ShoppingBag className="w-8 h-8 text-gray-300" />
        <p className="text-sm font-medium">No sales transactions logged yet</p>
      </div>
    );
  }

  const COLORS = ['#D4AF37', '#18181B', '#4B5563', '#9CA3AF', '#D1D5DB'];

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={110}
              tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} />
            <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <TrendingUp className="w-3.5 h-3.5" /> Top items by volume
        </span>
        <span className="text-gray-400">Total top 5 items</span>
      </div>
    </div>
  );
}
