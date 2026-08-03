import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ProductRatingSummary, ReviewListItem, ReviewView } from "@moecraft/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestPrincipal } from "../auth/authorization";

const money = (v: Prisma.Decimal | string | number) => new Prisma.Decimal(v).toFixed(2);

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, orderItemId: string, rating: number, content: string, images: string[]): Promise<ReviewView> {
    if (rating < 1 || rating > 5) throw new ConflictException("REVIEW_INVALID_RATING");
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId }, select: { id: true, orderId: true, productId: true, storeId: true,
        productTitle: true, skuName: true, coverFileId: true,
        order: { select: { userId: true, status: true } } }
    });
    if (!orderItem || orderItem.order.userId !== userId) throw new NotFoundException("ORDER_ITEM_NOT_FOUND");
    if (orderItem.order.status !== "COMPLETED") throw new ConflictException("REVIEW_ORDER_NOT_COMPLETED");
    const existing = await this.prisma.review.findUnique({ where: { orderItemId } });
    if (existing) throw new ConflictException("REVIEW_ALREADY_EXISTS");
    const record = await this.prisma.review.create({
      data: { userId, orderItemId, productId: orderItem.productId, storeId: orderItem.storeId, rating, content, images: images as unknown as Prisma.InputJsonValue }
    });
    return this.view(record, await this.userName(record.userId), orderItem.productTitle, orderItem.skuName, orderItem.coverFileId);
  }

  async getProductReviews(productId: string, page = 1, pageSize = 20): Promise<{ items: ReviewView[]; meta: { page: number; pageSize: number; total: number } }> {
    const where: Prisma.ReviewWhereInput = { productId, isHidden: false };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.review.count({ where })
    ]);
    return { items: await this.views(items), meta: { page, pageSize, total } };
  }

  async getRatingSummary(productId: string): Promise<ProductRatingSummary> {
    const rows = await this.prisma.review.findMany({ where: { productId, isHidden: false }, select: { rating: true } });
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const row of rows) { dist[row.rating] = (dist[row.rating] ?? 0) + 1; sum += row.rating; }
    return { averageRating: rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0, reviewCount: rows.length, ratingDistribution: dist };
  }

  async reply(principal: RequestPrincipal, id: string, content: string): Promise<ReviewView> {
    if (!principal.merchantId) throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
    const record = await this.prisma.review.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("REVIEW_NOT_FOUND");
    const store = await this.prisma.store.findUnique({ where: { id: record.storeId }, select: { merchantId: true } });
    if (store?.merchantId !== principal.merchantId) throw new ForbiddenException("PERMISSION_DENIED");
    if (record.replyContent) throw new ConflictException("REVIEW_ALREADY_REPLIED");
    const updated = await this.prisma.review.update({ where: { id }, data: { replyContent: content, repliedBy: principal.sub, repliedAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: record.userId }, select: { displayName: true } });
    return this.view(updated, user?.displayName ?? "N/A", "N/A", "N/A", null);
  }

  async hide(principal: RequestPrincipal, id: string, hide: boolean, note: string): Promise<ReviewView> {
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    const record = await this.prisma.review.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("REVIEW_NOT_FOUND");
    const updated = await this.prisma.review.update({ where: { id }, data: { isHidden: hide } });
    await this.prisma.auditLog.create({ data: { actorId: principal.sub, action: hide ? "review.hidden" : "review.unhidden", targetType: "Review", targetId: id, metadata: { note } } });
    return this.view(updated, await this.userName(updated.userId), "N/A", "N/A", null);
  }

  async listAdmin(principal: RequestPrincipal, onlyHidden: boolean): Promise<ReviewListItem[]> {
    const where: Prisma.ReviewWhereInput = {};
    if (!principal.roles.some((r) => r === "PLATFORM_ADMIN" || r === "PLATFORM_OPERATOR")) {
      if (!principal.merchantId) throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
      where.storeId = principal.merchantId;
    }
    if (onlyHidden) where.isHidden = true;
    const rows = await this.prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return this.listViews(rows);
  }

  private async views(rows: Array<Prisma.ReviewGetPayload<object>>): Promise<ReviewView[]> {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } });
    const userMap = new Map(users.map((u) => [u.id, u.displayName]));
    return rows.map((r) => this.view(r, userMap.get(r.userId) ?? "N/A", "N/A", "N/A", null));
  }

  private async listViews(rows: Array<Prisma.ReviewGetPayload<object>>): Promise<ReviewListItem[]> {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } });
    const userMap = new Map(users.map((u) => [u.id, u.displayName]));
    return rows.map((r) => ({
      id: r.id, userId: r.userId, buyerDisplayName: userMap.get(r.userId) ?? "N/A",
      productTitle: "N/A", rating: r.rating, content: r.content, isHidden: r.isHidden,
      createdAt: r.createdAt.toISOString()
    }));
  }

  private async userName(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    return u?.displayName ?? "N/A";
  }

  private view(r: Prisma.ReviewGetPayload<object>, name: string, productTitle: string, skuName: string, coverFileId: string | null): ReviewView {
    return {
      id: r.id, userId: r.userId, buyerDisplayName: name, orderItemId: r.orderItemId,
      productId: r.productId, productTitle, skuName, coverFileId, rating: r.rating,
      content: r.content, images: r.images as unknown as string[] ?? [],
      isHidden: r.isHidden,
      reply: r.replyContent ? { content: r.replyContent, repliedBy: r.repliedBy ?? "N/A", repliedAt: r.repliedAt?.toISOString() ?? "" } : null,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString()
    };
  }
}
