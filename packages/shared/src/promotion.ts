export const COUPON_TYPES = ["FIXED", "PERCENTAGE"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];
export const COUPON_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export type CouponView = {
  id: string;
  code: string;
  name: string;
  type: CouponType;
  value: string;
  minimumAmount: string;
  startsAt: string;
  endsAt: string;
  status: CouponStatus;
  totalLimit: number;
  perUserLimit: number;
  storeId: string;
  productIds: string[];
  claimedCount: number;
  usedCount: number;
  discountTotal: string;
  createdAt: string;
};

export type PromotionQuoteLine = {
  skuId: string;
  productId: string;
  storeId: string;
  quantity: number;
  unitPrice: string;
};

export type PromotionQuote = {
  originalAmount: string;
  discountAmount: string;
  payableAmount: string;
  allocations: Array<{ skuId: string; originalAmount: string; discountAmount: string; payableAmount: string }>;
  couponId?: string;
  couponCode?: string;
  ruleSnapshot?: {
    type: CouponType;
    value: string;
    minimumAmount: string;
    storeId: string;
    productIds: string[];
  };
};

export type CouponRule = Pick<CouponView, "id" | "code" | "type" | "value" | "minimumAmount" | "storeId" | "productIds">;
