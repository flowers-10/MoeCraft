import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PERMISSIONS, type Permission, type UserRole } from "@moecraft/shared";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: [], MERCHANT_OWNER: Object.values(PERMISSIONS).filter((permission) => !permission.startsWith("system:") && !permission.endsWith(":review")),
  MERCHANT_STAFF: [PERMISSIONS.catalogRead, PERMISSIONS.productRead, PERMISSIONS.productManage, PERMISSIONS.inventoryRead, PERMISSIONS.orderRead],
  PLATFORM_OPERATOR: [PERMISSIONS.merchantRead, PERMISSIONS.merchantReview, PERMISSIONS.catalogRead, PERMISSIONS.catalogManage, PERMISSIONS.productRead, PERMISSIONS.productReview, PERMISSIONS.orderRead, PERMISSIONS.auditRead],
  PLATFORM_ADMIN: Object.values(PERMISSIONS)
};

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata("permissions", permissions);
export const RequireRoles = (...roles: UserRole[]) => SetMetadata("roles", roles);
export type RequestPrincipal = { sub: string; roles: UserRole[]; merchantId?: string };

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>("roles", [context.getHandler(), context.getClass()]) ?? [];
    const permissions = this.reflector.getAllAndOverride<Permission[]>("permissions", [context.getHandler(), context.getClass()]) ?? [];
    if (!roles.length && !permissions.length) return true;
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: RequestPrincipal }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const principal = await this.jwt.verifyAsync<RequestPrincipal>(token).catch(() => { throw new UnauthorizedException("AUTHENTICATION_REQUIRED"); });
    request.user = principal;
    if (roles.length && !roles.some((role) => principal.roles.includes(role))) throw new ForbiddenException("PERMISSION_DENIED");
    if (permissions.length && !permissions.every((permission) => principal.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission)))) throw new ForbiddenException("PERMISSION_DENIED");
    return true;
  }
}

export function assertMerchantScope(principal: RequestPrincipal, merchantId: string) {
  if (principal.roles.includes("PLATFORM_ADMIN")) return;
  if (!principal.merchantId || principal.merchantId !== merchantId) throw new ForbiddenException("PERMISSION_DENIED");
}
