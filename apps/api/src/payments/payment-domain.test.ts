import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  assertPaymentFacts,
  canApplyPaymentEvent,
  signSandboxWebhook,
  verifySandboxWebhookSignature
} from "./payment-domain";

test("sandbox webhook signature covers the exact raw body", () => {
  const raw = Buffer.from('{"eventId":"evt-1","status":"SUCCEEDED"}');
  const signature = signSandboxWebhook(raw, "p".repeat(32));
  assert.equal(verifySandboxWebhookSignature(raw, signature, "p".repeat(32)), true);
  assert.equal(verifySandboxWebhookSignature(Buffer.from(`${raw.toString()} `), signature, "p".repeat(32)), false);
});

test("payment facts reject amount or currency mismatches", () => {
  assert.doesNotThrow(() => assertPaymentFacts("88.00", "CNY", "88.00", "CNY"));
  assert.throws(() => assertPaymentFacts("88.00", "CNY", "87.99", "CNY"), { message: "PAYMENT_AMOUNT_MISMATCH" });
  assert.throws(() => assertPaymentFacts("88.00", "CNY", "88.00", "USD"), { message: "PAYMENT_CURRENCY_MISMATCH" });
});

test("duplicate or out-of-order events cannot regress a terminal payment", () => {
  assert.equal(canApplyPaymentEvent("PROCESSING", "SUCCEEDED"), true);
  assert.equal(canApplyPaymentEvent("SUCCEEDED", "SUCCEEDED"), false);
  assert.equal(canApplyPaymentEvent("SUCCEEDED", "FAILED"), false);
  assert.equal(canApplyPaymentEvent("FAILED", "PROCESSING"), true);
});
