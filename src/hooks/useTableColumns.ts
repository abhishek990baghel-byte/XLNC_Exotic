import { useState, useEffect } from 'react';

export interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
}

export function useTableColumns(storageKey: string, initialColumns: ColumnDef[]) {
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return initialColumns.map(col => {
          const storedCol = parsed.find((p: any) => p.id === col.id);
          if (storedCol) {
            return { ...col, visible: storedCol.visible, width: storedCol.width };
          }
          return col;
        });
      } catch (e) {
        return initialColumns;
      }
    }
    return initialColumns;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columns.map(c => ({ id: c.id, visible: c.visible, width: c.width }))));
  }, [columns, storageKey]);

  const toggleVisibility = (id: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const setWidth = (id: string, width: number) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, width } : c));
  };

  return { columns, toggleVisibility, setWidth };
}
