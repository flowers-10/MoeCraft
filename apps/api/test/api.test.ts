import { strict as assert } from "node:assert";
import { test } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";
import { assertMerchantScope, rolesHavePermissions } from "../src/auth/authorization";
import { resolveApiErrorCode } from "../src/http/api-error-code";
import { canTransitionProduct } from "../src/products/product-workflow";
import { PrismaService } from "../src/prisma/prisma.service";

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

test("product workflow accepts only declared status transitions", () => {
  assert.equal(canTransitionProduct("DRAFT", "PENDING_REVIEW"), true);
  assert.equal(canTransitionProduct("REJECTED", "PENDING_REVIEW"), true);
  assert.equal(canTransitionProduct("APPROVED", "ACTIVE"), true);
  assert.equal(canTransitionProduct("DRAFT", "ACTIVE"), false);
  assert.equal(canTransitionProduct("ARCHIVED", "DRAFT"), false);
});

test("API errors preserve domain codes and use safe generic fallbacks", () => {
  assert.equal(resolveApiErrorCode(401, { message: "INVALID_CREDENTIALS", error: "Unauthorized" }), "INVALID_CREDENTIALS");
  assert.equal(resolveApiErrorCode(403, { message: "Permission denied", error: "Forbidden" }), "PERMISSION_DENIED");
  assert.equal(resolveApiErrorCode(400, { message: ["title must be a string"], error: "Bad Request" }), "VALIDATION_FAILED");
  assert.equal(resolveApiErrorCode(400, { message: "PRODUCT_REVIEW_INCOMPLETE:categoryId,media.cover" }), "PRODUCT_REVIEW_INCOMPLETE");
  assert.equal(resolveApiErrorCode(500, { message: "database connection details" }), "INTERNAL_ERROR");
});
