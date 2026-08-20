import { describe, it, expect } from 'vitest';
import { createLedgerEntry } from '../ledger';

describe('Ledger Utils', () => {
  describe('createLedgerEntry', () => {
    it('should create a valid ledger entry', () => {
      const entry = createLedgerEntry('mat-123', 'Purchase-In', 50, 150, 'Admin', 'ref-456');
      
      expect(entry).toHaveProperty('id');
      expect(typeof entry.id).toBe('string');
      expect(entry.material_id).toBe('mat-123');
      expect(entry.movement_type).toBe('Purchase-In');
      expect(entry.quantity_changed).toBe(50);
      expect(entry.balance).toBe(150);
      expect(entry.user_name).toBe('Admin');
      expect(entry.reference_id).toBe('ref-456');
    });

    it('should create an entry without a reference_id', () => {
      const entry = createLedgerEntry('mat-456', 'Manual Adjustment', -10, 90, 'User');
      
      expect(entry.reference_id).toBeUndefined();
      expect(entry.quantity_changed).toBe(-10);
    });
  });
});
