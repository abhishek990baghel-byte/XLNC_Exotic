export function calculateNewStock(currentStock: number, quantityChanged: number, type: 'Sale' | 'Purchase' | 'Adjustment'): number {
  switch (type) {
    case 'Sale':
      return currentStock - quantityChanged;
    case 'Purchase':
    case 'Adjustment':
      return currentStock + quantityChanged;
    default:
      return currentStock;
  }
}

export function isLowStock(currentStock: number, minStock: number): boolean {
  return currentStock < minStock;
}

export function validateStockOperation(currentStock: number, quantityToDeduct: number): { valid: boolean; error?: string } {
  if (quantityToDeduct < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  if (currentStock - quantityToDeduct < 0) {
    return { valid: false, error: 'Insufficient stock available' };
  }
  return { valid: true };
}
