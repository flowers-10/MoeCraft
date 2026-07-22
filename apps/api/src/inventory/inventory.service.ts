import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { InventoryLedgerType, InventoryLedgerView, InventoryListItem, InventoryReservationView } from "@moecraft/shared";
import { Prisma, type Inventory, type InventoryReservation } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { applyInventoryDelta, InvalidInventoryMutationError, type InventorySnapshot } from "./inventory-domain";
import type { AdjustInventoryDto, SetLowStockThresholdDto } from "./inventory.dto";

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<InventoryListItem[]> {
    const storeId = await this.storeId(userId);
    const rows = await this.prisma.inventory.findMany({
      where: { sku: { isActive: true, product: { storeId, status: { not: "ARCHIVED" } } } },
      include: { sku: { include: { product: true } } },
      orderBy: [{ updatedAt: "desc" }, { sku: { code: "asc" } }]
    });
    return rows.map((row) => this.itemView(row));
  }

  async ledger(userId: string, skuId: string): Promise<InventoryLedgerView[]> {
    const storeId = await this.storeId(userId);
    const inventory = await this.prisma.inventory.findFirst({ where: { skuId, sku: { product: { storeId } } } });
    if (!inventory) throw new NotFoundException("INVENTORY_NOT_FOUND");
    const entries = await this.prisma.inventoryLedgerEntry.findMany({ where: { inventoryId: inventory.id }, orderBy: { createdAt: "desc" }, take: 200 });
    return entries.map((entry) => ({ ...entry, referenceType: entry.referenceType ?? undefined, referenceId: entry.referenceId ?? undefined, actorId: entry.actorId ?? undefined, createdAt: entry.createdAt.toISOString() }));
  }

  async adjust(userId: string, skuId: string, dto: AdjustInventoryDto): Promise<InventoryListItem> {
    const storeId = await this.storeId(userId);
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({ where: { skuId, sku: { product: { storeId } } }, include: { sku: { include: { product: true } } } });
      if (!inventory) throw new NotFoundException("INVENTORY_NOT_FOUND");
      if (dto.expectedVersion !== undefined && dto.expectedVersion !== inventory.version) throw new ConflictException("INVENTORY_VERSION_CHANGED");
      const updated = await this.mutate(tx, inventory, dto.delta, 0, "ADJUSTMENT", dto.reason.trim(), userId);
      await tx.auditLog.create({ data: { actorId: userId, action: "inventory.adjusted", targetType: "Sku", targetId: skuId, metadata: { delta: dto.delta, reason: dto.reason.trim(), version: updated.version } } });
      return this.itemView({ ...inventory, ...updated });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async setLowStockThreshold(userId: string, skuId: string, dto: SetLowStockThresholdDto): Promise<InventoryListItem> {
    const storeId = await this.storeId(userId);
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({ where: { skuId, sku: { product: { storeId } } }, include: { sku: { include: { product: true } } } });
      if (!inventory) throw new NotFoundException("INVENTORY_NOT_FOUND");
      if (dto.expectedVersion !== undefined && dto.expectedVersion !== inventory.version) throw new ConflictException("INVENTORY_VERSION_CHANGED");
      const changed = await tx.inventory.updateMany({
        where: { id: inventory.id, version: inventory.version },
        data: { lowStockThreshold: dto.lowStockThreshold, version: { increment: 1 } }
      });
      if (!changed.count) throw new ConflictException("INVENTORY_VERSION_CHANGED");
      await tx.auditLog.create({ data: { actorId: userId, action: "inventory.threshold.updated", targetType: "Sku", targetId: skuId, metadata: { lowStockThreshold: dto.lowStockThreshold } } });
      return this.itemView({ ...inventory, lowStockThreshold: dto.lowStockThreshold, version: inventory.version + 1 });
    });
  }

  async reserve(skuId: string, referenceId: string, quantity: number, expiresAt: Date): Promise<InventoryReservationView> {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new BadRequestException("INVALID_RESERVATION_QUANTITY");
    if (!referenceId.trim()) throw new BadRequestException("RESERVATION_REFERENCE_REQUIRED");
    if (expiresAt.getTime() <= Date.now()) throw new BadRequestException("RESERVATION_EXPIRY_INVALID");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: { skuId },
          include: { sku: { include: { product: { include: { store: { include: { merchant: true } } } } } } }
        });
        if (!inventory || !inventory.sku.isActive) throw new NotFoundException("SELLABLE_SKU_NOT_FOUND");
        const { product } = inventory.sku;
        if (product.status !== "ACTIVE" || !product.store.isOpen || product.store.merchant.status !== "ACTIVE") throw new BadRequestException("SKU_NOT_SELLABLE");
        const existing = await tx.inventoryReservation.findUnique({ where: { inventoryId_referenceId: { inventoryId: inventory.id, referenceId } } });
        if (existing) {
          if (existing.quantity !== quantity) throw new ConflictException("RESERVATION_REFERENCE_CONFLICT");
          return this.reservationView(skuId, existing);
        }
        await this.mutate(tx, inventory, 0, quantity, "RESERVATION_CREATED", "订单创建锁定库存", undefined, "ORDER", referenceId);
        const reservation = await tx.inventoryReservation.create({ data: { inventoryId: inventory.id, referenceId, quantity, expiresAt } });
        return this.reservationView(skuId, reservation);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.inventoryReservation.findFirst({ where: { inventory: { skuId }, referenceId } });
        if (existing?.quantity === quantity) return this.reservationView(skuId, existing);
        throw new ConflictException("RESERVATION_REFERENCE_CONFLICT");
      }
      throw error;
    }
  }

  commitReservation(skuId: string, referenceId: string): Promise<InventoryReservationView> {
    return this.finishReservation(skuId, referenceId, "COMMITTED", "订单支付扣减库存");
  }

  releaseReservation(skuId: string, referenceId: string, reason = "订单取消释放库存"): Promise<InventoryReservationView> {
    return this.finishReservation(skuId, referenceId, "RELEASED", reason);
  }

  async releaseExpired(limit = 100): Promise<number> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
      include: { inventory: { select: { skuId: true } } },
      orderBy: { expiresAt: "asc" },
      take: Math.min(Math.max(limit, 1), 500)
    });
    let released = 0;
    for (const reservation of expired) {
      try {
        await this.finishReservation(reservation.inventory.skuId, reservation.referenceId, "EXPIRED", "订单超时释放库存");
        released += 1;
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    return released;
  }

  private async finishReservation(skuId: string, referenceId: string, status: "COMMITTED" | "RELEASED" | "EXPIRED", reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({
        where: { inventoryId_referenceId: { inventoryId: await this.inventoryId(tx, skuId), referenceId } },
        include: { inventory: true }
      });
      if (!reservation) throw new NotFoundException("INVENTORY_RESERVATION_NOT_FOUND");
      if (reservation.status === status || (status === "RELEASED" && reservation.status === "EXPIRED")) return this.reservationView(skuId, reservation);
      if (reservation.status !== "ACTIVE") throw new ConflictException("INVENTORY_RESERVATION_ALREADY_FINISHED");
      const committing = status === "COMMITTED";
      await this.mutate(
        tx,
        reservation.inventory,
        committing ? -reservation.quantity : 0,
        -reservation.quantity,
        committing ? "RESERVATION_COMMITTED" : "RESERVATION_RELEASED",
        reason,
        undefined,
        "ORDER",
        referenceId
      );
      const changed = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: "ACTIVE" },
        data: committing
          ? { status, committedAt: new Date() }
          : { status, releasedAt: new Date(), releaseReason: reason }
      });
      if (!changed.count) throw new ConflictException("INVENTORY_RESERVATION_ALREADY_FINISHED");
      return this.reservationView(skuId, { ...reservation, status });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async mutate(
    tx: TransactionClient,
    inventory: InventorySnapshot & { id: string },
    onHandDelta: number,
    reservedDelta: number,
    type: InventoryLedgerType,
    reason: string,
    actorId?: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<InventorySnapshot> {
    let next: InventorySnapshot;
    try {
      next = applyInventoryDelta(inventory, onHandDelta, reservedDelta);
    } catch (error) {
      if (error instanceof InvalidInventoryMutationError) throw new BadRequestException(error.code);
      throw error;
    }
    const changed = await tx.inventory.updateMany({
      where: { id: inventory.id, version: inventory.version, onHand: inventory.onHand, reserved: inventory.reserved },
      data: { onHand: next.onHand, reserved: next.reserved, version: next.version }
    });
    if (!changed.count) throw new ConflictException("INVENTORY_VERSION_CHANGED");
    await tx.inventoryLedgerEntry.create({ data: { inventoryId: inventory.id, type, onHandDelta, reservedDelta, onHandAfter: next.onHand, reservedAfter: next.reserved, reason, actorId, referenceType, referenceId } });
    return next;
  }

  private async inventoryId(tx: TransactionClient, skuId: string) {
    const inventory = await tx.inventory.findUnique({ where: { skuId }, select: { id: true } });
    if (!inventory) throw new NotFoundException("INVENTORY_NOT_FOUND");
    return inventory.id;
  }

  private async storeId(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({ where: { userId }, include: { merchant: { include: { store: true } } } });
    if (!membership?.merchant.store || membership.merchant.status !== "ACTIVE") throw new ForbiddenException("ACTIVE_MERCHANT_STORE_REQUIRED");
    return membership.merchant.store.id;
  }

  private itemView(row: Inventory & { sku: { id: string; code: string; nameZhCn: string; product: { id: string; titleZhCn: string } } }): InventoryListItem {
    const available = row.onHand - row.reserved;
    return { inventoryId: row.id, skuId: row.sku.id, skuCode: row.sku.code, skuName: row.sku.nameZhCn, productId: row.sku.product.id, productTitle: row.sku.product.titleZhCn, onHand: row.onHand, reserved: row.reserved, available, lowStockThreshold: row.lowStockThreshold, lowStock: available <= row.lowStockThreshold, version: row.version, updatedAt: row.updatedAt.toISOString() };
  }

  private reservationView(skuId: string, reservation: InventoryReservation): InventoryReservationView {
    return { id: reservation.id, skuId, referenceId: reservation.referenceId, quantity: reservation.quantity, status: reservation.status, expiresAt: reservation.expiresAt.toISOString() };
  }
}
