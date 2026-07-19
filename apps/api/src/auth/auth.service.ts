import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto, RegisterDto } from "./auth.dto";
import type { AccessProfile } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { ADMIN_BUTTON_KEYS, ADMIN_ROUTE_KEYS, MERCHANT_BUTTON_KEYS } from "./admin-access";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

type PublicUser = { id: string; username: string; displayName: string; roles: string[] };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException("ACCOUNT_ALREADY_EXISTS");

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        displayName: dto.displayName,
        passwordHash: await bcrypt.hash(dto.password, 12),
        roles: { create: { role: "CUSTOMER" } }
      },
      include: { roles: true }
    });
    await this.audit("auth.registered", user.id, ip);
    return this.issueSession(this.publicUser(user), ip, userAgent);
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.account }, include: { roles: true } });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.audit("auth.login_failed", user?.id, ip);
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }
    await this.audit("auth.login_succeeded", user.id, ip);
    return this.issueSession(this.publicUser(user), ip, userAgent);
  }

  async refresh(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split(".");
    if (!sessionId || !secret) throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: { include: { roles: true } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !(await bcrypt.compare(secret, session.refreshTokenHash))) {
      throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    }
    const nextSecret = randomBytes(32).toString("base64url");
    await this.prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: await bcrypt.hash(nextSecret, 10) } });
    const user = this.publicUser(session.user);
    return { accessToken: await this.sign(user), refreshToken: `${session.id}.${nextSecret}`, user };
  }

  async logout(refreshToken: string) {
    const sessionId = refreshToken.split(".")[0];
    if (sessionId) await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async me(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token).catch(() => { throw new UnauthorizedException("AUTHENTICATION_REQUIRED"); });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } });
    if (!user?.isActive) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    return this.publicUser(user);
  }

  async accessProfile(authorization?: string): Promise<AccessProfile> {
    const user = await this.currentUser(authorization);
    const roles = user.roles.map(({ role }) => role);
    if (roles.includes("PLATFORM_ADMIN") || roles.includes("PLATFORM_OPERATOR")) return { routePermissions: [...ADMIN_ROUTE_KEYS], buttonPermissions: [...ADMIN_BUTTON_KEYS] };
    const membership = user.merchantMemberships[0];
    if (membership?.role === "OWNER") return { routePermissions: [...ADMIN_ROUTE_KEYS].filter((item) => !item.startsWith("platform.")), buttonPermissions: [...MERCHANT_BUTTON_KEYS] };
    if (membership?.role === "STAFF") return { routePermissions: this.accessList(membership.routePermissions, ADMIN_ROUTE_KEYS), buttonPermissions: this.accessList(membership.buttonPermissions, MERCHANT_BUTTON_KEYS) };
    return { routePermissions: ["system.overview", "platform.onboarding"], buttonPermissions: [] };
  }

  async forgotPassword(account: string) {
    const user = await this.prisma.user.findUnique({ where: { username: account } });
    if (user?.isActive) {
      const token = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: this.sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
      await this.audit("auth.password_reset_requested", user.id);
      // Delivery provider is introduced later; never return the raw token from the public endpoint.
    }
    return { accepted: true };
  }

  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.sha256(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new UnauthorizedException("INVALID_RESET_TOKEN");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    await this.audit("auth.password_reset_completed", record.userId);
    return { success: true };
  }

  private async issueSession(user: PublicUser, ip?: string, userAgent?: string) {
    const secret = randomBytes(32).toString("base64url");
    const session = await this.prisma.session.create({ data: { userId: user.id, refreshTokenHash: await bcrypt.hash(secret, 10), expiresAt: new Date(Date.now() + REFRESH_TTL_MS), ipAddress: ip, userAgent } });
    return { accessToken: await this.sign(user), refreshToken: `${session.id}.${secret}`, user };
  }

  private sign(user: PublicUser) { return this.jwt.signAsync({ sub: user.id, roles: user.roles }); }
  private sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
  private publicUser(user: { id: string; username: string; displayName: string; roles: { role: string }[] }): PublicUser {
    return { id: user.id, username: user.username, displayName: user.displayName, roles: user.roles.map(({ role }) => role) };
  }
  private async currentUser(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token).catch(() => { throw new UnauthorizedException("AUTHENTICATION_REQUIRED"); });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true, merchantMemberships: { take: 1 } } });
    if (!user?.isActive) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    return user;
  }
  private accessList<T extends string>(value: Prisma.JsonValue | null, allowed: readonly T[]): T[] { return Array.isArray(value) ? value.filter((item): item is T => typeof item === "string" && allowed.includes(item as T)) : []; }
  private async audit(action: string, actorId?: string, ipAddress?: string) {
    await this.prisma.auditLog.create({ data: { action, actorId, ipAddress } });
  }
}
