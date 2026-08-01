import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import type { AppEnvironment } from "../config/environment";
import type { PrismaService } from "../prisma/prisma.service";
import type { PromotionService } from "../promotions/promotion.service";
import type { RequestPrincipal } from "../auth/authorization";
import { OrderService } from "./order.service";

const config = { get: (key: string) => (key === "ORDER_AUTO_CONFIRM_DAYS" ? 15 : "s".repeat(32)) } as unknown as ConfigService<AppEnvironment, true>;
const promotions = {} as PromotionService;

const merchant: RequestPrincipal = { sub: "merchant-user-1", roles: ["CUSTOMER", "MERCHANT_OWNER"], merchantId: "merchant-1" } as RequestPrincipal;

type Item = { id: string; quantity: number };
type ShipmentState = { id: string; merchantOrderId: string; carrier: string; trackingNumber: string; status: string; note: string | null; shippedAt: Date; deliveredAt: Date | null; createdBy: string | null; createdAt: Date; updatedAt: Date; items: Array<{ id: string; orderItemId: string; quantity: number }> };

function orderRecord(overrides: { orderStatus?: string; childStatus?: string; paymentStatus?: string; items?: Item[]; shipments?: ShipmentState[] } = {}) {
  const items = (overrides.items ?? [{ id: "00000000-0000-4000-8000-0000000000a1", quantity: 3 }]).map((item) => ({
    id: item.id, merchantOrderId: "child-1", orderId: "order-1", storeId: "store-1", productId: "product-1", skuId: "sku-1",
    productTitle: "测试商品", skuName: "标准版", coverFileId: null, quantity: item.quantity, currency: "CNY",
    unitPrice: new Prisma.Decimal("10.00"), originalAmount: new Prisma.Decimal("30.00"), discountAmount: new Prisma.Decimal("0.00"), payableAmount: new Prisma.Decimal("30.00")
  }));
  return {
    id: "order-1", orderNumber: "MCTEST", userId: "customer-1", status: overrides.orderStatus ?? "PAID", currency: "CNY",
    originalAmount: new Prisma.Decimal("30.00"), shippingAmount: new Prisma.Decimal("0.00"), discountAmount: new Prisma.Decimal("0.00"), payableAmount: new Prisma.Decimal("30.00"),
    addressSnapshot: { recipient: "测试", phone: "13800000000", country: "中国", province: "上海", city: "上海", district: "徐汇", addressLine: "测试路 1 号" },
    buyer: { displayName: "买家" },
    merchantOrders: [{
      id: "child-1", orderId: "order-1", merchantId: "merchant-1", storeId: "store-1", status: overrides.childStatus ?? "PAID", currency: "CNY",
      originalAmount: new Prisma.Decimal("30.00"), shippingAmount: new Prisma.Decimal("0.00"), discountAmount: new Prisma.Decimal("0.00"), payableAmount: new Prisma.Decimal("30.00"),
      merchantNote: null, store: { name: "测试店铺" }, items, shipments: overrides.shipments ?? []
    }],
    paymentIntent: { id: "payment-1", status: overrides.paymentStatus ?? "SUCCEEDED", provider: "SANDBOX", amount: new Prisma.Decimal("30.00"), currency: "CNY", expiresAt: new Date(Date.now() + 60_000) },
    createdAt: new Date("2026-08-01T10:00:00.000Z"), updatedAt: new Date("2026-08-01T10:00:00.000Z")
  };
}

function shipmentState(lines: Array<[string, number]>, trackingNumber = "SF1001"): ShipmentState {
  return {
    id: "shipment-1", merchantOrderId: "child-1", carrier: "SF", trackingNumber, status: "SHIPPED", note: null,
    shippedAt: new Date("2026-07-01T11:00:00.000Z"), deliveredAt: null, createdBy: "merchant-user-1",
    createdAt: new Date("2026-07-01T11:00:00.000Z"), updatedAt: new Date("2026-07-01T11:00:00.000Z"),
    items: lines.map(([orderItemId, quantity], index) => ({ id: `si-${index}`, orderItemId, quantity }))
  };
}

type Writes = { shipments: number; jobs: number; events: number; audits: number; childStatus?: string; orderStatus?: string };

function prismaStub(record: ReturnType<typeof orderRecord>, writes: Writes) {
  const tx = {
    order: {
      findUnique: async () => record,
      findUniqueOrThrow: async () => record,
      update: async ({ data }: { data: { status: string } }) => { writes.orderStatus = data.status; record.status = data.status; }
    },
    shipment: { create: async ({ data }: { data: { merchantOrderId: string; carrier: string; trackingNumber: string; items: { create: Array<{ orderItemId: string; quantity: number }> } } }) => {
      writes.shipments += 1;
      const created = shipmentState(data.items.create.map((line): [string, number] => [line.orderItemId, line.quantity]), data.trackingNumber);
      created.carrier = data.carrier;
      record.merchantOrders[0].shipments.push(created);
      return created;
    } },
    merchantOrder: { update: async ({ data }: { data: { status: string } }) => { writes.childStatus = data.status; record.merchantOrders[0].status = data.status; } },
    orderEvent: { create: async () => { writes.events += 1; } },
    job: { create: async () => { writes.jobs += 1; } },
    auditLog: { create: async () => { writes.audits += 1; } }
  };
  return { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) } as unknown as PrismaService;
}

const dto = { carrier: "SF", trackingNumber: "SF2002", items: [{ orderItemId: "00000000-0000-4000-8000-0000000000a1", quantity: 1 }] };

test("ship re-checks order status and rejects unpaid or closed orders", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const service = new OrderService(prismaStub(orderRecord({ orderStatus: "PENDING_PAYMENT", childStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" }), writes), promotions, config);
  await assert.rejects(() => service.ship(merchant, "order-1", "child-1", dto), (error: unknown) => error instanceof ConflictException && error.message === "ORDER_STATUS_CONFLICT");
  assert.equal(writes.shipments, 0);
});

test("ship rejects a paid order whose payment fact is not SUCCEEDED", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const service = new OrderService(prismaStub(orderRecord({ paymentStatus: "PROCESSING" }), writes), promotions, config);
  await assert.rejects(() => service.ship(merchant, "order-1", "child-1", dto), (error: unknown) => error instanceof ConflictException && error.message === "ORDER_NOT_PAID");
});

test("ship scopes the merchant order to the caller's merchant", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const outsider = { ...merchant, merchantId: "merchant-2" } as RequestPrincipal;
  const service = new OrderService(prismaStub(orderRecord(), writes), promotions, config);
  await assert.rejects(() => service.ship(outsider, "order-1", "child-1", dto), (error: unknown) => error instanceof NotFoundException && error.message === "MERCHANT_ORDER_NOT_FOUND");
  assert.equal(writes.shipments, 0);
});

test("partial then full shipment advances statuses and schedules auto-confirm once", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const record = orderRecord();
  const service = new OrderService(prismaStub(record, writes), promotions, config);
  await service.ship(merchant, "order-1", "child-1", dto);
  assert.equal(writes.childStatus, "PARTIALLY_SHIPPED");
  assert.equal(writes.orderStatus, "PARTIALLY_SHIPPED");
  assert.equal(writes.jobs, 0);
  assert.equal(writes.audits, 1);
  await service.ship(merchant, "order-1", "child-1", { carrier: "ZTO", trackingNumber: "ZTO3003", items: [{ orderItemId: "00000000-0000-4000-8000-0000000000a1", quantity: 2 }] });
  assert.equal(writes.childStatus, "SHIPPED");
  assert.equal(writes.orderStatus, "SHIPPED");
  assert.equal(writes.jobs, 1);
  assert.equal(writes.shipments, 2);
  assert.equal(writes.events, 2);
  assert.equal(writes.audits, 2);
});

test("over-shipping beyond the remaining quantity is rejected", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const record = orderRecord({ shipments: [shipmentState([["00000000-0000-4000-8000-0000000000a1", 3]])], childStatus: "SHIPPED" });
  const service = new OrderService(prismaStub(record, writes), promotions, config);
  await assert.rejects(() => service.ship(merchant, "order-1", "child-1", dto), (error: unknown) => error instanceof ConflictException && error.message === "ORDER_STATUS_CONFLICT");
  const partial = orderRecord({ shipments: [shipmentState([["00000000-0000-4000-8000-0000000000a1", 2]])], childStatus: "PARTIALLY_SHIPPED", orderStatus: "PARTIALLY_SHIPPED" });
  const service2 = new OrderService(prismaStub(partial, writes), promotions, config);
  await assert.rejects(() => service2.ship(merchant, "order-1", "child-1", { carrier: "SF", trackingNumber: "SF4004", items: [{ orderItemId: "00000000-0000-4000-8000-0000000000a1", quantity: 2 }] }), (error: unknown) => error instanceof BadRequestException && error.message === "SHIPMENT_QUANTITY_EXCEEDED");
});

test("resubmitting the same carrier and tracking number is idempotent", async () => {
  const writes: Writes = { shipments: 0, jobs: 0, events: 0, audits: 0 };
  const record = orderRecord({ shipments: [shipmentState([["00000000-0000-4000-8000-0000000000a1", 1]], "SF2002")], childStatus: "PARTIALLY_SHIPPED", orderStatus: "PARTIALLY_SHIPPED" });
  const service = new OrderService(prismaStub(record, writes), promotions, config);
  await service.ship(merchant, "order-1", "child-1", dto);
  assert.equal(writes.shipments, 0);
  assert.equal(writes.audits, 0);
  await assert.rejects(
    () => service.ship(merchant, "order-1", "child-1", { carrier: "SF", trackingNumber: "SF2002", items: [{ orderItemId: "00000000-0000-4000-8000-0000000000a1", quantity: 2 }] }),
    (error: unknown) => error instanceof ConflictException && error.message === "SHIPMENT_TRACKING_CONFLICT"
  );
});

test("buyer tracking is scoped to the buyer and lazy-marks delivered shipments", async () => {
  const record = orderRecord({ shipments: [shipmentState([["00000000-0000-4000-8000-0000000000a1", 3]], "SF5005")], childStatus: "SHIPPED", orderStatus: "SHIPPED" });
  let deliveredUpdates = 0;
  const prisma = {
    order: { findFirst: async ({ where }: { where: { userId: string } }) => (where.userId === "customer-1" ? record : null) },
    shipment: { update: async () => { deliveredUpdates += 1; } }
  } as unknown as PrismaService;
  const service = new OrderService(prisma, promotions, config);
  await assert.rejects(() => service.trackingForBuyer("customer-2", "order-1"), (error: unknown) => error instanceof NotFoundException);
  const views = await service.trackingForBuyer("customer-1", "order-1");
  assert.equal(views.length, 1);
  assert.equal(views[0].carrierName, "顺丰速运");
  assert.ok(views[0].events.length >= 1);
  assert.equal(views[0].events[0].status, "PICKED_UP");
  assert.equal(deliveredUpdates, 1);
  assert.equal(record.merchantOrders[0].shipments[0].status, "DELIVERED");
});
