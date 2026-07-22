import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AppService } from "../src/app.service";
import { AuthService } from "../src/auth/auth.service";
import { AuthorizationGuard, assertMerchantScope, rolesHavePermissions, type RequestPrincipal } from "../src/auth/authorization";
import { FilesService, type UploadedFilePayload } from "../src/files/files.service";
import { CatalogService } from "../src/catalog/catalog.service";
import { LocalObjectStorageService } from "../src/files/local-object-storage.service";
import { resolveApiErrorCode } from "../src/http/api-error-code";
import { applyInventoryDelta, InvalidInventoryMutationError } from "../src/inventory/inventory-domain";
import { InventoryService } from "../src/inventory/inventory.service";
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

function createInventoryPrisma(options: { conflict?: boolean; failLedger?: boolean } = {}) {
  let inventory = { id: "inventory-1", skuId: "sku-1", onHand: 5, reserved: 0, lowStockThreshold: 2, version: 0, createdAt: new Date(), updatedAt: new Date() };
  let reservations: Array<Record<string, unknown>> = [];
  let ledger: Array<Record<string, unknown>> = [];
  const product = { status: "ACTIVE", store: { isOpen: true, merchant: { status: "ACTIVE" } } };
  const transaction = {
    inventory: {
      findUnique: async ({ select }: { select?: { id?: boolean } }) => select ? { id: inventory.id } : { ...inventory, sku: { id: "sku-1", isActive: true, product } },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, number> }) => {
        if (options.conflict || where.version !== inventory.version || where.onHand !== inventory.onHand || where.reserved !== inventory.reserved) return { count: 0 };
        inventory = { ...inventory, onHand: data.onHand, reserved: data.reserved, version: data.version, updatedAt: new Date() };
        return { count: 1 };
      }
    },
    inventoryReservation: {
      findUnique: async ({ where }: { where: { inventoryId_referenceId: { inventoryId: string; referenceId: string } } }) => {
        const match = reservations.find((item) => item.inventoryId === where.inventoryId_referenceId.inventoryId && item.referenceId === where.inventoryId_referenceId.referenceId);
        return match ? { ...match, inventory: { ...inventory } } : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `reservation-${reservations.length + 1}`, status: "ACTIVE", committedAt: null, releasedAt: null, releaseReason: null, createdAt: new Date(), updatedAt: new Date(), ...data };
        reservations.push(row);
        return row;
      },
      updateMany: async ({ where, data }: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
        const index = reservations.findIndex((item) => item.id === where.id && item.status === where.status);
        if (index < 0) return { count: 0 };
        reservations[index] = { ...reservations[index], ...data, updatedAt: new Date() };
        return { count: 1 };
      }
    },
    inventoryLedgerEntry: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (options.failLedger) throw new Error("ledger unavailable");
        const row = { id: `ledger-${ledger.length + 1}`, createdAt: new Date(), ...data };
        ledger.push(row);
        return row;
      }
    }
  };
  const prisma = {
    $transaction: async <T>(operation: (tx: typeof transaction) => Promise<T>) => {
      const snapshot = { inventory: { ...inventory }, reservations: structuredClone(reservations), ledger: structuredClone(ledger) };
      try { return await operation(transaction); }
      catch (error) { inventory = snapshot.inventory; reservations = snapshot.reservations; ledger = snapshot.ledger; throw error; }
    },
    inventoryReservation: { findFirst: async () => null }
  } as unknown as PrismaService;
  return { prisma, state: () => ({ inventory, reservations, ledger }) };
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
  const writes: Array<{ objectKey: string; buffer: Buffer }> = [];
  const prisma = {
    fileAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => data
    }
  } as unknown as PrismaService;
  const storage = {
    createObjectKey: (ownerId: string) => `private/${ownerId}/object-1`,
    write: async (objectKey: string, buffer: Buffer) => { writes.push({ objectKey, buffer }); },
    remove: async () => undefined
  } as unknown as LocalObjectStorageService;
  const files = new FilesService(prisma, storage);
  const unsupportedFile: UploadedFilePayload = {
    originalname: "script.exe",
    mimetype: "application/octet-stream",
    size: 100,
    buffer: Buffer.from("unsafe")
  };

  await assert.rejects(
    () => files.create("user-1", { purpose: "product-media" }, unsupportedFile),
    (error: unknown) => error instanceof BadRequestException && error.message === "UNSUPPORTED_FILE_TYPE"
  );
  const asset = await files.create("user-1", { purpose: "product-media" }, {
    originalname: "cover.png",
    mimetype: "image/png",
    size: 100,
    buffer: Buffer.from("image")
  });
  assert.equal(asset.ownerId, "user-1");
  assert.equal(asset.objectKey, "private/user-1/object-1");
  assert.equal(asset.status, "READY");
  assert.equal(writes.length, 1);
});

test("file downloads keep private uploads protected and expose only published media", async () => {
  const prisma = {
    fileAsset: { findFirst: async () => ({ id: "file-1", ownerId: "owner-1", objectKey: "private/owner-1/file-1", mimeType: "image/png", sizeBytes: 5 }) },
    merchantMember: { count: async () => 0 },
    productMedia: { count: async () => 0 },
    store: { count: async () => 0 }
  } as unknown as PrismaService;
  const storage = { stream: async () => { throw new Error("private object must not be read"); } } as unknown as LocalObjectStorageService;
  const files = new FilesService(prisma, storage);
  await assert.rejects(
    () => files.download({ sub: "other-user", roles: ["CUSTOMER"] }, "file-1"),
    (error: unknown) => error instanceof ForbiddenException && error.message === "FILE_ACCESS_DENIED"
  );
  await assert.rejects(
    () => files.publicDownload("file-1"),
    (error: unknown) => error instanceof NotFoundException && error.message === "PUBLIC_FILE_NOT_FOUND"
  );
});

test("public catalog rejects inverted price ranges before querying products", async () => {
  const catalog = new CatalogService({} as PrismaService);
  await assert.rejects(
    () => catalog.searchProducts({ minPrice: 2000, maxPrice: 1000 }),
    (error: unknown) => error instanceof BadRequestException && error.message === "INVALID_PRICE_RANGE"
  );
});

test("inventory math rejects negative and oversold balances", () => {
  assert.deepEqual(applyInventoryDelta({ onHand: 10, reserved: 2, version: 4 }, -3, 1), { onHand: 7, reserved: 3, version: 5 });
  assert.throws(
    () => applyInventoryDelta({ onHand: 2, reserved: 0, version: 0 }, -3, 0),
    (error: unknown) => error instanceof InvalidInventoryMutationError && error.code === "NEGATIVE_INVENTORY"
  );
  assert.throws(
    () => applyInventoryDelta({ onHand: 3, reserved: 1, version: 0 }, 0, 3),
    (error: unknown) => error instanceof InvalidInventoryMutationError && error.code === "INSUFFICIENT_AVAILABLE_STOCK"
  );
});

test("inventory reservations lock, commit, and release stock with ledger entries", async () => {
  const committedStore = createInventoryPrisma();
  const committedService = new InventoryService(committedStore.prisma);
  await committedService.reserve("sku-1", "order-line-1", 3, new Date(Date.now() + 60_000));
  assert.equal(committedStore.state().inventory.onHand, 5);
  assert.equal(committedStore.state().inventory.reserved, 3);
  await committedService.commitReservation("sku-1", "order-line-1");
  assert.equal(committedStore.state().inventory.onHand, 2);
  assert.equal(committedStore.state().inventory.reserved, 0);
  assert.deepEqual(committedStore.state().ledger.map((entry) => entry.type), ["RESERVATION_CREATED", "RESERVATION_COMMITTED"]);

  const releasedStore = createInventoryPrisma();
  const releasedService = new InventoryService(releasedStore.prisma);
  await releasedService.reserve("sku-1", "order-line-2", 2, new Date(Date.now() + 60_000));
  await releasedService.releaseReservation("sku-1", "order-line-2", "订单取消");
  assert.equal(releasedStore.state().inventory.onHand, 5);
  assert.equal(releasedStore.state().inventory.reserved, 0);
});

test("inventory conditional updates prevent overselling and ledger failures roll back", async () => {
  const conflictedStore = createInventoryPrisma({ conflict: true });
  await assert.rejects(
    () => new InventoryService(conflictedStore.prisma).reserve("sku-1", "order-line-conflict", 4, new Date(Date.now() + 60_000)),
    (error: unknown) => error instanceof ConflictException && error.message === "INVENTORY_VERSION_CHANGED"
  );
  assert.equal(conflictedStore.state().inventory.reserved, 0);
  assert.equal(conflictedStore.state().reservations.length, 0);

  const rollbackStore = createInventoryPrisma({ failLedger: true });
  await assert.rejects(() => new InventoryService(rollbackStore.prisma).reserve("sku-1", "order-line-rollback", 2, new Date(Date.now() + 60_000)));
  assert.equal(rollbackStore.state().inventory.reserved, 0);
  assert.equal(rollbackStore.state().reservations.length, 0);
  assert.equal(rollbackStore.state().ledger.length, 0);
});

test("API errors preserve domain codes and use safe generic fallbacks", () => {
  assert.equal(resolveApiErrorCode(401, { message: "INVALID_CREDENTIALS", error: "Unauthorized" }), "INVALID_CREDENTIALS");
  assert.equal(resolveApiErrorCode(403, { message: "Permission denied", error: "Forbidden" }), "PERMISSION_DENIED");
  assert.equal(resolveApiErrorCode(400, { message: ["title must be a string"], error: "Bad Request" }), "VALIDATION_FAILED");
  assert.equal(resolveApiErrorCode(400, { message: "PRODUCT_REVIEW_INCOMPLETE:categoryId,media.cover" }), "PRODUCT_REVIEW_INCOMPLETE");
  assert.equal(resolveApiErrorCode(500, { message: "database connection details" }), "INTERNAL_ERROR");
});
