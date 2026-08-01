import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";
import type { PrismaService } from "../prisma/prisma.service";
import type { PromotionService } from "../promotions/promotion.service";
import { createQuoteSignature } from "../checkout/checkout-domain";
import { OrderService } from "./order.service";
import { createIdempotencyFingerprint, maskPhone } from "./order-domain";

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

test("quote finalization failure rolls back order and payment writes", async () => {
  const row = quoteRow(new Date(Date.now() + 60_000));
  const state = { orders: 0, payments: 0, events: 0 };
  const prisma = {
    order: { findUnique: async () => null },
    $transaction: async (work: (tx: object) => Promise<unknown>) => {
      const before = { ...state };
      try {
        return await work({
          checkoutQuote: { findFirst: async () => row, updateMany: async () => { throw new Error("simulated quote finalization failure"); } },
          sku: { findMany: async () => [] },
          order: {
            create: async () => { state.orders += 1; },
            findUniqueOrThrow: async () => { throw new Error("not reached"); }
          },
          paymentIntent: { create: async () => { state.payments += 1; } },
          job: { create: async () => ({ id: "job-1" }) },
          orderEvent: { create: async () => { state.events += 1; } }
        });
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    }
  } as unknown as PrismaService;
  const service = new OrderService(prisma, promotions, config);
  await assert.rejects(() => service.create("customer-1", "key-rollback", { quoteId: row.id, signature: row.signature }), /simulated quote finalization failure/);
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

// --- 订单查询数据域：买家端（buyer）与管理端（admin）按入口隔离 ---

function crossStoreOrderRecord() {
  const dec = (value: number) => new Prisma.Decimal(value);
  const child = (id: string, merchantId: string, storeId: string, storeName: string) => ({
    id, orderId: "order-1", merchantId, storeId, status: "PAID", currency: "CNY",
    originalAmount: dec(10), shippingAmount: dec(0), discountAmount: dec(0), payableAmount: dec(10),
    merchantNote: null, createdAt: new Date(), store: { name: storeName }, shipments: [],
    items: [{
      id: `item-${id}`, merchantOrderId: id, storeId, productId: "product-1", skuId: "sku-1",
      productTitle: "演示手办", skuName: "标准版", coverFileId: null, quantity: 1, currency: "CNY",
      unitPrice: dec(10), originalAmount: dec(10), discountAmount: dec(0), payableAmount: dec(10)
    }]
  });
  return {
    id: "order-1", orderNumber: "MC0123456789ABCDEF0123", userId: "customer-a", requestHash: "hash",
    status: "PAID", currency: "CNY", originalAmount: dec(20), shippingAmount: dec(0),
    discountAmount: dec(0), payableAmount: dec(20),
    addressSnapshot: { recipient: "客户A", phone: "13800000000", country: "中国", province: "上海", city: "上海", district: "徐汇", addressLine: "测试路 1 号" },
    buyer: { displayName: "客户A" },
    merchantOrders: [child("mo-1", "merchant-1", "store-1", "商家一店"), child("mo-2", "merchant-2", "store-2", "商家二店")],
    paymentIntent: { id: "pi-1", status: "SUCCEEDED", provider: "SANDBOX", amount: dec(20), currency: "CNY", expiresAt: new Date(Date.now() + 60_000) },
    createdAt: new Date(), updatedAt: new Date()
  };
}

const dualRoleMerchant = { sub: "user-1", roles: ["CUSTOMER", "MERCHANT_OWNER"] as ("CUSTOMER" | "MERCHANT_OWNER")[], merchantId: "merchant-1" };
const serviceWith = (row: unknown) => new OrderService({ order: { findUnique: async () => row } } as unknown as PrismaService, promotions, config);

test("buyer scope: customer B reading customer A's order gets 404", async () => {
  const service = serviceWith(crossStoreOrderRecord());
  await assert.rejects(
    () => service.get({ sub: "customer-b", roles: ["CUSTOMER"] }, "order-1", "buyer"),
    (error: unknown) => error instanceof NotFoundException
  );
});

test("admin scope: dual-role merchant list is scoped by merchantId, not buyer id", async () => {
  let seenWhere: Record<string, unknown> | undefined;
  const prisma = { order: { findMany: async (args: { where: Record<string, unknown> }) => { seenWhere = args.where; return []; } } } as unknown as PrismaService;
  await new OrderService(prisma, promotions, config).list(dualRoleMerchant, {}, "admin");
  assert.deepEqual(seenWhere?.merchantOrders, { some: { merchantId: "merchant-1" } });
  assert.equal(seenWhere?.userId, undefined);
});

test("admin scope: merchant cannot read an order containing only another merchant's sub-order", async () => {
  const row = crossStoreOrderRecord();
  row.merchantOrders = row.merchantOrders.filter((child) => child.merchantId === "merchant-2");
  const service = serviceWith(row);
  await assert.rejects(
    () => service.get(dualRoleMerchant, "order-1", "admin"),
    (error: unknown) => error instanceof NotFoundException
  );
});

test("admin scope: merchant sees only own sub-orders and a masked phone even with a CUSTOMER role", async () => {
  const view = await serviceWith(crossStoreOrderRecord()).get(dualRoleMerchant, "order-1", "admin");
  assert.equal(view.merchantOrders.length, 1);
  assert.equal(view.merchantOrders[0]?.merchantId, "merchant-1");
  assert.equal(view.address.phone, maskPhone("13800000000"));
});

test("admin scope: platform operator reads across stores with masked phone", async () => {
  const view = await serviceWith(crossStoreOrderRecord()).get({ sub: "operator-1", roles: ["PLATFORM_OPERATOR"] }, "order-1", "admin");
  assert.equal(view.merchantOrders.length, 2);
  assert.equal(view.address.phone, maskPhone("13800000000"));
});

test("buyer scope: dual-role user still reads their own purchase with full sub-orders and unmasked phone", async () => {
  const view = await serviceWith(crossStoreOrderRecord()).get({ ...dualRoleMerchant, sub: "customer-a" }, "order-1", "buyer");
  assert.equal(view.merchantOrders.length, 2);
  assert.equal(view.address.phone, "13800000000");
});
