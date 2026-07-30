import { createHash, randomBytes } from "node:crypto";
import type { OrderStatus } from "@moecraft/shared";

const transitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "CLOSED"],
  PAID: ["PARTIALLY_SHIPPED", "SHIPPED", "AFTER_SALE", "CANCELLED"],
  PARTIALLY_SHIPPED: ["SHIPPED", "AFTER_SALE"],
  SHIPPED: ["COMPLETED", "AFTER_SALE"],
  COMPLETED: ["AFTER_SALE"],
  CANCELLED: [],
  AFTER_SALE: ["COMPLETED", "CLOSED"],
  CLOSED: []
};
export function canApplyOrderTransition(from: OrderStatus, to: OrderStatus) { return transitions[from].includes(to); }
export function createIdempotencyFingerprint(quoteId: string, signature: string) {
  return createHash("sha256").update(`${quoteId}.${signature}`).digest("hex");
}
export function createPublicOrderNumber(_now = new Date()) { return `MC${randomBytes(10).toString("hex").toUpperCase()}`; }
export function maskPhone(phone: string) {
  const value = phone.trim();
  return value.length < 7 ? "***" : `${value.slice(0, 3)}****${value.slice(-4)}`;
}
