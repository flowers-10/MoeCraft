import type { AdminButtonPermission, AdminRoutePermission } from "@moecraft/shared";

export const ADMIN_ROUTE_KEYS: readonly AdminRoutePermission[] = [
  "system.overview", "platform.onboarding", "platform.catalog", "platform.productReview", "merchant.store", "merchant.team",
  "commerce.products", "commerce.inventory", "commerce.orders", "commerce.afterSales", "commerce.reports"
];
export const MERCHANT_STAFF_ROUTE_KEYS: readonly AdminRoutePermission[] = ADMIN_ROUTE_KEYS.filter((key) => !key.startsWith("platform."));
export const ADMIN_BUTTON_KEYS: readonly AdminButtonPermission[] = [
  "store.profile.edit", "team.staff.create", "team.staff.permissions", "team.staff.remove",
  "products.manage", "products.submit", "products.review", "inventory.adjust", "orders.manage", "afterSales.manage", "reports.view"
];
export const MERCHANT_BUTTON_KEYS: readonly AdminButtonPermission[] = ADMIN_BUTTON_KEYS.filter((key) => key !== "products.review");
