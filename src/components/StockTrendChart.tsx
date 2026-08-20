import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StockLedger } from '../types';

interface StockTrendChartProps {
  history: StockLedger[];
  currentStock: number;
}

export default function StockTrendChart({ history, currentStock }: StockTrendChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const days: { date: string; balance: number }[] = [];
    
    // Sort history chronologically (ascending)
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Iterate over the last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() - i);
      
      const dateString = d.toISOString().split('T')[0];
      const dTime = d.getTime();
      
      // Find the last known balance on or before this day
      let balanceForDay = 0;
      
      if (sortedHistory.length > 0) {
        // Find the most recent entry up to this day
        let found = false;
        for (let j = sortedHistory.length - 1; j >= 0; j--) {
          const entryTime = new Date(sortedHistory[j].timestamp).getTime();
          if (entryTime <= dTime) {
            balanceForDay = sortedHistory[j].balance;
            found = true;
            break;
          }
        }
        
        if (!found) {
          // If no entries on or before this day, we can trace back from the first known entry
          // Actually, if an entry was made after this day, the balance before it would be its balance - quantity_changed
          balanceForDay = sortedHistory[0].balance - sortedHistory[0].quantity_changed;
        }
      } else {
        balanceForDay = currentStock;
      }

      days.push({
        date: dateString,
        balance: balanceForDay
      });
    }

    return days;
  }, [history, currentStock]);

  if (history.length === 0 && currentStock === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No stock history available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dx={-10}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            labelFormatter={(label) => label ? new Date(String(label)).toLocaleDateString() : ''}
            formatter={(value: number) => [value, 'Stock Level']}
          />
          <Line 
            type="stepAfter" 
            dataKey="balance" 
            stroke="#000000" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
