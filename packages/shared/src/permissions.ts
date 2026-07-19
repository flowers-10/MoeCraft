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

export const ADMIN_ROUTE_PERMISSIONS = [
  "system.overview", "platform.onboarding", "merchant.store", "merchant.team",
  "commerce.products", "commerce.inventory", "commerce.orders", "commerce.afterSales", "commerce.reports"
] as const;
export type AdminRoutePermission = (typeof ADMIN_ROUTE_PERMISSIONS)[number];
export const MERCHANT_STAFF_ROUTE_PERMISSIONS = ADMIN_ROUTE_PERMISSIONS.filter(
  (permission): permission is Exclude<AdminRoutePermission, "platform.onboarding"> => permission !== "platform.onboarding"
);

export const ADMIN_BUTTON_PERMISSIONS = [
  "store.profile.edit", "team.staff.create", "team.staff.permissions", "team.staff.remove",
  "products.manage", "inventory.adjust", "orders.manage", "afterSales.manage", "reports.view"
] as const;
export type AdminButtonPermission = (typeof ADMIN_BUTTON_PERMISSIONS)[number];

export type AccessProfile = {
  routePermissions: AdminRoutePermission[];
  buttonPermissions: AdminButtonPermission[];
};
