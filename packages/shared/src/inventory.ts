export const INVENTORY_LEDGER_TYPES = [
  "INITIAL_STOCK",
  "ADJUSTMENT",
  "RESERVATION_CREATED",
  "RESERVATION_COMMITTED",
  "RESERVATION_RELEASED"
] as const;

export type InventoryLedgerType = (typeof INVENTORY_LEDGER_TYPES)[number];
export type InventoryReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

export interface InventoryListItem {
  inventoryId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  productId: string;
  productTitle: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
  version: number;
  updatedAt: string;
}

export interface InventoryLedgerView {
  id: string;
  inventoryId: string;
  type: InventoryLedgerType;
  onHandDelta: number;
  reservedDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  actorId?: string;
  createdAt: string;
}

export interface InventoryReservationView {
  id: string;
  skuId: string;
  referenceId: string;
  quantity: number;
  status: InventoryReservationStatus;
  expiresAt: string;
}
