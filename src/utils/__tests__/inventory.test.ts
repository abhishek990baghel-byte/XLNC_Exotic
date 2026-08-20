import { describe, it, expect } from 'vitest';
import { calculateNewStock, isLowStock, validateStockOperation } from '../inventory';

describe('Inventory Utils', () => {
  describe('calculateNewStock', () => {
    it('should correctly calculate stock after a sale', () => {
      expect(calculateNewStock(100, 20, 'Sale')).toBe(80);
    });

    it('should correctly calculate stock after a purchase', () => {
      expect(calculateNewStock(100, 50, 'Purchase')).toBe(150);
    });

    it('should correctly calculate stock after an adjustment', () => {
      expect(calculateNewStock(100, -10, 'Adjustment')).toBe(90);
      expect(calculateNewStock(100, 10, 'Adjustment')).toBe(110);
    });
  });

  describe('isLowStock', () => {
    it('should return true when stock is below minimum', () => {
      expect(isLowStock(10, 20)).toBe(true);
      expect(isLowStock(0, 5)).toBe(true);
    });

    it('should return false when stock is equal to or above minimum', () => {
      expect(isLowStock(20, 20)).toBe(false);
      expect(isLowStock(30, 20)).toBe(false);
    });
  });

  describe('validateStockOperation', () => {
    it('should return valid for normal deductions', () => {
      expect(validateStockOperation(100, 20)).toEqual({ valid: true });
    });

    it('should return invalid for negative quantities', () => {
      expect(validateStockOperation(100, -10)).toEqual({ valid: false, error: 'Quantity cannot be negative' });
    });

    it('should return invalid when deducting more than available stock', () => {
      expect(validateStockOperation(10, 20)).toEqual({ valid: false, error: 'Insufficient stock available' });
    });
  });
});
