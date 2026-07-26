import type { CartItemInvalidReason, GuestCartLine } from "@moecraft/shared";

export const DEFAULT_CART_CURRENCY = "CNY";
export const MAX_CART_ITEM_QUANTITY = 99;
export const CART_PRICE_DISCLAIMER = "购物车展示当前价，最终应付金额以结算试算为准。";

export type SellableSkuSnapshot = {
  skuId: string;
  productId: string;
  productTitleZhCn: string;
  productTitleEnUs: string | null;
  skuNameZhCn: string;
  skuNameEnUs: string | null;
  skuCode: string;
  coverFileId: string | null;
  unitPriceAmount: number;
  currency: string;
  available: number;
  purchaseLimit: number | null;
  isActive: boolean;
  productStatus: string;
  saleType: "IN_STOCK" | "PREORDER";
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeIsOpen: boolean;
  merchantId: string;
  merchantStatus: string;
};

export function clampCartQuantity(quantity: number, available: number, purchaseLimit: number | null): number {
  const stockCap = Math.max(0, available);
  const limitCap = purchaseLimit && purchaseLimit > 0 ? purchaseLimit : MAX_CART_ITEM_QUANTITY;
  const hardCap = Math.min(MAX_CART_ITEM_QUANTITY, limitCap, stockCap || MAX_CART_ITEM_QUANTITY);
  if (!Number.isInteger(quantity) || quantity <= 0) return 0;
  return Math.min(quantity, hardCap);
}

export function evaluateCartItem(sku: SellableSkuSnapshot | null, quantity: number): {
  valid: boolean;
  invalidReason: CartItemInvalidReason | null;
  effectiveQuantity: number;
} {
  if (!sku) return { valid: false, invalidReason: "SKU_NOT_FOUND", effectiveQuantity: quantity };
  if (!sku.isActive) return { valid: false, invalidReason: "SKU_INACTIVE", effectiveQuantity: quantity };
  if (sku.productStatus !== "ACTIVE") return { valid: false, invalidReason: "PRODUCT_NOT_SELLABLE", effectiveQuantity: quantity };
  if (!sku.storeIsOpen) return { valid: false, invalidReason: "STORE_CLOSED", effectiveQuantity: quantity };
  if (sku.merchantStatus !== "ACTIVE") return { valid: false, invalidReason: "MERCHANT_INACTIVE", effectiveQuantity: quantity };
  if (sku.available <= 0) return { valid: false, invalidReason: "OUT_OF_STOCK", effectiveQuantity: quantity };
  if (sku.purchaseLimit && quantity > sku.purchaseLimit) {
    return { valid: false, invalidReason: "PURCHASE_LIMIT_EXCEEDED", effectiveQuantity: quantity };
  }
  if (quantity > sku.available) {
    return { valid: false, invalidReason: "QUANTITY_EXCEEDS_STOCK", effectiveQuantity: quantity };
  }
  return { valid: true, invalidReason: null, effectiveQuantity: quantity };
}

export type MergeCartLine = {
  skuId: string;
  quantity: number;
  selected: boolean;
};

export type MergeCartResult = {
  items: MergeCartLine[];
  notices: Array<{
    code: "QUANTITY_MERGED" | "GUEST_ITEM_ADDED" | "QUANTITY_CLAMPED";
    skuId: string;
    quantityBefore?: number;
    quantityAfter: number;
  }>;
};

/**
 * Login merge rules:
 * 1. Same SKU: sum quantities (selected = either side selected).
 * 2. Guest-only SKU: carry into the user cart as selected unless guest marked unselected.
 * 3. Final quantity is clamped by stock and purchase limit when sellable snapshots are provided.
 */
export function mergeCartLines(
  userItems: MergeCartLine[],
  guestItems: MergeCartLine[],
  sellableBySkuId: Map<string, SellableSkuSnapshot> = new Map()
): MergeCartResult {
  const bySku = new Map<string, MergeCartLine>();
  const notices: MergeCartResult["notices"] = [];

  for (const item of userItems) {
    bySku.set(item.skuId, { skuId: item.skuId, quantity: item.quantity, selected: item.selected });
  }

  for (const guest of guestItems) {
    const existing = bySku.get(guest.skuId);
    if (!existing) {
      bySku.set(guest.skuId, { skuId: guest.skuId, quantity: guest.quantity, selected: guest.selected });
      notices.push({ code: "GUEST_ITEM_ADDED", skuId: guest.skuId, quantityAfter: guest.quantity });
      continue;
    }
    const mergedQuantity = existing.quantity + guest.quantity;
    bySku.set(guest.skuId, {
      skuId: guest.skuId,
      quantity: mergedQuantity,
      selected: existing.selected || guest.selected
    });
    notices.push({
      code: "QUANTITY_MERGED",
      skuId: guest.skuId,
      quantityBefore: existing.quantity,
      quantityAfter: mergedQuantity
    });
  }

  const items: MergeCartLine[] = [];
  for (const item of bySku.values()) {
    const sellable = sellableBySkuId.get(item.skuId);
    if (!sellable) {
      items.push(item);
      continue;
    }
    const clamped = clampCartQuantity(item.quantity, sellable.available, sellable.purchaseLimit);
    if (clamped <= 0) continue;
    if (clamped !== item.quantity) {
      notices.push({ code: "QUANTITY_CLAMPED", skuId: item.skuId, quantityBefore: item.quantity, quantityAfter: clamped });
    }
    items.push({ ...item, quantity: clamped });
  }

  return { items, notices };
}

export function normalizeGuestLines(lines: GuestCartLine[]): MergeCartLine[] {
  const bySku = new Map<string, MergeCartLine>();
  for (const line of lines) {
    if (!line.skuId || !Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const existing = bySku.get(line.skuId);
    if (existing) {
      existing.quantity += line.quantity;
      existing.selected = existing.selected || line.selected !== false;
      continue;
    }
    bySku.set(line.skuId, {
      skuId: line.skuId,
      quantity: Math.min(line.quantity, MAX_CART_ITEM_QUANTITY),
      selected: line.selected !== false
    });
  }
  return [...bySku.values()];
}
