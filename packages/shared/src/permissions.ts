export const USER_ROLES = [
  "CUSTOMER",
  "MERCHANT_OWNER",
  "MERCHANT_STAFF",
  "PLATFORM_OPERATOR",
  "PLATFORM_ADMIN"
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const PERMISSIONS = {
  merchantRead: "merchant:read",
  merchantManage: "merchant:manage",
  merchantReview: "merchant:review",
  staffManage: "staff:manage",
  catalogRead: "catalog:read",
  catalogManage: "catalog:manage",
  productRead: "product:read",
  productManage: "product:manage",
  productReview: "product:review",
  inventoryRead: "inventory:read",
  inventoryAdjust: "inventory:adjust",
  orderRead: "order:read",
  orderManage: "order:manage",
  paymentRead: "payment:read",
  refundManage: "refund:manage",
  settlementRead: "settlement:read",
  settlementManage: "settlement:manage",
  contentManage: "content:manage",
  auditRead: "audit:read",
  systemManage: "system:manage"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
