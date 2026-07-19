import type { AdminButtonPermission, AdminRoutePermission } from "@moecraft/shared";

export const ADMIN_ROUTE_KEYS: readonly AdminRoutePermission[] = [
  "system.overview", "platform.onboarding", "merchant.store", "merchant.team",
  "commerce.products", "commerce.inventory", "commerce.orders", "commerce.afterSales", "commerce.reports"
];
export const MERCHANT_STAFF_ROUTE_KEYS: readonly AdminRoutePermission[] = ADMIN_ROUTE_KEYS.filter((key) => key !== "platform.onboarding");
export const ADMIN_BUTTON_KEYS: readonly AdminButtonPermission[] = [
  "store.profile.edit", "team.staff.create", "team.staff.permissions", "team.staff.remove",
  "products.manage", "inventory.adjust", "orders.manage", "afterSales.manage", "reports.view"
];
