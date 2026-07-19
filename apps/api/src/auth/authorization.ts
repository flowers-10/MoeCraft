import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { AdminButtonPermission, AdminRoutePermission, Permission, UserRole } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const P = { catalogRead:"catalog:read",productRead:"product:read",productManage:"product:manage",inventoryRead:"inventory:read",orderRead:"order:read",merchantRead:"merchant:read",merchantReview:"merchant:review",catalogManage:"catalog:manage",productReview:"product:review",auditRead:"audit:read" } as const satisfies Record<string, Permission>;

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: [], MERCHANT_OWNER: [P.catalogRead,P.productRead,P.productManage,P.inventoryRead,P.orderRead],
  MERCHANT_STAFF: [P.catalogRead,P.productRead,P.productManage,P.inventoryRead,P.orderRead],
  PLATFORM_OPERATOR: [P.merchantRead,P.merchantReview,P.catalogRead,P.catalogManage,P.productRead,P.productReview,P.orderRead,P.auditRead],
  PLATFORM_ADMIN: ["merchant:read","merchant:manage","merchant:review","staff:manage","catalog:read","catalog:manage","product:read","product:manage","product:review","inventory:read","inventory:adjust","order:read","order:manage","payment:read","refund:manage","settlement:read","settlement:manage","content:manage","audit:read","system:manage"]
};

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata("permissions", permissions);
export const RequireRoles = (...roles: UserRole[]) => SetMetadata("roles", roles);
export const RequireAdminRoute = (route: AdminRoutePermission) => SetMetadata("adminRoute", route);
export const RequireAdminButton = (button: AdminButtonPermission) => SetMetadata("adminButton", button);
export type RequestPrincipal = { sub: string; roles: UserRole[]; merchantId?: string };

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>("roles", [context.getHandler(), context.getClass()]) ?? [];
    const permissions = this.reflector.getAllAndOverride<Permission[]>("permissions", [context.getHandler(), context.getClass()]) ?? [];
    const adminRoute = this.reflector.getAllAndOverride<AdminRoutePermission>("adminRoute", [context.getHandler(), context.getClass()]);
    const adminButton = this.reflector.getAllAndOverride<AdminButtonPermission>("adminButton", [context.getHandler(), context.getClass()]);
    if (!roles.length && !permissions.length && !adminRoute && !adminButton) return true;
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: RequestPrincipal }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const tokenPrincipal = await this.jwt.verifyAsync<RequestPrincipal>(token).catch(() => { throw new UnauthorizedException("AUTHENTICATION_REQUIRED"); });
    const user = await this.prisma.user.findUnique({
      where: { id: tokenPrincipal.sub },
      select: { isActive: true, roles: { select: { role: true } }, merchantMemberships: { select: { merchantId: true, role: true, routePermissions: true, buttonPermissions: true }, take: 1 } }
    });
    if (!user?.isActive) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const principal: RequestPrincipal = {
      sub: tokenPrincipal.sub,
      roles: user.roles.map(({ role }) => role as UserRole),
      merchantId: user.merchantMemberships[0]?.merchantId
    };
    request.user = principal;
    if (roles.length && !roles.some((role) => principal.roles.includes(role))) throw new ForbiddenException("PERMISSION_DENIED");
    if (permissions.length && !permissions.every((permission) => principal.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission)))) throw new ForbiddenException("PERMISSION_DENIED");
    const membership=user.merchantMemberships[0];const privileged=principal.roles.some((role)=>role==="PLATFORM_ADMIN"||role==="PLATFORM_OPERATOR")||membership?.role==="OWNER";
    if(adminRoute&&!privileged&&!this.jsonPermissions(membership?.routePermissions).includes(adminRoute))throw new ForbiddenException("ROUTE_PERMISSION_DENIED");
    if(adminButton&&!privileged&&!this.jsonPermissions(membership?.buttonPermissions).includes(adminButton))throw new ForbiddenException("BUTTON_PERMISSION_DENIED");
    return true;
  }
  private jsonPermissions(value:Prisma.JsonValue|undefined):string[]{return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];}
}

export function assertMerchantScope(principal: RequestPrincipal, merchantId: string) {
  if (principal.roles.includes("PLATFORM_ADMIN")) return;
  if (!principal.merchantId || principal.merchantId !== merchantId) throw new ForbiddenException("PERMISSION_DENIED");
}
