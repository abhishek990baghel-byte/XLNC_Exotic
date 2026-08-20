import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatPercent,
} from '../src/utils/formatters';

describe('Internationalization (i18n) Formatters', () => {
  describe('formatCurrency', () => {
    it('formats numbers to USD currency standard correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('handles string input gracefully', () => {
      expect(formatCurrency('499.99')).toBe('$499.99');
      expect(formatCurrency('12500')).toBe('$12,500.00');
    });

    it('returns $0.00 for null, undefined, or invalid inputs', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('invalid-number')).toBe('$0.00');
    });

    it('supports alternative currency codes', () => {
      const formattedEUR = formatCurrency(100, 'EUR', 'en-US');
      expect(formattedEUR).toContain('100.00');
      expect(formattedEUR).toContain('€');
    });
  });

  describe('formatNumber', () => {
    it('formats plain numbers with thousands separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(42)).toBe('42');
    });

    it('returns "0" for invalid or missing inputs', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats large numbers into compact notation', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(2500000)).toBe('2.5M');
      expect(formatCompactNumber(450)).toBe('450');
    });
  });

  describe('formatDate', () => {
    it('formats date strings and timestamp numbers correctly', () => {
      const fixedDate = new Date('2026-08-14T12:00:00Z');
      const formatted = formatDate(fixedDate, 'en-US');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Aug');
    });

    it('returns "-" for invalid dates or null', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('not-a-date')).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time accurately', () => {
      const fixedDate = new Date('2026-08-14T15:30:00Z');
      const formatted = formatDateTime(fixedDate, 'en-US');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Aug');
    });
  });

  describe('formatPercent', () => {
    it('formats decimal numbers as percentages', () => {
      expect(formatPercent(0.155)).toBe('15.5%');
      expect(formatPercent(1.0)).toBe('100.0%');
    });
  });
});
