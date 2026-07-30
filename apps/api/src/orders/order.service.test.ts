import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";
import type { PrismaService } from "../prisma/prisma.service";
import type { PromotionService } from "../promotions/promotion.service";
import { createQuoteSignature } from "../checkout/checkout-domain";
import { OrderService } from "./order.service";
import { createIdempotencyFingerprint } from "./order-domain";

const secret = "s".repeat(32);
const config = { get: () => secret } as unknown as ConfigService<AppEnvironment, true>;
const promotions = {} as PromotionService;

function quoteRow(expiresAt: Date) {
  const snapshot = {
    id: "00000000-0000-4000-8000-000000000001",
    version: "g21.v1",
    signature: "",
    currency: "CNY",
    address: { recipient: "测试", phone: "13800000000", country: "中国", province: "上海", city: "上海", district: "徐汇", addressLine: "测试路 1 号" },
    couponCode: null,
    groups: [],
    originalAmount: "10.00",
    shippingAmount: "0.00",
    discountAmount: "0.00",
    payableAmount: "10.00",
    invalidCount: 0,
    valid: true,
    invalidReasons: [],
    expiresAt: expiresAt.toISOString()
  };
  const signature = createQuoteSignature({
    quoteId: snapshot.id,
    userId: "customer-1",
    version: snapshot.version,
    expiresAt: expiresAt.toISOString(),
    payableAmount: snapshot.payableAmount
  }, secret);
  snapshot.signature = signature;
  return {
    id: snapshot.id,
    userId: "customer-1",
    version: snapshot.version,
    signature,
    payableAmount: new Prisma.Decimal(snapshot.payableAmount),
    snapshot,
    expiresAt,
    consumedAt: null
  };
}

test("expired checkout quote is rejected before any order write", async () => {
  let writes = 0;
  const row = quoteRow(new Date(Date.now() - 1_000));
  const prisma = {
    order: { findUnique: async () => null },
    $transaction: async (work: (tx: object) => Promise<unknown>) => work({
      checkoutQuote: { findFirst: async () => row },
      order: { create: async () => { writes += 1; } }
    })
  } as unknown as PrismaService;
  const service = new OrderService(prisma, promotions, config);
  await assert.rejects(
    () => service.create("customer-1", "key-1", { quoteId: row.id, signature: row.signature }),
    (error: unknown) => error instanceof ConflictException && error.message === "CHECKOUT_QUOTE_EXPIRED"
  );
  assert.equal(writes, 0);
});

test("transaction failure rolls back order and payment writes", async () => {
  const row = quoteRow(new Date(Date.now() + 60_000));
  const state = { orders: 0, payments: 0, events: 0 };
  const prisma = {
    order: { findUnique: async () => null },
    $transaction: async (work: (tx: object) => Promise<unknown>) => {
      const before = { ...state };
      try {
        return await work({
          checkoutQuote: { findFirst: async () => row, updateMany: async () => ({ count: 1 }) },
          sku: { findMany: async () => [] },
          order: {
            create: async () => { state.orders += 1; },
            findUniqueOrThrow: async () => { throw new Error("not reached"); }
          },
          paymentIntent: { create: async () => { state.payments += 1; } },
          job: { create: async () => ({ id: "job-1" }) },
          orderEvent: { create: async () => { state.events += 1; } },
          cartItem: { deleteMany: async () => { throw new Error("simulated cart failure"); } }
        });
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    }
  } as unknown as PrismaService;
  const service = new OrderService(prisma, promotions, config);
  await assert.rejects(() => service.create("customer-1", "key-rollback", { quoteId: row.id, signature: row.signature }), /simulated cart failure/);
  assert.deepEqual(state, { orders: 0, payments: 0, events: 0 });
});

test("duplicate submission returns the original order without another transaction", async () => {
  const quoteId = "00000000-0000-4000-8000-000000000001";
  const signature = "signed-request-value-with-enough-length";
  let transactionCalls = 0;
  const existing = {
    id: "order-1", orderNumber: "MC0123456789ABCDEF0123", userId: "customer-1",
    requestHash: createIdempotencyFingerprint(quoteId, signature), status: "PENDING_PAYMENT",
    currency: "CNY", originalAmount: new Prisma.Decimal(10), shippingAmount: new Prisma.Decimal(0),
    discountAmount: new Prisma.Decimal(0), payableAmount: new Prisma.Decimal(10),
    addressSnapshot: { phone: "13800000000" }, buyer: { displayName: "买家" },
    merchantOrders: [], paymentIntent: {
      id: "payment-1", status: "PENDING", provider: "SANDBOX", amount: new Prisma.Decimal(10),
      currency: "CNY", expiresAt: new Date(Date.now() + 60_000)
    },
    createdAt: new Date(), updatedAt: new Date()
  };
  const prisma = {
    order: { findUnique: async () => existing },
    $transaction: async () => { transactionCalls += 1; }
  } as unknown as PrismaService;
  const result = await new OrderService(prisma, promotions, config).create("customer-1", "same-key", { quoteId, signature });
  assert.equal(result.id, "order-1");
  assert.equal(transactionCalls, 0);
});
