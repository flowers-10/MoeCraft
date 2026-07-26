import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  CartItemView,
  CartMergeNotice,
  CartStoreGroup,
  CartView
} from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CART_PRICE_DISCLAIMER,
  DEFAULT_CART_CURRENCY,
  clampCartQuantity,
  evaluateCartItem,
  mergeCartLines,
  type SellableSkuSnapshot
} from "./cart-domain";
import type {
  AddCartItemDto,
  SelectCartItemsDto,
  UpdateCartItemDto
} from "./cart.dto";

type CartOwner =
  | { type: "USER"; userId: string }
  | { type: "GUEST"; guestToken: string };

type CartRecord = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        sku: {
          include: {
            inventory: true;
            product: {
              include: {
                store: { include: { merchant: true } };
                media: true;
              };
            };
          };
        };
      };
    };
  };
}>;

const CART_ITEM_INCLUDE = {
  sku: {
    include: {
      inventory: true,
      product: {
        include: {
          store: { include: { merchant: true } },
          media: { where: { kind: "IMAGE" }, orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }] }
        }
      }
    }
  }
} satisfies Prisma.CartItemInclude;

const CART_INCLUDE = {
  items: {
    include: CART_ITEM_INCLUDE,
    orderBy: [{ createdAt: "asc" as const }]
  }
} satisfies Prisma.CartInclude;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async getCart(authorization?: string, guestToken?: string): Promise<CartView> {
    return this.loadView(await this.resolveOwner(authorization, guestToken), []);
  }

  async addItem(dto: AddCartItemDto, authorization?: string, guestToken?: string): Promise<CartView> {
    const owner = await this.resolveWritableOwner(authorization, guestToken);
    const sellable = await this.loadSellable(dto.skuId);
    if (!sellable) throw new NotFoundException("SELLABLE_SKU_NOT_FOUND");
    const evaluation = evaluateCartItem(sellable, dto.quantity);
    if (evaluation.valid) {
      // quantity within limits — proceed below
    } else if (evaluation.invalidReason !== "QUANTITY_EXCEEDS_STOCK" && evaluation.invalidReason !== "PURCHASE_LIMIT_EXCEEDED") {
      throw new BadRequestException(evaluation.invalidReason ?? "SKU_NOT_SELLABLE");
    }
    const quantity = clampCartQuantity(dto.quantity, sellable.available, sellable.purchaseLimit);
    if (quantity <= 0) throw new BadRequestException("OUT_OF_STOCK");

    await this.prisma.$transaction(async (tx) => {
      const cart = await this.ensureCart(tx, owner);
      const existing = await tx.cartItem.findUnique({ where: { cartId_skuId: { cartId: cart.id, skuId: dto.skuId } } });
      if (existing) {
        const nextQuantity = clampCartQuantity(existing.quantity + quantity, sellable.available, sellable.purchaseLimit);
        if (nextQuantity <= 0) throw new BadRequestException("OUT_OF_STOCK");
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity, selected: dto.selected ?? existing.selected }
        });
      } else {
        await tx.cartItem.create({
          data: { cartId: cart.id, skuId: dto.skuId, quantity, selected: dto.selected ?? true }
        });
      }
      await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    });

    return this.loadView(owner, []);
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto, authorization?: string, guestToken?: string): Promise<CartView> {
    if (dto.quantity === undefined && dto.selected === undefined) {
      throw new BadRequestException("CART_ITEM_UPDATE_REQUIRED");
    }
    const owner = await this.resolveWritableOwner(authorization, guestToken);
    await this.prisma.$transaction(async (tx) => {
      const item = await this.findOwnedItem(tx, owner, itemId);
      const sellable = this.toSellable(item.sku);
      const data: Prisma.CartItemUpdateInput = {};
      if (dto.quantity !== undefined) {
        const quantity = clampCartQuantity(dto.quantity, sellable?.available ?? 0, sellable?.purchaseLimit ?? null);
        if (quantity <= 0) throw new BadRequestException("OUT_OF_STOCK");
        if (sellable) {
          const evaluation = evaluateCartItem(sellable, quantity);
          if (!evaluation.valid && evaluation.invalidReason !== "QUANTITY_EXCEEDS_STOCK" && evaluation.invalidReason !== "PURCHASE_LIMIT_EXCEEDED") {
            throw new BadRequestException(evaluation.invalidReason ?? "SKU_NOT_SELLABLE");
          }
        }
        data.quantity = quantity;
      }
      if (dto.selected !== undefined) data.selected = dto.selected;
      await tx.cartItem.update({ where: { id: item.id }, data });
      await tx.cart.update({ where: { id: item.cartId }, data: { updatedAt: new Date() } });
    });
    return this.loadView(owner, []);
  }

  async removeItem(itemId: string, authorization?: string, guestToken?: string): Promise<CartView> {
    const owner = await this.resolveWritableOwner(authorization, guestToken);
    await this.prisma.$transaction(async (tx) => {
      const item = await this.findOwnedItem(tx, owner, itemId);
      await tx.cartItem.delete({ where: { id: item.id } });
      await tx.cart.update({ where: { id: item.cartId }, data: { updatedAt: new Date() } });
    });
    return this.loadView(owner, []);
  }

  async selectItems(dto: SelectCartItemsDto, authorization?: string, guestToken?: string): Promise<CartView> {
    const owner = await this.resolveWritableOwner(authorization, guestToken);
    if (!dto.itemIds.length) throw new BadRequestException("CART_ITEM_IDS_REQUIRED");
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.findCart(tx, owner);
      if (!cart) throw new NotFoundException("CART_NOT_FOUND");
      const updated = await tx.cartItem.updateMany({
        where: { cartId: cart.id, id: { in: dto.itemIds } },
        data: { selected: dto.selected }
      });
      if (!updated.count) throw new NotFoundException("CART_ITEM_NOT_FOUND");
      await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    });
    return this.loadView(owner, []);
  }

  async clearInvalid(authorization?: string, guestToken?: string): Promise<CartView> {
    const owner = await this.resolveWritableOwner(authorization, guestToken);
    const cart = await this.findCart(this.prisma, owner);
    if (!cart) return this.emptyView(owner);
    const invalidIds = cart.items.map((item) => (this.itemView(item).valid ? null : item.id)).filter((id): id is string => Boolean(id));
    if (invalidIds.length) {
      await this.prisma.cartItem.deleteMany({ where: { id: { in: invalidIds }, cartId: cart.id } });
      await this.prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    }
    return this.loadView(owner, []);
  }

  async mergeGuest(authorization?: string, guestToken?: string): Promise<CartView> {
    const owner = await this.requireUserOwner(authorization);
    const token = guestToken?.trim();
    if (!token) return this.loadView(owner, []);

    const guestCart = await this.prisma.cart.findFirst({
      where: { guestToken: token.slice(0, 64) },
      include: { items: true }
    });
    if (!guestCart || !guestCart.items.length) return this.loadView(owner, []);

    const guestLines = guestCart.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity, selected: item.selected }));
    const sellableMap = await this.loadSellableMap(guestLines.map((line) => line.skuId));
    let notices: CartMergeNotice[] = [];

    await this.prisma.$transaction(async (tx) => {
      const cart = await this.ensureCart(tx, owner);
      const existing = await tx.cartItem.findMany({ where: { cartId: cart.id } });
      const merged = mergeCartLines(
        existing.map((item) => ({ skuId: item.skuId, quantity: item.quantity, selected: item.selected })),
        guestLines,
        sellableMap
      );
      notices = merged.notices.map((notice) => {
        const sellable = sellableMap.get(notice.skuId);
        const title = sellable?.productTitleZhCn ?? notice.skuId;
        if (notice.code === "QUANTITY_MERGED") {
          return { code: notice.code, skuId: notice.skuId, productTitleZhCn: title, message: `「${title}」已与账号购物车合并为 ${notice.quantityAfter} 件` };
        }
        if (notice.code === "QUANTITY_CLAMPED") {
          return { code: notice.code, skuId: notice.skuId, productTitleZhCn: title, message: `「${title}」数量已按库存/限购调整为 ${notice.quantityAfter} 件` };
        }
        return { code: notice.code, skuId: notice.skuId, productTitleZhCn: title, message: `已从游客购物车加入「${title}」` };
      });

      for (const item of existing) {
        const next = merged.items.find((row) => row.skuId === item.skuId);
        if (!next) {
          await tx.cartItem.delete({ where: { id: item.id } });
          continue;
        }
        await tx.cartItem.update({ where: { id: item.id }, data: { quantity: next.quantity, selected: next.selected } });
      }
      for (const item of merged.items) {
        if (existing.some((row) => row.skuId === item.skuId)) continue;
        if (!sellableMap.has(item.skuId)) continue;
        await tx.cartItem.create({ data: { cartId: cart.id, skuId: item.skuId, quantity: item.quantity, selected: item.selected } });
      }
      await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
      // The guest cart is now folded into the user cart; remove it so the token cannot be replayed.
      await tx.cart.deleteMany({ where: { id: guestCart.id } });
    });

    return this.loadView(owner, notices);
  }

  private async loadView(owner: CartOwner | null, mergeNotices: CartMergeNotice[]): Promise<CartView> {
    if (!owner) return this.emptyView(null);
    const cart = await this.findCart(this.prisma, owner);
    if (!cart) return this.emptyView(owner);
    return this.toView(cart, owner, mergeNotices);
  }

  private emptyView(owner: CartOwner | null): CartView {
    return {
      id: null,
      ownerType: owner?.type === "USER" ? "USER" : owner?.type === "GUEST" ? "GUEST" : "ANONYMOUS",
      currency: DEFAULT_CART_CURRENCY,
      groups: [],
      itemCount: 0,
      selectedCount: 0,
      validSelectedCount: 0,
      selectedAmount: 0,
      invalidCount: 0,
      priceDisclaimer: CART_PRICE_DISCLAIMER,
      mergeNotices: [],
      updatedAt: null
    };
  }

  private toView(cart: CartRecord, owner: CartOwner, mergeNotices: CartMergeNotice[]): CartView {
    const items = cart.items.map((item) => this.itemView(item));
    const groupMap = new Map<string, CartStoreGroup>();
    for (const item of items) {
      const existing = groupMap.get(item.storeId);
      if (existing) {
        existing.items.push(item);
        if (item.selected && item.valid) {
          existing.selectedCount += item.quantity;
          existing.selectedAmount += item.linePriceAmount;
        }
        continue;
      }
      groupMap.set(item.storeId, {
        storeId: item.storeId,
        storeName: item.storeName,
        storeSlug: item.storeSlug,
        merchantId: item.merchantId,
        isOpen: item.invalidReason !== "STORE_CLOSED" && item.invalidReason !== "MERCHANT_INACTIVE",
        items: [item],
        selectedCount: item.selected && item.valid ? item.quantity : 0,
        selectedAmount: item.selected && item.valid ? item.linePriceAmount : 0
      });
    }
    const groups = [...groupMap.values()];
    const selectedItems = items.filter((item) => item.selected);
    const validSelected = selectedItems.filter((item) => item.valid);
    return {
      id: cart.id,
      ownerType: owner.type === "USER" ? "USER" : "GUEST",
      currency: items[0]?.currency ?? DEFAULT_CART_CURRENCY,
      groups,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      selectedCount: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
      validSelectedCount: validSelected.reduce((sum, item) => sum + item.quantity, 0),
      selectedAmount: validSelected.reduce((sum, item) => sum + item.linePriceAmount, 0),
      invalidCount: items.filter((item) => !item.valid).length,
      priceDisclaimer: CART_PRICE_DISCLAIMER,
      mergeNotices,
      updatedAt: cart.updatedAt.toISOString()
    };
  }

  private itemView(item: CartRecord["items"][number]): CartItemView {
    const sellable = this.toSellable(item.sku);
    const evaluation = evaluateCartItem(sellable, item.quantity);
    const unitPriceAmount = sellable?.unitPriceAmount ?? item.sku.priceAmount;
    return {
      id: item.id,
      skuId: item.skuId,
      productId: item.sku.productId,
      productTitleZhCn: item.sku.product.titleZhCn,
      productTitleEnUs: item.sku.product.titleEnUs,
      skuNameZhCn: item.sku.nameZhCn,
      skuNameEnUs: item.sku.nameEnUs,
      skuCode: item.sku.code,
      coverFileId: sellable?.coverFileId ?? null,
      quantity: item.quantity,
      selected: item.selected,
      unitPriceAmount,
      linePriceAmount: unitPriceAmount * item.quantity,
      currency: item.sku.currency,
      available: sellable?.available ?? 0,
      purchaseLimit: item.sku.purchaseLimit,
      valid: evaluation.valid,
      invalidReason: evaluation.invalidReason,
      storeId: item.sku.product.store.id,
      storeName: item.sku.product.store.name,
      storeSlug: item.sku.product.store.slug,
      merchantId: item.sku.product.store.merchantId,
      saleType: item.sku.product.saleType
    };
  }

  private toSellable(sku: CartRecord["items"][number]["sku"]): SellableSkuSnapshot | null {
    if (!sku) return null;
    const available = Math.max(0, (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0));
    const cover = sku.product.media.find((media) => media.kind === "IMAGE" && media.isCover) ?? sku.product.media.find((media) => media.kind === "IMAGE");
    return {
      skuId: sku.id,
      productId: sku.productId,
      productTitleZhCn: sku.product.titleZhCn,
      productTitleEnUs: sku.product.titleEnUs,
      skuNameZhCn: sku.nameZhCn,
      skuNameEnUs: sku.nameEnUs,
      skuCode: sku.code,
      coverFileId: cover?.fileId ?? null,
      unitPriceAmount: sku.priceAmount,
      currency: sku.currency,
      available,
      purchaseLimit: sku.purchaseLimit,
      isActive: sku.isActive,
      productStatus: sku.product.status,
      saleType: sku.product.saleType,
      storeId: sku.product.store.id,
      storeName: sku.product.store.name,
      storeSlug: sku.product.store.slug,
      storeIsOpen: sku.product.store.isOpen,
      merchantId: sku.product.store.merchantId,
      merchantStatus: sku.product.store.merchant.status
    };
  }

  private async loadSellable(skuId: string): Promise<SellableSkuSnapshot | null> {
    const map = await this.loadSellableMap([skuId]);
    return map.get(skuId) ?? null;
  }

  private async loadSellableMap(skuIds: string[]): Promise<Map<string, SellableSkuSnapshot>> {
    const unique = [...new Set(skuIds.filter(Boolean))];
    if (!unique.length) return new Map();
    const rows = await this.prisma.sku.findMany({
      where: { id: { in: unique } },
      include: {
        inventory: true,
        product: {
          include: {
            store: { include: { merchant: true } },
            media: { where: { kind: "IMAGE" }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] }
          }
        }
      }
    });
    return new Map(rows.map((sku) => {
      const available = Math.max(0, (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0));
      const cover = sku.product.media.find((media) => media.kind === "IMAGE" && media.isCover) ?? sku.product.media.find((media) => media.kind === "IMAGE");
      const snapshot: SellableSkuSnapshot = {
        skuId: sku.id,
        productId: sku.productId,
        productTitleZhCn: sku.product.titleZhCn,
        productTitleEnUs: sku.product.titleEnUs,
        skuNameZhCn: sku.nameZhCn,
        skuNameEnUs: sku.nameEnUs,
        skuCode: sku.code,
        coverFileId: cover?.fileId ?? null,
        unitPriceAmount: sku.priceAmount,
        currency: sku.currency,
        available,
        purchaseLimit: sku.purchaseLimit,
        isActive: sku.isActive,
        productStatus: sku.product.status,
        saleType: sku.product.saleType,
        storeId: sku.product.store.id,
        storeName: sku.product.store.name,
        storeSlug: sku.product.store.slug,
        storeIsOpen: sku.product.store.isOpen,
        merchantId: sku.product.store.merchantId,
        merchantStatus: sku.product.store.merchant.status
      };
      return [sku.id, snapshot];
    }));
  }

  private async ensureCart(tx: Prisma.TransactionClient | PrismaService, owner: CartOwner) {
    const existing = await this.findCart(tx, owner);
    if (existing) return existing;
    return tx.cart.create({
      data: owner.type === "USER" ? { userId: owner.userId } : { guestToken: owner.guestToken },
      include: CART_INCLUDE
    });
  }

  private async findCart(tx: Prisma.TransactionClient | PrismaService, owner: CartOwner): Promise<CartRecord | null> {
    return tx.cart.findFirst({
      where: owner.type === "USER" ? { userId: owner.userId } : { guestToken: owner.guestToken },
      include: CART_INCLUDE
    });
  }

  private async findOwnedItem(tx: Prisma.TransactionClient | PrismaService, owner: CartOwner, itemId: string) {
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, cart: owner.type === "USER" ? { userId: owner.userId } : { guestToken: owner.guestToken } },
      include: CART_ITEM_INCLUDE
    });
    if (!item) throw new NotFoundException("CART_ITEM_NOT_FOUND");
    return item;
  }

  private async resolveOwner(authorization?: string, guestToken?: string): Promise<CartOwner | null> {
    const userOwner = await this.tryUserOwner(authorization);
    if (userOwner) return userOwner;
    const token = guestToken?.trim();
    if (token) return { type: "GUEST", guestToken: token.slice(0, 64) };
    return null;
  }

  private async resolveWritableOwner(authorization?: string, guestToken?: string): Promise<CartOwner> {
    const userOwner = await this.tryUserOwner(authorization);
    if (userOwner) return userOwner;
    const token = guestToken?.trim();
    if (token) return { type: "GUEST", guestToken: token.slice(0, 64) };
    throw new UnauthorizedException("CART_OWNER_REQUIRED");
  }

  private async requireUserOwner(authorization?: string): Promise<{ type: "USER"; userId: string }> {
    const owner = await this.tryUserOwner(authorization);
    if (!owner) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    return owner;
  }

  private async tryUserOwner(authorization?: string): Promise<{ type: "USER"; userId: string } | null> {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token).catch(() => null);
    if (!payload?.sub) return null;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
    if (!user?.isActive) return null;
    return { type: "USER", userId: payload.sub };
  }
}
