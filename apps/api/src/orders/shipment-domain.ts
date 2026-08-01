import { createHash } from "node:crypto";
import type { OrderStatus, ShipmentTrackingEvent } from "@moecraft/shared";

export type ShipmentRequestLine = { orderItemId: string; quantity: number };
export type ShippableItem = { id: string; quantity: number };

export class ShipmentPlanError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ShipmentPlanError";
  }
}

/** 合并重复行并校验：行属于该子单、数量为正整数、累计不超可发剩余。 */
export function planShipmentLines(items: ShippableItem[], shippedByItem: ReadonlyMap<string, number>, lines: ShipmentRequestLine[]): Map<string, number> {
  if (!lines.length) throw new ShipmentPlanError("SHIPMENT_LINES_EMPTY");
  const ordered = new Map(items.map((item) => [item.id, item.quantity]));
  const planned = new Map<string, number>();
  for (const line of lines) {
    if (!ordered.has(line.orderItemId)) throw new ShipmentPlanError("SHIPMENT_ITEM_NOT_IN_ORDER");
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new ShipmentPlanError("SHIPMENT_QUANTITY_INVALID");
    planned.set(line.orderItemId, (planned.get(line.orderItemId) ?? 0) + line.quantity);
  }
  for (const [orderItemId, quantity] of planned) {
    const remaining = ordered.get(orderItemId)! - (shippedByItem.get(orderItemId) ?? 0);
    if (quantity > remaining) throw new ShipmentPlanError("SHIPMENT_QUANTITY_EXCEEDED");
  }
  return planned;
}

/** 汇总已发货数量（按订单项）。 */
export function shippedQuantities(shipments: Array<{ items: Array<{ orderItemId: string; quantity: number }> }>): Map<string, number> {
  const totals = new Map<string, number>();
  for (const shipment of shipments) {
    for (const item of shipment.items) totals.set(item.orderItemId, (totals.get(item.orderItemId) ?? 0) + item.quantity);
  }
  return totals;
}

/** 全部订单项发满为 SHIPPED，否则为 PARTIALLY_SHIPPED。 */
export function resolveFulfillmentStatus(items: ShippableItem[], shippedByItem: ReadonlyMap<string, number>): "PARTIALLY_SHIPPED" | "SHIPPED" {
  return items.every((item) => (shippedByItem.get(item.id) ?? 0) >= item.quantity) ? "SHIPPED" : "PARTIALLY_SHIPPED";
}

/** 全部子单发满时总单才算 SHIPPED，否则 PARTIALLY_SHIPPED。 */
export function resolveOrderShipmentStatus(children: Array<{ status: OrderStatus }>): "PARTIALLY_SHIPPED" | "SHIPPED" {
  return children.every((child) => child.status === "SHIPPED") ? "SHIPPED" : "PARTIALLY_SHIPPED";
}

export function createAutoConfirmAt(shippedAt: Date, days: number): Date {
  return new Date(shippedAt.getTime() + days * 86_400_000);
}

export function shouldAutoConfirmReceipt(status: OrderStatus): boolean {
  return status === "SHIPPED";
}

/** 沙箱轨迹按分钟推进，便于本地与验收环境快速看到完整物流生命周期。 */
const milestones = [
  { status: "PICKED_UP", description: "包裹已揽收", offsetMinutes: 0 },
  { status: "IN_TRANSIT", description: "包裹已发出，干线运输中", offsetMinutes: 2 },
  { status: "IN_TRANSIT", description: "包裹到达区域转运中心", offsetMinutes: 5 },
  { status: "OUT_FOR_DELIVERY", description: "包裹派送中，请保持电话畅通", offsetMinutes: 8 },
  { status: "DELIVERED", description: "包裹已签收，感谢使用", offsetMinutes: 10 }
] as const;

export function sandboxTrackingEvents(carrier: string, trackingNumber: string, shippedAt: Date, now = new Date()): ShipmentTrackingEvent[] {
  const jitter = createHash("sha256").update(`${carrier}.${trackingNumber}`).digest()[0] % 3;
  return milestones
    .map((milestone, index) => ({ status: milestone.status, description: milestone.description, occurredAt: new Date(shippedAt.getTime() + (milestone.offsetMinutes + (index === 0 ? 0 : jitter)) * 60_000) }))
    .filter((event) => event.occurredAt <= now)
    .map((event) => ({ status: event.status, description: event.description, occurredAt: event.occurredAt.toISOString() }));
}
