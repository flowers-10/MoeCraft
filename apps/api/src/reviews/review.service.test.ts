import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { PrismaService } from "../prisma/prisma.service";
import { ReviewService } from "./review.service";

test("merchant may reply to a review belonging to a store owned by that merchant", async () => {
  const now = new Date();
  const review = {
    id: "review-1", userId: "buyer-1", orderItemId: "item-1", productId: "product-1",
    storeId: "store-1", rating: 5, content: "great", images: [], isHidden: false,
    replyContent: null, repliedBy: null, repliedAt: null, createdAt: now, updatedAt: now
  };
  const prisma = {
    review: {
      findUnique: async () => review,
      update: async ({ data }: { data: { replyContent: string; repliedBy: string; repliedAt: Date } }) => ({ ...review, ...data })
    },
    store: { findUnique: async () => ({ merchantId: "merchant-1" }) },
    user: { findUnique: async () => ({ displayName: "Buyer" }) }
  } as unknown as PrismaService;
  const service = new ReviewService(prisma);

  const result = await service.reply({ sub: "merchant-user", roles: ["MERCHANT_OWNER"], merchantId: "merchant-1" }, review.id, "thanks");

  assert.equal(result.reply?.content, "thanks");
});
