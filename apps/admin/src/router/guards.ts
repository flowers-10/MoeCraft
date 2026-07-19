import type { AdminRoutePermission } from "@moecraft/shared";
import type { Router } from "vue-router";

const access = () => JSON.parse(sessionStorage.getItem("mc-admin-route-permissions") ?? "null") as AdminRoutePermission[] | null;
const roles = () => JSON.parse(sessionStorage.getItem("mc-admin-roles") ?? "[]") as string[];
const fallback = (permissions: AdminRoutePermission[]) => {
  const routes: Array<[AdminRoutePermission, string]> = [["merchant.store", "/merchant/store"], ["merchant.team", "/merchant/team"], ["system.overview", "/system/overview"], ["platform.onboarding", "/platform/merchant-applications"], ["commerce.products", "/commerce/products"], ["commerce.orders", "/commerce/orders"]];
  return routes.find(([key]) => permissions.includes(key))?.[1] ?? "/login";
};

export function installGuards(router: Router) {
  router.beforeEach((to) => {
    const authenticated = Boolean(sessionStorage.getItem("mc-admin-token"));
    if (!authenticated && !to.meta.public) return { name: "login", query: { redirect: to.fullPath } };
    const permissions = access();
    if (authenticated && to.name === "login") return permissions ? fallback(permissions) : undefined;
    if (!permissions) return;
    const requiredRoles = to.meta.roles as string[] | undefined;
    if (requiredRoles?.length && !requiredRoles.some((role) => roles().includes(role))) return fallback(permissions);
    const accessKey = to.meta.accessKey as AdminRoutePermission | undefined;
    if (accessKey && !permissions.includes(accessKey)) return fallback(permissions);
  });
}
