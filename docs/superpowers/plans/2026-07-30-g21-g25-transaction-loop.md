# G21–G25 Transaction Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a durable checkout-to-payment transaction loop, split into independent G21 through G25 commits.

**Architecture:** A NestJS modular monolith owns server-authoritative facts in MySQL through Prisma. Shared framework-free contracts connect the API to Nuxt storefront and Vue admin; payment and jobs use provider/worker interfaces with durable sandbox implementations.

**Tech Stack:** TypeScript, NestJS, Prisma/MySQL, Node `node:test`, Nuxt 3, Vue 3, pnpm/Turborepo.

## Global Constraints

- G21 uses free shipping (`CNY 0.00`) while preserving shipping snapshot fields.
- Do not add Redis, a real payment provider, or a new test framework.
- Money contracts use two-decimal strings; clients never submit authoritative totals.
- Every write with side effects is idempotent and domain-scoped.
- Do not modify or commit `packages/ui/dist-docs/`.
- Each Harness group is implemented, verified, checked off, and committed separately.

---

### Task 1: Preserve the Node 24 runtime import fix

**Files:**
- Modify: `apps/api/src/promotions/promotion.dto.ts`

**Interfaces:**
- Consumes: `CouponType` as a type-only shared import.
- Produces: local runtime enum values for `class-validator`.

- [ ] Review the existing diff and confirm it removes the shared runtime import.
- [ ] Run `pnpm --filter @moecraft/api test` and `pnpm --filter @moecraft/api build`.
- [ ] Commit only `promotion.dto.ts` as `fix(api): avoid shared ESM runtime import`.

### Task 2: G21 checkout quotes

**Files:**
- Create: `packages/shared/src/checkout.ts`
- Create: `apps/api/src/checkout/checkout-domain.ts`
- Create: `apps/api/src/checkout/checkout.dto.ts`
- Create: `apps/api/src/checkout/checkout.service.ts`
- Create: `apps/api/src/checkout/checkout.controller.ts`
- Create: `apps/api/src/checkout/checkout.module.ts`
- Create: `apps/api/src/checkout/checkout-domain.test.ts`
- Create: `apps/api/prisma/migrations/20260730100000_g21_checkout_quotes/migration.sql`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/app.module.ts`
- Modify: `HARNESS.md`

**Interfaces:**
- Consumes: cart/catalog/inventory records and promotion quote calculations.
- Produces: `POST /checkout/quotes` and signed `CheckoutQuote`.

- [ ] Add failing tests for HMAC signature verification, expiry, and quote totals.
- [ ] Implement two-decimal totals, ten-minute expiry, versioned signatures, invalid reasons, and grouped quote contracts.
- [ ] Persist quotes and expose the customer-only controller.
- [ ] Run shared typecheck, API tests/build, and Prisma validation.
- [ ] Check G21 Harness items and commit `feat(checkout): implement quote and order preview`.

### Task 3: G22 atomic orders

**Files:**
- Create: `packages/shared/src/order.ts`
- Create: `apps/api/src/orders/order-domain.ts`
- Create: `apps/api/src/orders/order.dto.ts`
- Create: `apps/api/src/orders/order.service.ts`
- Create: `apps/api/src/orders/order.controller.ts`
- Create: `apps/api/src/orders/order.module.ts`
- Create: `apps/api/src/orders/order-domain.test.ts`
- Create: `apps/api/prisma/migrations/20260730110000_g22_orders/migration.sql`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/app.module.ts`
- Modify: `HARNESS.md`

**Interfaces:**
- Consumes: signed checkout quote, inventory reservation, coupon redemption.
- Produces: idempotent `POST /orders`, scoped order reads, cancel/confirm transitions, and pending payment intent.

- [ ] Add failing tests for transition rules, idempotency fingerprints, and public order number shape.
- [ ] Add order/payment snapshot schema and shared contracts.
- [ ] Implement serializable creation and scoped queries with stable conflict codes.
- [ ] Add transaction rollback/duplicate/timeout service tests with Prisma fakes where database infrastructure is unavailable.
- [ ] Run shared typecheck, API tests/build, Prisma validation, check G22, and commit `feat(order): implement atomic order creation and state machine`.

### Task 4: G23 sandbox payment

**Files:**
- Create: `packages/shared/src/payment.ts`
- Create: `apps/api/src/payments/payment-provider.ts`
- Create: `apps/api/src/payments/sandbox-payment.provider.ts`
- Create: `apps/api/src/payments/payment.service.ts`
- Create: `apps/api/src/payments/payment.controller.ts`
- Create: `apps/api/src/payments/payment.module.ts`
- Create: `apps/api/src/payments/payment-domain.test.ts`
- Create: `apps/api/prisma/migrations/20260730120000_g23_payment_events/migration.sql`
- Create: `apps/storefront/pages/payments/[orderId].vue`
- Create: `apps/storefront/composables/useOrders.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/app.module.ts`
- Modify: `HARNESS.md`

**Interfaces:**
- Consumes: pending order payment intent and raw sandbox events.
- Produces: provider create/query/close/refund/verify API, archived/idempotent webhooks, and recoverable storefront payment state.

- [ ] Add failing tests for signatures, duplicate events, amount/currency mismatch, and stale transitions.
- [ ] Implement the provider interface, sandbox adapter, event archive, and transaction state application.
- [ ] Add payment query/start/cancel/simulation endpoints and the polling storefront route.
- [ ] Run shared typecheck, API tests/build, storefront build, Prisma validation, check G23, and commit `feat(payment): add provider abstraction and sandbox payment`.

### Task 5: G24 buyer and admin order workflows

**Files:**
- Create: `apps/storefront/pages/checkout.vue`
- Create: `apps/storefront/pages/account/orders/index.vue`
- Create: `apps/storefront/pages/account/orders/[id].vue`
- Create: `apps/admin/src/views/commerce/orders/composables/useOrderManagement.ts`
- Replace: `apps/admin/src/views/commerce/orders/components/OrderBoard.vue`
- Modify: `apps/storefront/pages/cart.vue`
- Modify: `apps/storefront/pages/account.vue`
- Modify: `apps/admin/src/views/commerce/orders/OrdersView.vue`
- Modify: `HARNESS.md`

**Interfaces:**
- Consumes: checkout, order, payment, note, and export endpoints.
- Produces: real buyer/merchant/platform workflows without client payment mutations.

- [ ] Add checkout create/submit handling and account order navigation.
- [ ] Add order list/detail actions with pending/error/empty/success states.
- [ ] Replace fake admin data with scoped filters, detail, notes, and export job submission.
- [ ] Run storefront/admin builds and API contract checks, check G24, and commit `feat(order-ui): deliver buyer and merchant order workflows`.

### Task 6: G25 durable jobs and observability

**Files:**
- Create: `packages/shared/src/jobs.ts`
- Create: `apps/api/src/jobs/job-domain.ts`
- Create: `apps/api/src/jobs/job.service.ts`
- Create: `apps/api/src/jobs/job.worker.ts`
- Create: `apps/api/src/jobs/job.controller.ts`
- Create: `apps/api/src/jobs/job.module.ts`
- Create: `apps/api/src/jobs/job-domain.test.ts`
- Create: `apps/api/prisma/migrations/20260730130000_g25_jobs/migration.sql`
- Create: `apps/admin/src/views/system/jobs/JobsView.vue`
- Create: `docs/testing/G21-G25-ACCEPTANCE.md`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/observability/api-metrics.service.ts`
- Modify: admin routes/navigation/locales
- Modify: `HARNESS.md`

**Interfaces:**
- Consumes: expired orders, payment close, inventory release, and export requests.
- Produces: durable retry/dead-letter processing, privileged replay, failed-job admin view, commerce metrics/alerts, and acceptance instructions.

- [ ] Add failing tests for retry backoff, dead-letter threshold, and idempotent close results.
- [ ] Add persistent job schema, service, worker lifecycle, admin read/replay endpoints, and export handling.
- [ ] Add transaction metrics and alert thresholds without sensitive labels.
- [ ] Add the admin failed-job view and explicit manual acceptance document.
- [ ] Run API tests/build, shared typecheck, storefront/admin builds, root typecheck/build, Prisma validation, and inspect git diff for credentials/artifacts.
- [ ] Check G25 and commit `feat(jobs): automate payment timeout and inventory release`.
- [ ] Push `main` to `origin` and record the resulting commit range.
