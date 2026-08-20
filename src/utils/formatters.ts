/**
 * Enterprise Internationalization (i18n) & Formatting Utilities
 * Uses native Intl.NumberFormat and Intl.DateTimeFormat for global currency, number, and date handling.
 */

export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

/**
 * Formats numeric values into localized currency strings (default: USD / en-US).
 * Returns '$0.00' (or local equivalent) for invalid or null inputs.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (amount === null || amount === undefined || isNaN(num)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats numbers into localized strings with optional fraction digits.
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === null || value === undefined || isNaN(num)) {
    return '0';
  }

  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Formats numbers into compact representations (e.g. 1.2K, 3.4M).
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  locale: string = 'en-US'
): string {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === null || value === undefined || isNaN(num)) {
    return '0';
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Formats a date string, timestamp, or Date object into localized format.
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Formats date and time into standard localized format (e.g., Oct 24, 2026, 2:30 PM).
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  locale: string = 'en-US'
): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats a percentage value (e.g., 0.15 -> 15.0%).
 */
export function formatPercent(
  value: number | string | null | undefined,
  locale: string = 'en-US',
  decimals: number = 1
): string {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === null || value === undefined || isNaN(num)) {
    return '0%';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
