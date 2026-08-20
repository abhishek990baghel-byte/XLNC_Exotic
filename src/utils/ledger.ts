import { v4 as uuidv4 } from 'uuid';

export type MovementType = 'Initial Import' | 'Manual Adjustment' | 'Purchase-In' | 'Sale-Out';

export interface LedgerEntry {
  id: string;
  material_id: string;
  movement_type: MovementType;
  quantity_changed: number;
  balance: number;
  reference_id?: string;
  user_name: string;
}

export function createLedgerEntry(
  materialId: string,
  movementType: MovementType,
  quantityChanged: number,
  newBalance: number,
  userName: string,
  referenceId?: string
): LedgerEntry {
  return {
    id: uuidv4(),
    material_id: materialId,
    movement_type: movementType,
    quantity_changed: quantityChanged,
    balance: newBalance,
    reference_id: referenceId,
    user_name: userName,
  };
}
