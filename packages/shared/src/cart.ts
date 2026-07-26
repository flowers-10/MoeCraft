export const CART_ITEM_INVALID_REASONS = [
  "SKU_NOT_FOUND",
  "SKU_INACTIVE",
  "PRODUCT_NOT_SELLABLE",
  "STORE_CLOSED",
  "MERCHANT_INACTIVE",
  "OUT_OF_STOCK",
  "PURCHASE_LIMIT_EXCEEDED",
  "QUANTITY_EXCEEDS_STOCK"
] as const;

export type CartItemInvalidReason = (typeof CART_ITEM_INVALID_REASONS)[number];

export type CartItemView = {
  id: string;
  skuId: string;
  productId: string;
  productTitleZhCn: string;
  productTitleEnUs: string | null;
  skuNameZhCn: string;
  skuNameEnUs: string | null;
  skuCode: string;
  coverFileId: string | null;
  quantity: number;
  selected: boolean;
  unitPriceAmount: number;
  linePriceAmount: number;
  currency: string;
  available: number;
  purchaseLimit: number | null;
  valid: boolean;
  invalidReason: CartItemInvalidReason | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  merchantId: string;
  saleType: "IN_STOCK" | "PREORDER";
};

export type CartStoreGroup = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  merchantId: string;
  isOpen: boolean;
  items: CartItemView[];
  selectedCount: number;
  selectedAmount: number;
};

export type CartMergeNotice = {
  code: "QUANTITY_MERGED" | "GUEST_ITEM_ADDED" | "QUANTITY_CLAMPED";
  skuId: string;
  productTitleZhCn: string;
  message: string;
};

export type CartView = {
  id: string | null;
  ownerType: "USER" | "GUEST" | "ANONYMOUS";
  currency: string;
  groups: CartStoreGroup[];
  itemCount: number;
  selectedCount: number;
  validSelectedCount: number;
  selectedAmount: number;
  invalidCount: number;
  priceDisclaimer: string;
  mergeNotices: CartMergeNotice[];
  updatedAt: string | null;
};

export type GuestCartLine = {
  skuId: string;
  quantity: number;
  selected?: boolean;
};
