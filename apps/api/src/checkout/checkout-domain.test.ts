import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  assertQuoteSignature,
  createQuoteSignature,
  summarizeQuoteGroups
} from "./checkout-domain";

test("checkout quote signature binds customer, version, expiry, and total", () => {
  const input = {
    quoteId: "quote-1",
    userId: "customer-1",
    version: "g21.v1",
    expiresAt: "2026-07-30T10:10:00.000Z",
    payableAmount: "88.00"
  };
  const signature = createQuoteSignature(input, "a".repeat(32));
  assert.equal(assertQuoteSignature(input, signature, "a".repeat(32)), true);
  assert.equal(assertQuoteSignature({ ...input, payableAmount: "1.00" }, signature, "a".repeat(32)), false);
});

test("checkout totals include free shipping and preserve invalid reasons", () => {
  const summary = summarizeQuoteGroups([
    { originalAmount: "100.00", discountAmount: "12.00", invalidCount: 0 },
    { originalAmount: "20.00", discountAmount: "0.00", invalidCount: 1 }
  ]);
  assert.deepEqual(summary, {
    originalAmount: "120.00",
    shippingAmount: "0.00",
    discountAmount: "12.00",
    payableAmount: "108.00",
    invalidCount: 1
  });
});
