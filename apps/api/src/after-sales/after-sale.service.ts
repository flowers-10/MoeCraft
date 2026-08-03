import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AfterSaleListItem, AfterSaleView, AfterSaleStatus } from "@moecraft/shared";
import { AFTER_SALE_ELIGIBLE_ORDER_STATUSES } from "@moecraft/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentService } from "../payments/payment.service";
import type { RequestPrincipal } from "../auth/authorization";
import { assertMerchantScope } from "../auth/authorization";
import { adminActions, buyerActions, canTransitionAfterSale, createAfterSaleNumber } from "./after-sale-domain";
import type { AfterSaleListQueryDto, AfterSaleRefundDto, AfterSaleReviewDto, AfterSaleShipReturnDto, CreateAfterSaleDto } from "./after-sale.dto";

const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);

type AfterSaleRow = Prisma.AfterSaleGetPayload<object>;

@Injectable()
export class AfterSaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService
  ) {}

  async create(userId: string, dto: CreateAfterSaleDto): Promise<AfterSaleView> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      select: {
        id: true, orderId: true, merchantOrderId: true, storeId: true, productTitle: true,
        skuName: true, coverFileId: true, quantity: true, payableAmount: true,
        order: { select: { id: true, userId: true, status: true } },
        merchantOrder: { select: { id: true, merchantId: true, storeId: true, store: { select: { name: true } } } }
      }
    });
    if (!orderItem || orderItem.order.userId !== userId) {
      throw new NotFoundException("ORDER_ITEM_NOT_FOUND");
    }
    if (!AFTER_SALE_ELIGIBLE_ORDER_STATUSES.includes(orderItem.order.status as typeof AFTER_SALE_ELIGIBLE_ORDER_STATUSES[number])) {
      throw new ConflictException("AFTER_SALE_ORDER_STATUS_INELIGIBLE");
    }
    const existing = await this.prisma.afterSale.findFirst({
      where: { userId, orderItemId: dto.orderItemId, status: { notIn: ["CANCELLED", "COMPLETED"] } }
    });
    if (existing) throw new ConflictException("AFTER_SALE_DUPLICATE");
    const completedRefunds = await this.prisma.afterSale.aggregate({
      where: { orderItemId: dto.orderItemId, status: "COMPLETED" }, _sum: { refundAmount: true }
    });
    const totalRefunded = new Prisma.Decimal(completedRefunds._sum.refundAmount ?? 0);
    const maxAmount = Prisma.Decimal.max(new Prisma.Decimal(0), orderItem.payableAmount.minus(totalRefunded));
    if (maxAmount.lessThanOrEqualTo(0)) throw new ConflictException("AFTER_SALE_NO_REFUNDABLE_AMOUNT");
    const record = await this.prisma.afterSale.create({
      data: {
        afterSaleNumber: createAfterSaleNumber(), userId, orderId: orderItem.orderId,
        orderItemId: dto.orderItemId, merchantOrderId: orderItem.merchantOrderId,
        merchantId: orderItem.merchantOrder.merchantId, storeId: orderItem.merchantOrder.storeId,
        type: dto.type, status: "REQUESTED", reason: dto.reason, description: dto.description,
        refundAmount: maxAmount, evidence: dto.evidence as unknown as Prisma.InputJsonValue
      }
    });
    return this.enrichView(record, { userId: userId, orderNumber: await this.orderNumber(record.orderId), storeName: orderItem.merchantOrder.store.name, productTitle: orderItem.productTitle, skuName: orderItem.skuName, coverFileId: orderItem.coverFileId, quantity: orderItem.quantity, buyerDisplayName: "N/A", viewerId: userId, isBuyer: true });
  }

  async listBuyer(userId: string, query: AfterSaleListQueryDto): Promise<AfterSaleListItem[]> {
    const where: Prisma.AfterSaleWhereInput = { userId };
    if (query.status) where.status = query.status;
    const rows = await this.prisma.afterSale.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return this.listItems(rows);
  }

  async listAdmin(principal: RequestPrincipal, query: AfterSaleListQueryDto): Promise<AfterSaleListItem[]> {
    const merchantScope = this.resolveMerchantScope(principal);
    const where: Prisma.AfterSaleWhereInput = {};
    if (merchantScope) where.merchantId = merchantScope;
    if (query.status) where.status = query.status;
    const rows = await this.prisma.afterSale.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return this.listItems(rows);
  }

  async getBuyer(userId: string, id: string): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    return this.enrichView(record, await this.relatedFields(record, userId, true));
  }

  async getAdmin(principal: RequestPrincipal, id: string): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    const merchantScope = this.resolveMerchantScope(principal);
    if (merchantScope && record.merchantId !== merchantScope) throw new ForbiddenException("PERMISSION_DENIED");
    return this.enrichView(record, await this.relatedFields(record, principal.sub, false));
  }

  async cancel(userId: string, id: string): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    if (!canTransitionAfterSale(record.status as AfterSaleStatus, "CANCELLED")) throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    const cancelled = await this.prisma.afterSale.update({
      where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() }
    });
    return this.enrichView(cancelled, await this.relatedFields(cancelled, userId, true));
  }

  async shipReturn(userId: string, id: string, dto: AfterSaleShipReturnDto): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    if (record.type !== "RETURN_REFUND") throw new ConflictException("AFTER_SALE_TYPE_REFUND_ONLY");
    if (record.status !== "APPROVED") throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    const updated = await this.prisma.afterSale.update({
      where: { id },
      data: { status: "AWAITING_RETURN", returnCarrier: dto.carrier, returnTrackingNumber: dto.trackingNumber.toUpperCase(), returnShippedAt: new Date() }
    });
    return this.enrichView(updated, await this.relatedFields(updated, userId, true));
  }

  async review(principal: RequestPrincipal, id: string, dto: AfterSaleReviewDto): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    assertMerchantScope(principal, record.merchantId);
    if (record.status !== "REQUESTED") throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    const targetStatus = dto.decision === "APPROVED"
      ? (record.type === "REFUND_ONLY" ? "REFUND_PROCESSING" : "APPROVED")
      : "REJECTED";
    if (!canTransitionAfterSale(record.status as AfterSaleStatus, targetStatus as AfterSaleStatus)) {
      throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    }
    const updated = await this.prisma.afterSale.update({
      where: { id }, data: { status: targetStatus, merchantNote: dto.note }
    });
    if (targetStatus === "REFUND_PROCESSING") {
      await this.executeRefund(record);
      const completed = await this.prisma.afterSale.update({
        where: { id }, data: { status: "COMPLETED", completedAt: new Date() }
      });
      return this.enrichView(completed, await this.relatedFields(completed, principal.sub, false));
    }
    return this.enrichView(updated, await this.relatedFields(updated, principal.sub, false));
  }

  async confirmReturned(principal: RequestPrincipal, id: string): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    assertMerchantScope(principal, record.merchantId);
    if (record.type !== "RETURN_REFUND") throw new ConflictException("AFTER_SALE_TYPE_REFUND_ONLY");
    if (record.status !== "AWAITING_RETURN") throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    const updated = await this.prisma.afterSale.update({
      where: { id }, data: { status: "RETURNED" }
    });
    return this.enrichView(updated, await this.relatedFields(updated, principal.sub, false));
  }

  async executeRefundOp(principal: RequestPrincipal, id: string, dto: AfterSaleRefundDto): Promise<AfterSaleView> {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    assertMerchantScope(principal, record.merchantId);
    if (record.status !== "REFUND_PROCESSING") throw new ConflictException("AFTER_SALE_STATUS_CONFLICT");
    await this.executeRefund(record);
    const completed = await this.prisma.afterSale.update({
      where: { id }, data: { status: "COMPLETED", completedAt: new Date() }
    });
    return this.enrichView(completed, await this.relatedFields(completed, principal.sub, false));
  }

  async platformReview(principal: RequestPrincipal, id: string, dto: AfterSaleReviewDto): Promise<AfterSaleView> {
    if (!principal.roles.some((role) => role === "PLATFORM_ADMIN" || role === "PLATFORM_OPERATOR")) {
      throw new ForbiddenException("PERMISSION_DENIED");
    }
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("AFTER_SALE_NOT_FOUND");
    const targetStatus = dto.decision === "APPROVED"
      ? (record.type === "REFUND_ONLY" ? "REFUND_PROCESSING" : "APPROVED")
      : "REJECTED";
    const updated = await this.prisma.afterSale.update({
      where: { id }, data: { status: targetStatus, platformNote: dto.note }
    });
    if (targetStatus === "REFUND_PROCESSING") {
      await this.executeRefund(record);
      const completed = await this.prisma.afterSale.update({
        where: { id }, data: { status: "COMPLETED", completedAt: new Date() }
      });
      return this.enrichView(completed, await this.relatedFields(completed, principal.sub, false));
    }
    return this.enrichView(updated, await this.relatedFields(updated, principal.sub, false));
  }

  private async executeRefund(record: AfterSaleRow) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({ where: { orderId: record.orderId } });
    if (!paymentIntent?.providerPaymentId) throw new ConflictException("AFTER_SALE_NO_PAYMENT_TO_REFUND");
    await this.payments.handleRefund(paymentIntent.orderId, money(record.refundAmount));
  }

  private resolveMerchantScope(principal: RequestPrincipal): string | null {
    if (principal.roles.some((role) => role === "PLATFORM_ADMIN" || role === "PLATFORM_OPERATOR")) return null;
    if (principal.roles.some((role) => role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF")) {
      if (!principal.merchantId) throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
      return principal.merchantId;
    }
    throw new ForbiddenException("PERMISSION_DENIED");
  }

  private async orderNumber(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
    return order?.orderNumber ?? "N/A";
  }

  private async listItems(rows: AfterSaleRow[]): Promise<AfterSaleListItem[]> {
    const orderItemIds = [...new Set(rows.map((r) => r.orderItemId))];
    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const storeIds = [...new Set(rows.map((r) => r.storeId))];
    const [orderItems, orders, stores] = await Promise.all([
      this.prisma.orderItem.findMany({ where: { id: { in: orderItemIds } }, select: { id: true, productTitle: true, skuName: true, coverFileId: true, quantity: true } }),
      this.prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } }),
      this.prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } })
    ]);
    const itemMap = new Map(orderItems.map((i) => [i.id, i]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    return rows.map((row) => {
      const item = itemMap.get(row.orderItemId);
      const store = storeMap.get(row.storeId);
      return {
        id: row.id, afterSaleNumber: row.afterSaleNumber, type: row.type as AfterSaleListItem["type"],
        status: row.status as AfterSaleListItem["status"], reason: row.reason, refundAmount: money(row.refundAmount),
        storeName: store?.name ?? "N/A", productTitle: item?.productTitle ?? "N/A",
        skuName: item?.skuName ?? "N/A", coverFileId: item?.coverFileId ?? null,
        quantity: item?.quantity ?? 0, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
      };
    });
  }

  private async relatedFields(record: AfterSaleRow, viewerId: string, isBuyer: boolean) {
    const [order, orderItem, store, user] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: record.orderId }, select: { orderNumber: true } }),
      this.prisma.orderItem.findUnique({ where: { id: record.orderItemId }, select: { productTitle: true, skuName: true, coverFileId: true, quantity: true } }),
      this.prisma.store.findUnique({ where: { id: record.storeId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: record.userId }, select: { displayName: true } })
    ]);
    return {
      userId: record.userId, orderNumber: order?.orderNumber ?? "N/A",
      storeName: store?.name ?? "N/A", buyerDisplayName: user?.displayName ?? "N/A",
      productTitle: orderItem?.productTitle ?? "N/A", skuName: orderItem?.skuName ?? "N/A",
      coverFileId: orderItem?.coverFileId ?? null, quantity: orderItem?.quantity ?? 0,
      viewerId, isBuyer
    };
  }

  private enrichView(record: AfterSaleRow, ctx: {
    userId: string; orderNumber: string; storeName: string; buyerDisplayName: string;
    productTitle: string; skuName: string; coverFileId: string | null; quantity: number;
    viewerId: string; isBuyer: boolean;
  }): AfterSaleView {
    const status = record.status as AfterSaleView["status"];
    const type = record.type as AfterSaleView["type"];
    return {
      id: record.id, afterSaleNumber: record.afterSaleNumber, userId: ctx.userId,
      buyerDisplayName: ctx.buyerDisplayName, type, status,
      reason: record.reason, description: record.description, refundAmount: money(record.refundAmount),
      evidence: record.evidence as unknown as AfterSaleView["evidence"],
      returnCarrier: record.returnCarrier, returnTrackingNumber: record.returnTrackingNumber,
      returnShippedAt: record.returnShippedAt?.toISOString() ?? null,
      merchantNote: record.merchantNote, platformNote: record.platformNote,
      completedAt: record.completedAt?.toISOString() ?? null,
      cancelledAt: record.cancelledAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
      orderId: record.orderId, orderNumber: ctx.orderNumber,
      merchantOrderId: record.merchantOrderId, merchantId: record.merchantId, storeId: record.storeId,
      storeName: ctx.storeName, orderItemId: record.orderItemId,
      productTitle: ctx.productTitle, skuName: ctx.skuName,
      coverFileId: ctx.coverFileId, quantity: ctx.quantity,
      buyerActions: ctx.isBuyer ? buyerActions(status, type) as AfterSaleView["buyerActions"] : [],
      adminActions: ctx.isBuyer ? [] : adminActions(status, type, false) as AfterSaleView["adminActions"]
    };
  }
}
