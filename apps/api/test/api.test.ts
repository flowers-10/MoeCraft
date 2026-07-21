import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AppService } from "../src/app.service";
import { AuthService } from "../src/auth/auth.service";
import { AuthorizationGuard, assertMerchantScope, rolesHavePermissions, type RequestPrincipal } from "../src/auth/authorization";
import { FilesService } from "../src/files/files.service";
import { resolveApiErrorCode } from "../src/http/api-error-code";
import { canTransitionMerchantApplication } from "../src/merchants/merchant-onboarding-workflow";
import { ApiMetricsService } from "../src/observability/api-metrics.service";
import { ensureTraceContext } from "../src/observability/trace-context";
import { canTransitionProduct } from "../src/products/product-workflow";
import { PrismaService } from "../src/prisma/prisma.service";

type GuardRequest = { headers: { authorization?: string }; user?: RequestPrincipal };
type GuardMetadata = Partial<Record<"roles" | "permissions" | "adminRoute" | "adminButton", unknown>>;

function createGuardContext(metadata: GuardMetadata, databaseUser: unknown, authorization?: string) {
  const values = new Map(Object.entries(metadata));
  const reflector = {
    getAllAndOverride<T>(key: string): T | undefined {
      return values.get(key) as T | undefined;
    }
  } as unknown as Reflector;
  const jwt = { verifyAsync: async () => ({ sub: "user-1" }) } as unknown as JwtService;
  const prisma = { user: { findUnique: async () => databaseUser } } as unknown as PrismaService;
  const request: GuardRequest = { headers: { authorization } };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
  return { guard: new AuthorizationGuard(reflector, jwt, prisma), context, request };
}

test("health stays lightweight while readiness probes the database", async () => {
  let probes = 0;
  const prisma = { $queryRaw: async () => { probes += 1; } } as unknown as PrismaService;
  const app = new AppService(prisma, new ApiMetricsService());

  assert.equal(app.getHealth().status, "ok");
  assert.equal(probes, 0);
  const readiness = await app.getReadiness();
  assert.equal(readiness.dependencies.database, "ok");
  assert.equal(probes, 1);
});

test("readiness returns a stable unavailable error when the database probe fails", async () => {
  const prisma = { $queryRaw: async () => { throw new Error("sensitive connection details"); } } as unknown as PrismaService;
  const app = new AppService(prisma, new ApiMetricsService());

  await assert.rejects(
    () => app.getReadiness(),
    (error: unknown) => error instanceof ServiceUnavailableException && error.message === "READINESS_FAILED"
  );
});

test("request metrics aggregate status buckets without route-level cardinality", () => {
  const metrics = new ApiMetricsService();
  metrics.recordRequest(200, 10);
  metrics.recordRequest(404, 20);
  metrics.recordRequest(503, 30);

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.requestsTotal, 3);
  assert.equal(snapshot.errorsTotal, 1);
  assert.equal(snapshot.averageDurationMs, 20);
  assert.deepEqual(snapshot.statusBuckets, { "2xx": 1, "4xx": 1, "5xx": 1 });
  assert.ok(snapshot.uptimeSeconds >= 0);
});

test("trace context preserves valid upstream trace IDs and replaces invalid context", () => {
  const firstRequest = { headers: { traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01" } };
  const firstHeaders: Record<string, string> = {};
  const firstTraceId = ensureTraceContext(firstRequest, { setHeader: (name, value) => { firstHeaders[name] = value; } });
  assert.equal(firstTraceId, "0123456789abcdef0123456789abcdef");
  assert.match(firstHeaders.traceparent, /^00-0123456789abcdef0123456789abcdef-[0-9a-f]{16}-01$/);

  const secondRequest = { headers: { traceparent: "invalid" } };
  const secondHeaders: Record<string, string> = {};
  const secondTraceId = ensureTraceContext(secondRequest, { setHeader: (name, value) => { secondHeaders[name] = value; } });
  assert.match(secondTraceId, /^[0-9a-f]{32}$/);
  assert.match(secondHeaders.traceparent, new RegExp(`^00-${secondTraceId}-[0-9a-f]{16}-01$`));
});

test("auth login issues a session for valid credentials", async () => {
  const passwordHash = await bcrypt.hash("correct-password", 4);
  const auditEvents: string[] = [];
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        username: "alice",
        displayName: "Alice",
        passwordHash,
        isActive: true,
        roles: [{ role: "CUSTOMER" }]
      })
    },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { auditEvents.push(data.action); } },
    session: { create: async () => ({ id: "session-1" }) }
  } as unknown as PrismaService;
  const jwt = { signAsync: async () => "access-token" } as unknown as JwtService;
  const auth = new AuthService(prisma, jwt);

  const result = await auth.login({ account: "alice", password: "correct-password" }, "127.0.0.1", "test-agent");

  assert.equal(result.accessToken, "access-token");
  assert.match(result.refreshToken, /^session-1\./);
  assert.deepEqual(result.user.roles, ["CUSTOMER"]);
  assert.deepEqual(auditEvents, ["auth.login_succeeded"]);
});

test("auth login rejects invalid credentials without exposing account state", async () => {
  const prisma = {
    user: { findUnique: async () => null },
    auditLog: { create: async () => undefined }
  } as unknown as PrismaService;
  const jwt = {} as JwtService;
  const auth = new AuthService(prisma, jwt);

  await assert.rejects(
    () => auth.login({ account: "missing", password: "wrong-password" }),
    (error: unknown) => error instanceof UnauthorizedException && error.message === "INVALID_CREDENTIALS"
  );
});

test("refresh rotates the stored secret and logout revokes the session", async () => {
  const oldSecret = "old-refresh-secret";
  const refreshTokenHash = await bcrypt.hash(oldSecret, 4);
  const updates: string[] = [];
  let revoked = false;
  const prisma = {
    session: {
      findUnique: async () => ({
        id: "session-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        refreshTokenHash,
        user: { id: "user-1", username: "alice", displayName: "Alice", roles: [{ role: "CUSTOMER" }] }
      }),
      update: async ({ data }: { data: { refreshTokenHash: string } }) => { updates.push(data.refreshTokenHash); },
      updateMany: async () => { revoked = true; }
    }
  } as unknown as PrismaService;
  const jwt = { signAsync: async () => "rotated-access-token" } as unknown as JwtService;
  const auth = new AuthService(prisma, jwt);

  const result = await auth.refresh(`session-1.${oldSecret}`);
  await auth.logout(result.refreshToken);

  assert.equal(result.accessToken, "rotated-access-token");
  assert.notEqual(result.refreshToken, `session-1.${oldSecret}`);
  assert.equal(updates.length, 1);
  assert.equal(await bcrypt.compare(result.refreshToken.split(".")[1], updates[0]), true);
  assert.equal(revoked, true);
});

test("RBAC policy grants only the permissions carried by a role", () => {
  assert.equal(rolesHavePermissions(["MERCHANT_OWNER"], ["product:manage", "inventory:read"]), true);
  assert.equal(rolesHavePermissions(["CUSTOMER"], ["product:manage"]), false);
  assert.equal(rolesHavePermissions(["PLATFORM_OPERATOR"], ["catalog:manage", "product:review"]), true);
  assert.equal(rolesHavePermissions(["MERCHANT_STAFF"], ["merchant:manage"]), false);
});

test("merchant scope denies cross-merchant access except for platform administrators", () => {
  assert.doesNotThrow(() => assertMerchantScope({ sub: "owner-1", roles: ["MERCHANT_OWNER"], merchantId: "merchant-1" }, "merchant-1"));
  assert.throws(
    () => assertMerchantScope({ sub: "owner-1", roles: ["MERCHANT_OWNER"], merchantId: "merchant-1" }, "merchant-2"),
    { message: "PERMISSION_DENIED" }
  );
  assert.doesNotThrow(() => assertMerchantScope({ sub: "admin-1", roles: ["PLATFORM_ADMIN"] }, "merchant-2"));
});

test("authorization guard enforces database roles and merchant route/button permissions", async () => {
  const { guard, context, request } = createGuardContext(
    { roles: ["MERCHANT_STAFF"], permissions: ["product:manage"], adminRoute: "commerce.products", adminButton: "products.manage" },
    {
      isActive: true,
      roles: [{ role: "MERCHANT_STAFF" }],
      merchantMemberships: [{ merchantId: "merchant-1", role: "STAFF", routePermissions: ["commerce.products"], buttonPermissions: ["products.manage"] }]
    },
    "Bearer valid-token"
  );

  assert.equal(await guard.canActivate(context), true);
  assert.equal(request.user?.merchantId, "merchant-1");
});

test("authorization guard rejects missing tokens and role permissions", async () => {
  const unauthenticated = createGuardContext({ roles: ["MERCHANT_OWNER"] }, null);
  await assert.rejects(() => unauthenticated.guard.canActivate(unauthenticated.context), (error: unknown) => error instanceof UnauthorizedException);

  const denied = createGuardContext(
    { permissions: ["catalog:manage"] },
    { isActive: true, roles: [{ role: "MERCHANT_STAFF" }], merchantMemberships: [] },
    "Bearer valid-token"
  );
  await assert.rejects(() => denied.guard.canActivate(denied.context), (error: unknown) => error instanceof ForbiddenException && error.message === "PERMISSION_DENIED");
});

test("merchant onboarding workflow rejects terminal status changes", () => {
  assert.equal(canTransitionMerchantApplication("DRAFT", "SUBMITTED"), true);
  assert.equal(canTransitionMerchantApplication("SUBMITTED", "NEEDS_CHANGES"), true);
  assert.equal(canTransitionMerchantApplication("APPROVED", "DRAFT"), false);
  assert.equal(canTransitionMerchantApplication("WITHDRAWN", "SUBMITTED"), false);
});

test("product workflow accepts only declared status transitions", () => {
  assert.equal(canTransitionProduct("DRAFT", "PENDING_REVIEW"), true);
  assert.equal(canTransitionProduct("REJECTED", "PENDING_REVIEW"), true);
  assert.equal(canTransitionProduct("APPROVED", "ACTIVE"), true);
  assert.equal(canTransitionProduct("DRAFT", "ACTIVE"), false);
  assert.equal(canTransitionProduct("ARCHIVED", "DRAFT"), false);
});

test("file service rejects unsupported MIME types and scopes valid assets to their owner", async () => {
  const prisma = {
    fileAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => data
    }
  } as unknown as PrismaService;
  const files = new FilesService(prisma);

  assert.throws(
    () => files.create("user-1", { purpose: "product-media", fileName: "script.exe", mimeType: "application/octet-stream", sizeBytes: 100 }),
    (error: unknown) => error instanceof BadRequestException && error.message === "UNSUPPORTED_FILE_TYPE"
  );
  const asset = await files.create("user-1", { purpose: "product-media", fileName: "cover.png", mimeType: "image/png", sizeBytes: 100 });
  assert.equal(asset.ownerId, "user-1");
  assert.match(asset.objectKey, /^private\/user-1\//);
});

test("API errors preserve domain codes and use safe generic fallbacks", () => {
  assert.equal(resolveApiErrorCode(401, { message: "INVALID_CREDENTIALS", error: "Unauthorized" }), "INVALID_CREDENTIALS");
  assert.equal(resolveApiErrorCode(403, { message: "Permission denied", error: "Forbidden" }), "PERMISSION_DENIED");
  assert.equal(resolveApiErrorCode(400, { message: ["title must be a string"], error: "Bad Request" }), "VALIDATION_FAILED");
  assert.equal(resolveApiErrorCode(400, { message: "PRODUCT_REVIEW_INCOMPLETE:categoryId,media.cover" }), "PRODUCT_REVIEW_INCOMPLETE");
  assert.equal(resolveApiErrorCode(500, { message: "database connection details" }), "INTERNAL_ERROR");
});
