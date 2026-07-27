import type { CouponRule, PromotionQuote, PromotionQuoteLine } from "@moecraft/shared";

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
