export type InventorySnapshot = { onHand: number; reserved: number; version: number };

export class InvalidInventoryMutationError extends Error {
  constructor(readonly code: "NEGATIVE_INVENTORY" | "INSUFFICIENT_AVAILABLE_STOCK") {
    super(code);
  }
}

export function applyInventoryDelta(snapshot: InventorySnapshot, onHandDelta: number, reservedDelta: number): InventorySnapshot {
  const next = {
    onHand: snapshot.onHand + onHandDelta,
    reserved: snapshot.reserved + reservedDelta,
    version: snapshot.version + 1
  };
  if (next.onHand < 0 || next.reserved < 0) throw new InvalidInventoryMutationError("NEGATIVE_INVENTORY");
  if (next.reserved > next.onHand) throw new InvalidInventoryMutationError("INSUFFICIENT_AVAILABLE_STOCK");
  return next;
}
