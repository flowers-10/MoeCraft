import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CartItemInvalidReason, CheckoutQuote, CheckoutQuoteGroup } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { AppEnvironment } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { PromotionService } from "../promotions/promotion.service";
import { ApiMetricsService } from "../observability/api-metrics.service";
import type { CreateCheckoutQuoteDto } from "./checkout.dto";
import { CHECKOUT_QUOTE_TTL_MS, CHECKOUT_QUOTE_VERSION, createQuoteSignature, summarizeQuoteGroups } from "./checkout-domain";

const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly metrics: ApiMetricsService = new ApiMetricsService()
  ) {}

  async createQuote(userId: string, dto: CreateCheckoutQuoteDto): Promise<CheckoutQuote> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { selected: true },
          include: {
            sku: {
              include: {
                inventory: true,
                product: { include: { store: { include: { merchant: true } }, media: { where: { isCover: true }, take: 1 } } }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!cart?.items.length) throw new BadRequestException("CHECKOUT_CART_EMPTY");

    const validItems = cart.items.filter((item) => !this.invalidReason(item));
    const promotion = validItems.length
      ? await this.promotions.quote(userId, {
          items: validItems.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
          couponCode: dto.couponCode?.trim().toUpperCase()
        })
      : null;
    const allocation = new Map(promotion?.allocations.map((line) => [line.skuId, line]) ?? []);
    const groupRows = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const rows = groupRows.get(item.sku.product.storeId) ?? [];
      rows.push(item);
      groupRows.set(item.sku.product.storeId, rows);
    }
    const groups: CheckoutQuoteGroup[] = [...groupRows.values()].map((items) => {
      const store = items[0]!.sku.product.store;
      const quoteItems = items.map((item) => {
        const reason = this.invalidReason(item);
        const originalAmount = new Prisma.Decimal(item.sku.priceAmount).times(item.quantity);
        const discountAmount = reason ? new Prisma.Decimal(0) : new Prisma.Decimal(allocation.get(item.skuId)?.discountAmount ?? 0);
        return {
          cartItemId: item.id,
          skuId: item.skuId,
          productId: item.sku.productId,
          productTitle: item.sku.product.titleZhCn,
          skuName: item.sku.nameZhCn,
          coverFileId: item.sku.product.media[0]?.fileId ?? null,
          quantity: item.quantity,
          currency: item.sku.currency,
          unitPrice: money(item.sku.priceAmount),
          originalAmount: originalAmount.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          payableAmount: originalAmount.minus(discountAmount).toFixed(2),
          valid: reason === null,
          invalidReason: reason
        };
      });
      const original = quoteItems.filter((item) => item.valid).reduce((sum, item) => sum.plus(item.originalAmount), new Prisma.Decimal(0));
      const discount = quoteItems.reduce((sum, item) => sum.plus(item.discountAmount), new Prisma.Decimal(0));
      return {
        storeId: store.id,
        merchantId: store.merchantId,
        storeName: store.name,
        storeSlug: store.slug,
        items: quoteItems,
        originalAmount: original.toFixed(2),
        shippingAmount: "0.00",
        discountAmount: discount.toFixed(2),
        payableAmount: original.minus(discount).toFixed(2)
      };
    });
    const summary = summarizeQuoteGroups(groups.map((group) => ({
      originalAmount: group.originalAmount,
      discountAmount: group.discountAmount,
      invalidCount: group.items.filter((item) => !item.valid).length
    })));
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + CHECKOUT_QUOTE_TTL_MS);
    const signature = createQuoteSignature({
      quoteId: id,
      userId,
      version: CHECKOUT_QUOTE_VERSION,
      expiresAt: expiresAt.toISOString(),
      payableAmount: summary.payableAmount
    }, this.config.get("JWT_ACCESS_SECRET", { infer: true }));
    const address = {
      recipient: dto.address.recipient.trim(),
      phone: dto.address.phone.trim(),
      country: dto.address.country.trim(),
      province: dto.address.province.trim(),
      city: dto.address.city.trim(),
      district: dto.address.district.trim(),
      addressLine: dto.address.addressLine.trim(),
      ...(dto.address.postalCode?.trim() ? { postalCode: dto.address.postalCode.trim() } : {})
    };
    const invalidReasons = [...new Set(groups.flatMap((group) => group.items.flatMap((item) => item.invalidReason ? [item.invalidReason] : [])))];
    const view: CheckoutQuote = {
      id,
      version: CHECKOUT_QUOTE_VERSION,
      signature,
      currency: "CNY",
      address,
      couponCode: dto.couponCode?.trim().toUpperCase() ?? null,
      groups,
      ...summary,
      valid: summary.invalidCount === 0 && new Prisma.Decimal(summary.payableAmount).greaterThan(0),
      invalidReasons,
      expiresAt: expiresAt.toISOString()
    };
    await this.prisma.checkoutQuote.create({
      data: {
        id,
        userId,
        version: CHECKOUT_QUOTE_VERSION,
        signature,
        currency: "CNY",
        addressSnapshot: address,
        couponCode: view.couponCode,
        originalAmount: new Prisma.Decimal(view.originalAmount),
        shippingAmount: new Prisma.Decimal(view.shippingAmount),
        discountAmount: new Prisma.Decimal(view.discountAmount),
        payableAmount: new Prisma.Decimal(view.payableAmount),
        snapshot: view as unknown as Prisma.InputJsonValue,
        expiresAt
      }
    });
    this.metrics.recordCommerce("checkout_quote_success");
    return view;
  }

  private invalidReason(item: {
    quantity: number;
    sku: {
      isActive: boolean;
      purchaseLimit: number | null;
      inventory: { onHand: number; reserved: number } | null;
      product: { status: string; store: { isOpen: boolean; merchant: { status: string } } };
    };
  }): CartItemInvalidReason | null {
    if (!item.sku.isActive) return "SKU_INACTIVE";
    if (item.sku.product.status !== "ACTIVE") return "PRODUCT_NOT_SELLABLE";
    if (!item.sku.product.store.isOpen) return "STORE_CLOSED";
    if (item.sku.product.store.merchant.status !== "ACTIVE") return "MERCHANT_INACTIVE";
    const available = item.sku.inventory ? item.sku.inventory.onHand - item.sku.inventory.reserved : 0;
    if (available <= 0) return "OUT_OF_STOCK";
    if (item.sku.purchaseLimit && item.quantity > item.sku.purchaseLimit) return "PURCHASE_LIMIT_EXCEEDED";
    if (item.quantity > available) return "QUANTITY_EXCEEDS_STOCK";
    return null;
  }
}
