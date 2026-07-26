import { Prisma } from "@prisma/client";

/**
 * Money is stored as DECIMAL(10,2) in yuan (元) — exact, not floating point.
 * Prisma returns these columns as Prisma.Decimal objects, which serialize to
 * strings by default. The contract (shared types + API responses) exposes them
 * as plain JS numbers, so all Decimal values are normalized at the boundary.
 */
export type Decimalish = Prisma.Decimal | number | string | null | undefined;

export function toYuan(value: Decimalish): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function toYuanOrNull(value: Decimalish): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Two-decimal yuan rounding for line totals and sums (e.g. unit * quantity). */
export function roundYuan(value: number): number {
  return Math.round(value * 100) / 100;
}
