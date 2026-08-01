import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  createAutoConfirmAt,
  planShipmentLines,
  resolveFulfillmentStatus,
  resolveOrderShipmentStatus,
  sandboxTrackingEvents,
  ShipmentPlanError,
  shippedQuantities,
  shouldAutoConfirmReceipt
} from "./shipment-domain";

const items = [
  { id: "item-1", quantity: 3 },
  { id: "item-2", quantity: 2 }
];

test("partial shipment across multiple parcels stays within the ordered quantity", () => {
  const first = planShipmentLines(items, new Map(), [{ orderItemId: "item-1", quantity: 2 }]);
  assert.equal(first.get("item-1"), 2);
  const shipped = shippedQuantities([{ items: [{ orderItemId: "item-1", quantity: 2 }] }]);
  const second = planShipmentLines(items, shipped, [
    { orderItemId: "item-1", quantity: 1 },
    { orderItemId: "item-2", quantity: 2 }
  ]);
  assert.equal(second.get("item-1"), 1);
  assert.equal(second.get("item-2"), 2);
  assert.equal(resolveFulfillmentStatus(items, shippedQuantities([{ items: [...second].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) }, { items: [{ orderItemId: "item-1", quantity: 2 }] }])), "SHIPPED");
});

test("duplicate lines merge and over-shipping is rejected with a stable code", () => {
  const merged = planShipmentLines(items, new Map(), [
    { orderItemId: "item-1", quantity: 1 },
    { orderItemId: "item-1", quantity: 2 }
  ]);
  assert.equal(merged.get("item-1"), 3);
  assert.throws(
    () => planShipmentLines(items, new Map([["item-1", 3]]), [{ orderItemId: "item-1", quantity: 1 }]),
    (error: unknown) => error instanceof ShipmentPlanError && error.code === "SHIPMENT_QUANTITY_EXCEEDED"
  );
  assert.throws(
    () => planShipmentLines(items, new Map(), [{ orderItemId: "stranger", quantity: 1 }]),
    (error: unknown) => error instanceof ShipmentPlanError && error.code === "SHIPMENT_ITEM_NOT_IN_ORDER"
  );
  assert.throws(
    () => planShipmentLines(items, new Map(), []),
    (error: unknown) => error instanceof ShipmentPlanError && error.code === "SHIPMENT_LINES_EMPTY"
  );
  assert.throws(
    () => planShipmentLines(items, new Map(), [{ orderItemId: "item-1", quantity: 0 }]),
    (error: unknown) => error instanceof ShipmentPlanError && error.code === "SHIPMENT_QUANTITY_INVALID"
  );
});

test("fulfillment status flips to SHIPPED only when every item is fully shipped", () => {
  assert.equal(resolveFulfillmentStatus(items, new Map([["item-1", 3], ["item-2", 1]])), "PARTIALLY_SHIPPED");
  assert.equal(resolveFulfillmentStatus(items, new Map([["item-1", 3], ["item-2", 2]])), "SHIPPED");
  assert.equal(resolveOrderShipmentStatus([{ status: "SHIPPED" }, { status: "PARTIALLY_SHIPPED" }]), "PARTIALLY_SHIPPED");
  assert.equal(resolveOrderShipmentStatus([{ status: "SHIPPED" }, { status: "SHIPPED" }]), "SHIPPED");
});

test("auto confirm runs the configured number of days after full shipment", () => {
  const shippedAt = new Date("2026-08-01T10:00:00.000Z");
  assert.equal(createAutoConfirmAt(shippedAt, 15).toISOString(), "2026-08-16T10:00:00.000Z");
  assert.equal(shouldAutoConfirmReceipt("SHIPPED"), true);
  assert.equal(shouldAutoConfirmReceipt("PARTIALLY_SHIPPED"), false);
  assert.equal(shouldAutoConfirmReceipt("COMPLETED"), false);
});

test("sandbox tracking trail is deterministic, ordered, and minute-based", () => {
  const shippedAt = new Date("2026-08-01T10:00:00.000Z");
  const early = sandboxTrackingEvents("SF", "SF123456", shippedAt, new Date(shippedAt.getTime() + 60_000));
  assert.equal(early.length, 1);
  assert.equal(early[0].status, "PICKED_UP");
  const full = sandboxTrackingEvents("SF", "SF123456", shippedAt, new Date(shippedAt.getTime() + 20 * 60_000));
  assert.equal(full.at(-1)?.status, "DELIVERED");
  const repeat = sandboxTrackingEvents("SF", "SF123456", shippedAt, new Date(shippedAt.getTime() + 20 * 60_000));
  assert.deepEqual(full, repeat);
  const timestamps = full.map((event) => Date.parse(event.occurredAt));
  assert.deepEqual(timestamps, [...timestamps].sort((a, b) => a - b));
});
