import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  canApplyOrderTransition,
  createIdempotencyFingerprint,
  createPublicOrderNumber
} from "./order-domain";

test("order state machine rejects payment and fulfillment regressions", () => {
  assert.equal(canApplyOrderTransition("PENDING_PAYMENT", "PAID"), true);
  assert.equal(canApplyOrderTransition("PENDING_PAYMENT", "CLOSED"), true);
  assert.equal(canApplyOrderTransition("SHIPPED", "COMPLETED"), true);
  assert.equal(canApplyOrderTransition("PAID", "PENDING_PAYMENT"), false);
  assert.equal(canApplyOrderTransition("CLOSED", "PAID"), false);
});

test("idempotency fingerprint changes when the quote request changes", () => {
  const first = createIdempotencyFingerprint("quote-1", "signature-a");
  assert.equal(first, createIdempotencyFingerprint("quote-1", "signature-a"));
  assert.notEqual(first, createIdempotencyFingerprint("quote-2", "signature-a"));
  assert.notEqual(first, createIdempotencyFingerprint("quote-1", "signature-b"));
});

test("public order numbers are opaque and fixed length", () => {
  const first = createPublicOrderNumber(new Date("2026-07-30T00:00:00Z"));
  const second = createPublicOrderNumber(new Date("2026-07-30T00:00:00Z"));
  assert.match(first, /^MC[A-Z0-9]{20}$/);
  assert.notEqual(first, second);
});
