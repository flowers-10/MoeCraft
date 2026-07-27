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

const cents = (amount: string) => Math.round(Number(amount) * 100);
const amount = (value: number) => (value / 100).toFixed(2);

export function calculatePromotionQuote(lines: PromotionQuoteLine[], coupon?: CouponRule): PromotionQuote {
  const original = lines.reduce((sum, line) => sum + cents(line.unitPrice) * line.quantity, 0);
  const emptyAllocations = lines.map((line) => {
    const lineOriginal = cents(line.unitPrice) * line.quantity;
    return { skuId: line.skuId, originalAmount: amount(lineOriginal), discountAmount: "0.00", payableAmount: amount(lineOriginal) };
  });
  if (!coupon) return { originalAmount: amount(original), discountAmount: "0.00", payableAmount: amount(original), allocations: emptyAllocations };
  const eligibleLines = lines.filter((line) => line.storeId === coupon.storeId && (!coupon.productIds.length || coupon.productIds.includes(line.productId)));
  const eligible = eligibleLines.reduce((sum, line) => sum + cents(line.unitPrice) * line.quantity, 0);
  if (eligible < cents(coupon.minimumAmount)) return { originalAmount: amount(original), discountAmount: "0.00", payableAmount: amount(original), allocations: emptyAllocations };
  const calculated = coupon.type === "FIXED" ? cents(coupon.value) : Math.floor(eligible * Number(coupon.value) / 100);
  const discount = Math.max(0, Math.min(eligible, calculated));
  let allocated = 0;
  const eligibleIds = new Set(eligibleLines.map((line) => line.skuId));
  const lastEligibleId = eligibleLines.at(-1)?.skuId;
  const allocations = lines.map((line) => {
    const lineOriginal = cents(line.unitPrice) * line.quantity;
    const lineDiscount = !eligibleIds.has(line.skuId) ? 0 : line.skuId === lastEligibleId ? discount - allocated : Math.floor(discount * lineOriginal / eligible);
    allocated += lineDiscount;
    return { skuId: line.skuId, originalAmount: amount(lineOriginal), discountAmount: amount(lineDiscount), payableAmount: amount(lineOriginal - lineDiscount) };
  });
  return {
    originalAmount: amount(original),
    discountAmount: amount(discount),
    payableAmount: amount(original - discount),
    allocations,
    couponId: coupon.id,
    couponCode: coupon.code,
    ruleSnapshot: { type: coupon.type, value: coupon.value, minimumAmount: coupon.minimumAmount, storeId: coupon.storeId, productIds: [...coupon.productIds] }
  };
}
