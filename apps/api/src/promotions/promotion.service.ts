import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AvailableCouponView, CouponOfferView, CouponView, PromotionQuoteLine } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCouponDto, PromotionQuoteDto } from "./promotion.dto";
import { calculatePromotionQuote } from "./promotion-domain";

const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<CouponView[]> {
    const storeId = await this.storeId(userId);
    const rows = await this.prisma.coupon.findMany({
      where: { storeId },
      include: { products: true, _count: { select: { claims: true, redemptions: true } }, redemptions: { select: { discountAmount: true } } },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.view(row));
  }

  async create(userId: string, dto: CreateCouponDto): Promise<CouponView> {
    const storeId = await this.storeId(userId);
    const code = `CPN-${randomUUID().replaceAll("-", "").toUpperCase()}`;
    const value = new Prisma.Decimal(dto.value);
    const minimumAmount = new Prisma.Decimal(dto.minimumAmount);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!value.isPositive() || minimumAmount.isNegative()) throw new BadRequestException("COUPON_AMOUNT_INVALID");
    if (dto.type === "PERCENTAGE" && value.greaterThan(100)) throw new BadRequestException("COUPON_PERCENTAGE_INVALID");
    if (endsAt <= startsAt) throw new BadRequestException("COUPON_PERIOD_INVALID");
    if (dto.perUserLimit > dto.totalLimit) throw new BadRequestException("COUPON_LIMIT_INVALID");
    const productIds = [...new Set(dto.productIds)];
    if (productIds.length) {
      const count = await this.prisma.product.count({ where: { id: { in: productIds }, storeId } });
      if (count !== productIds.length) throw new BadRequestException("COUPON_PRODUCT_SCOPE_INVALID");
    }
    try {
      const row = await this.prisma.coupon.create({
        data: { storeId, code, name: dto.name.trim(), type: dto.type, value, minimumAmount, startsAt, endsAt, totalLimit: dto.totalLimit, perUserLimit: dto.perUserLimit, products: { create: productIds.map((productId) => ({ productId })) } },
        include: { products: true, _count: { select: { claims: true, redemptions: true } }, redemptions: { select: { discountAmount: true } } }
      });
      await this.prisma.auditLog.create({ data: { actorId: userId, action: "coupon.created", targetType: "Coupon", targetId: row.id, metadata: { code, storeId } } });
      return this.view(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("COUPON_CODE_EXISTS");
      throw error;
    }
  }

  async setStatus(userId: string, id: string, status: "ACTIVE" | "PAUSED"): Promise<CouponView> {
    const storeId = await this.storeId(userId);
    const existing = await this.prisma.coupon.findFirst({ where: { id, storeId } });
    if (!existing) throw new NotFoundException("COUPON_NOT_FOUND");
    const row = await this.prisma.coupon.update({
      where: { id },
      data: { status },
      include: { products: true, _count: { select: { claims: true, redemptions: true } }, redemptions: { select: { discountAmount: true } } }
    });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: "coupon.status.updated", targetType: "Coupon", targetId: id, metadata: { status } } });
    return this.view(row);
  }

  async publicForStore(slug: string): Promise<CouponOfferView[]> {
    const now = new Date();
    const rows = await this.prisma.coupon.findMany({
      where: { store: { slug, isOpen: true, merchant: { status: "ACTIVE" } }, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
      include: { products: true, _count: { select: { claims: true } } }, orderBy: [{ minimumAmount: "asc" }, { value: "desc" }]
    });
    return rows.filter((row) => row._count.claims < row.totalLimit).map((row) => ({ id: row.id, name: row.name, type: row.type, value: money(row.value), minimumAmount: money(row.minimumAmount), startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), storeId: row.storeId, productIds: row.products.map((item) => item.productId), remainingCount: row.totalLimit - row._count.claims }));
  }

  async claim(userId: string, couponId: string) {
    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { id: couponId }, include: { _count: { select: { claims: true } } } });
      this.assertAvailable(coupon);
      const existing = await tx.couponClaim.findFirst({
        where: { couponId: coupon.id, userId, redemption: null },
        orderBy: { claimedAt: "asc" },
        select: { id: true, couponId: true, claimedAt: true }
      });
      if (existing) return existing;
      const userClaims = await tx.couponClaim.count({ where: { couponId: coupon.id, userId } });
      if (coupon._count.claims >= coupon.totalLimit) throw new ConflictException("COUPON_CLAIM_LIMIT_REACHED");
      if (userClaims >= coupon.perUserLimit) throw new ConflictException("COUPON_USER_LIMIT_REACHED");
      return tx.couponClaim.create({ data: { couponId: coupon.id, userId }, select: { id: true, couponId: true, claimedAt: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async available(userId: string): Promise<AvailableCouponView[]> {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, include: { items: { where: { selected: true }, include: { sku: { include: { product: true } } } } } });
    const lines: PromotionQuoteLine[] = (cart?.items ?? []).map((item) => ({ skuId: item.skuId, productId: item.sku.productId, storeId: item.sku.product.storeId, quantity: item.quantity, unitPrice: money(item.sku.priceAmount) }));
    const claims = await this.prisma.couponClaim.findMany({ where: { userId, redemption: null, coupon: { status: "ACTIVE", startsAt: { lte: new Date() }, endsAt: { gt: new Date() } } }, include: { coupon: { include: { products: true, _count: { select: { claims: true } } } } }, orderBy: { claimedAt: "asc" } });
    return claims.map(({ id: claimId, coupon }) => {
      const rule = { id: coupon.id, code: coupon.code, type: coupon.type, value: money(coupon.value), minimumAmount: money(coupon.minimumAmount), storeId: coupon.storeId, productIds: coupon.products.map((item) => item.productId) };
      const quote = calculatePromotionQuote(lines, rule);
      const eligibleSubtotal = lines.filter((line) => line.storeId === coupon.storeId && (!rule.productIds.length || rule.productIds.includes(line.productId))).reduce((sum, line) => sum.plus(new Prisma.Decimal(line.unitPrice).times(line.quantity)), new Prisma.Decimal(0));
      const missing = Prisma.Decimal.max(new Prisma.Decimal(0), coupon.minimumAmount.minus(eligibleSubtotal));
      return { id: coupon.id, claimId, name: coupon.name, type: coupon.type, value: money(coupon.value), minimumAmount: money(coupon.minimumAmount), startsAt: coupon.startsAt.toISOString(), endsAt: coupon.endsAt.toISOString(), storeId: coupon.storeId, productIds: rule.productIds, remainingCount: Math.max(0, coupon.totalLimit - coupon._count.claims), eligible: new Prisma.Decimal(quote.discountAmount).greaterThan(0), discountAmount: quote.discountAmount, missingAmount: money(missing) };
    }).sort((a, b) => Number(b.discountAmount) - Number(a.discountAmount));
  }

  async claimedCouponIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.couponClaim.findMany({ where: { userId }, select: { couponId: true }, orderBy: { claimedAt: "asc" } });
    return [...new Set(rows.map((row) => row.couponId))];
  }

  async quote(userId: string, dto: PromotionQuoteDto) {
    return this.quoteWithClient(this.prisma, userId, dto);
  }

  async redeemForOrder(tx: Prisma.TransactionClient, userId: string, orderId: string, dto: PromotionQuoteDto) {
    if (!orderId.trim()) throw new BadRequestException("ORDER_ID_REQUIRED");
    if (!dto.couponCode && !dto.couponId) throw new BadRequestException("COUPON_REQUIRED");
    const quote = await this.quoteWithClient(tx, userId, dto);
    if (!quote.couponId || !quote.couponCode || !quote.ruleSnapshot || new Prisma.Decimal(quote.discountAmount).isZero()) {
      throw new ConflictException("COUPON_NOT_APPLICABLE");
    }
    const coupon = await tx.coupon.findUnique({ where: { id: quote.couponId } });
    this.assertAvailable(coupon);
    const claim = await tx.couponClaim.findFirst({
      where: { couponId: coupon.id, userId, redemption: null },
      orderBy: { claimedAt: "asc" },
      select: { id: true }
    });
    if (!claim) throw new ConflictException("COUPON_ALREADY_USED");
    try {
      return await tx.couponRedemption.create({
        data: {
          claimId: claim.id,
          couponId: coupon.id,
          userId,
          orderId: orderId.trim(),
          originalAmount: new Prisma.Decimal(quote.originalAmount),
          discountAmount: new Prisma.Decimal(quote.discountAmount),
          ruleSnapshot: {
            couponCode: quote.couponCode,
            rule: quote.ruleSnapshot,
            allocations: quote.allocations
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("COUPON_ALREADY_USED");
      }
      throw error;
    }
  }

  private async quoteWithClient(client: PrismaService | Prisma.TransactionClient, userId: string, dto: PromotionQuoteDto) {
    const quantities = new Map<string, number>();
    for (const item of dto.items) quantities.set(item.skuId, (quantities.get(item.skuId) ?? 0) + item.quantity);
    const skus = await client.sku.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
      include: { product: { include: { store: { include: { merchant: true } } } } }
    });
    if (skus.length !== quantities.size) throw new BadRequestException("QUOTE_SKU_INVALID");
    if (skus.some((sku) => sku.product.status !== "ACTIVE" || !sku.product.store.isOpen || sku.product.store.merchant.status !== "ACTIVE")) {
      throw new BadRequestException("QUOTE_SKU_NOT_SELLABLE");
    }
    const lines: PromotionQuoteLine[] = skus.map((sku) => ({ skuId: sku.id, productId: sku.productId, storeId: sku.product.storeId, quantity: quantities.get(sku.id)!, unitPrice: money(sku.priceAmount) }));
    if (!dto.couponCode && !dto.couponId) return calculatePromotionQuote(lines);
    const coupon = await client.coupon.findUnique({ where: dto.couponId ? { id: dto.couponId } : { code: dto.couponCode!.trim().toUpperCase() }, include: { products: true } });
    this.assertAvailable(coupon);
    const claims = await client.couponClaim.count({ where: { couponId: coupon.id, userId } });
    const uses = await client.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (claims <= uses) throw new ForbiddenException("COUPON_NOT_CLAIMED");
    return calculatePromotionQuote(lines, { id: coupon.id, code: coupon.code, type: coupon.type, value: money(coupon.value), minimumAmount: money(coupon.minimumAmount), storeId: coupon.storeId, productIds: coupon.products.map((scope) => scope.productId) });
  }

  private assertAvailable<T extends { status: string; startsAt: Date; endsAt: Date } | null>(coupon: T): asserts coupon is NonNullable<T> {
    if (!coupon) throw new NotFoundException("COUPON_NOT_FOUND");
    const now = new Date();
    if (coupon.status !== "ACTIVE") throw new ConflictException("COUPON_PAUSED");
    if (coupon.startsAt > now || coupon.endsAt <= now) throw new ConflictException("COUPON_NOT_ACTIVE");
  }

  private async storeId(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({ where: { userId }, include: { merchant: { include: { store: true } } } });
    if (!membership?.merchant.store || membership.merchant.status !== "ACTIVE") throw new ForbiddenException("ACTIVE_MERCHANT_STORE_REQUIRED");
    return membership.merchant.store.id;
  }

  private view(row: {
    id: string; code: string; name: string; type: "FIXED" | "PERCENTAGE"; value: Prisma.Decimal; minimumAmount: Prisma.Decimal;
    startsAt: Date; endsAt: Date; status: "ACTIVE" | "PAUSED"; totalLimit: number; perUserLimit: number; storeId: string; createdAt: Date;
    products: { productId: string }[]; _count: { claims: number; redemptions: number }; redemptions: { discountAmount: Prisma.Decimal }[];
  }): CouponView {
    const discount = row.redemptions.reduce((sum, redemption) => sum.plus(redemption.discountAmount), new Prisma.Decimal(0));
    return { id: row.id, code: row.code, name: row.name, type: row.type, value: money(row.value), minimumAmount: money(row.minimumAmount), startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), status: row.status, totalLimit: row.totalLimit, perUserLimit: row.perUserLimit, storeId: row.storeId, productIds: row.products.map((scope) => scope.productId), claimedCount: row._count.claims, usedCount: row._count.redemptions, discountTotal: money(discount), createdAt: row.createdAt.toISOString() };
  }
}
