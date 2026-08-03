import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { PrismaService } from "../prisma/prisma.service";
import type { PaymentService } from "../payments/payment.service";
import { AfterSaleService } from "./after-sale.service";

test("merchant confirmation moves a shipped return to RETURNED before refund", async () => {
  const record = {
    id: "after-sale-1", afterSaleNumber: "AS00000000000000000000", userId: "buyer-1",
    orderId: "order-1", orderItemId: "item-1", merchantOrderId: "merchant-order-1",
    merchantId: "merchant-1", storeId: "store-1", type: "RETURN_REFUND", status: "AWAITING_RETURN",
    reason: "damaged", description: "damaged", refundAmount: "10.00", evidence: [],
    returnCarrier: "SF", returnTrackingNumber: "SF1234", returnShippedAt: new Date(),
    merchantNote: null, platformNote: null, completedAt: null, cancelledAt: null,
    createdAt: new Date(), updatedAt: new Date()
  };
  let writtenStatus = "";
  const prisma = {
    afterSale: {
      findUnique: async () => record,
      update: async ({ data }: { data: { status: string } }) => { writtenStatus = data.status; return { ...record, status: data.status }; }
    },
    order: { findUnique: async () => ({ orderNumber: "MC1" }) },
    orderItem: { findUnique: async () => ({ productTitle: "Item", skuName: "SKU", coverFileId: null, quantity: 1 }) },
    store: { findUnique: async () => ({ name: "Store" }) },
    user: { findUnique: async () => ({ displayName: "Buyer" }) }
  } as unknown as PrismaService;
  const service = new AfterSaleService(prisma, {} as PaymentService);

  const result = await service.confirmReturned({ sub: "merchant-user", roles: ["MERCHANT_OWNER"], merchantId: "merchant-1" }, record.id);

  assert.equal(writtenStatus, "RETURNED");
  assert.equal(result.status, "RETURNED");
  assert.ok(result.adminActions.includes("REFUND"));
});
