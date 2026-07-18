export const MERCHANT_APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "NEEDS_CHANGES",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN"
] as const;
export type MerchantApplicationStatus = (typeof MERCHANT_APPLICATION_STATUSES)[number];

export const MERCHANT_APPLICATION_TRANSITIONS: Readonly<Record<MerchantApplicationStatus, readonly MerchantApplicationStatus[]>> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["NEEDS_CHANGES", "APPROVED", "REJECTED", "WITHDRAWN"],
  NEEDS_CHANGES: ["SUBMITTED", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: []
};

export function canTransitionMerchantApplication(from: MerchantApplicationStatus, to: MerchantApplicationStatus): boolean {
  return MERCHANT_APPLICATION_TRANSITIONS[from].includes(to);
}

export const PRODUCT_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED"
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "AFTER_SALE",
  "CLOSED"
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const AFTER_SALE_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "AWAITING_RETURN",
  "RETURNED",
  "REFUND_PROCESSING",
  "COMPLETED",
  "CANCELLED"
] as const;
export type AfterSaleStatus = (typeof AFTER_SALE_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "CLOSED"],
  PAID: ["PARTIALLY_SHIPPED", "SHIPPED", "AFTER_SALE", "CANCELLED"],
  PARTIALLY_SHIPPED: ["SHIPPED", "AFTER_SALE"],
  SHIPPED: ["COMPLETED", "AFTER_SALE"],
  COMPLETED: ["AFTER_SALE"],
  CANCELLED: [],
  AFTER_SALE: ["COMPLETED", "CLOSED"],
  CLOSED: []
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
