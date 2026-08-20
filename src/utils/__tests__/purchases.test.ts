import { describe, it, expect } from 'vitest';

describe('Purchases Line Items & Calculation Utilities', () => {
  it('correctly calculates line item totals on quantity and price changes', () => {
    const calculateLineTotal = (qty: number, price: number) => {
      return Math.round((Number(qty || 0) * Number(price || 0)) * 100) / 100;
    };

    expect(calculateLineTotal(1, 90)).toBe(90.00);
    expect(calculateLineTotal(5, 12.5)).toBe(62.50);
    expect(calculateLineTotal(3, 19.99)).toBe(59.97);
    expect(calculateLineTotal(0, 50)).toBe(0);
  });

  it('correctly calculates invoice grand total from line items', () => {
    const items = [
      { quantity: 2, unit_price: 45, total: 90 },
      { quantity: 3, unit_price: 20, total: 60 },
      { quantity: 1, unit_price: 15.5, total: 15.5 }
    ];

    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    expect(grandTotal).toBe(165.50);
  });

  it('handles supplier fallback and trimming correctly', () => {
    const sanitizeSupplier = (vendorName?: string, supplierName?: string) => {
      const name = (vendorName || supplierName || '').trim();
      return name.length > 0 ? name : null;
    };

    expect(sanitizeSupplier('  Acme Corp  ', '')).toBe('Acme Corp');
    expect(sanitizeSupplier('', ' Global Stone ')).toBe('Global Stone');
    expect(sanitizeSupplier('   ', '   ')).toBeNull();
  });
});
