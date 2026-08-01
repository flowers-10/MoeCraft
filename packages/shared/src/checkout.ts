import type { CartItemInvalidReason } from "./cart";

export type ShippingAddressSnapshot = {
  recipient: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode?: string;
};

export type ShippingAddressView = ShippingAddressSnapshot & {
  id: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveShippingAddressInput = ShippingAddressSnapshot & {
  isDefault?: boolean;
};

export type CheckoutQuoteItem = {
  cartItemId: string;
  skuId: string;
  productId: string;
  productTitle: string;
  skuName: string;
  coverFileId: string | null;
  quantity: number;
  currency: string;
  unitPrice: string;
  originalAmount: string;
  discountAmount: string;
  payableAmount: string;
  valid: boolean;
  invalidReason: CartItemInvalidReason | null;
};

export type CheckoutQuoteGroup = {
  storeId: string;
  merchantId: string;
  storeName: string;
  storeSlug: string;
  items: CheckoutQuoteItem[];
  originalAmount: string;
  shippingAmount: string;
  discountAmount: string;
  payableAmount: string;
};

export type CheckoutQuote = {
  id: string;
  version: "g21.v1";
  signature: string;
  currency: "CNY";
  address: ShippingAddressSnapshot;
  couponCode: string | null;
  groups: CheckoutQuoteGroup[];
  originalAmount: string;
  shippingAmount: string;
  discountAmount: string;
  payableAmount: string;
  invalidCount: number;
  valid: boolean;
  invalidReasons: CartItemInvalidReason[];
  expiresAt: string;
};
