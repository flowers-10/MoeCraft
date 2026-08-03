# G26-G31 End-to-End Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore storefront authentication and admin navigation, then verify the API, admin, and storefront G26-G31 flows against the repository acceptance manuals.

**Architecture:** Preserve the existing Nuxt/Vue/Nest boundaries and fix failures at their source: module resolution and imports in admin, session/API contracts in storefront, and domain/API behavior in Nest. Use the existing local database and deterministic smoke scripts; do not add a test framework or external service.

**Tech Stack:** pnpm 10, Turborepo, Nuxt 3, Vue 3/Vite, NestJS, Prisma, Node test runner.

## Global Constraints

- Keep changes within G26-G31 and authentication/navigation integration scope.
- Preserve unrelated working-tree changes and do not commit `.env`, generated output, credentials, or local databases.
- Use strict TypeScript and existing workspace dependencies.
- Run the minimum package checks after each fix and the full acceptance command matrix before delivery.

---

### Task 1: Reproduce and classify failures

**Files:**
- Read: `docs/testing/G26-ACCEPTANCE.md` through `docs/testing/G31-ACCEPTANCE.md`
- Read: three application manifests, routing, authentication, and API client files

- [x] **Step 1:** Capture `git status`, runtime versions, and existing user changes.
- [x] **Step 2:** Run API tests/build and both frontend builds independently.
- [x] **Step 3:** Record the failing admin imports, missing Vue imports, and package-link evidence.

### Task 2: Restore admin build and route loading

**Files:**
- Modify: `apps/admin/src/views/commerce/reviews/ReviewsView.vue`
- Modify: `apps/admin/src/views/system/reports/ReconciliationView.vue`
- Modify: `apps/admin/src/views/system/RiskView.vue`
- Possibly modify: workspace dependency metadata only if a clean install proves it is inconsistent

- [ ] **Step 1:** Keep the current failing admin build as the regression test.
- [ ] **Step 2:** Correct imports to the established `apps/admin/src/api.ts` pattern and explicitly import `watch` where used.
- [ ] **Step 3:** Repair dependency linking from the lockfile with `pnpm install --frozen-lockfile`; change metadata only if the lockfile and manifest disagree.
- [ ] **Step 4:** Run `pnpm --filter @moecraft/admin build` and verify route modules load.

### Task 3: Reproduce and restore storefront login

**Files:**
- Inspect/modify as evidence requires: `apps/storefront/composables/useAuthSession.ts`, login page, auth middleware, and API auth/session code
- Test: existing API authentication tests plus live local HTTP smoke

- [ ] **Step 1:** Deploy local migrations, seed the configured local admin safely, and start API/storefront.
- [ ] **Step 2:** Reproduce register/login/me/refresh/logout over HTTP and identify the failing boundary.
- [ ] **Step 3:** Add the smallest regression test supported by the existing Node test runner, then implement the root-cause fix.
- [ ] **Step 4:** Re-run the HTTP authentication flow and storefront build.

### Task 4: Exercise G26-G31 API and UI integration

**Files:**
- Modify only the G26-G31 service/controller/composable/view files implicated by reproducible failures
- Test: `scripts/api-functional-smoke.mjs`, package tests, acceptance endpoints, and frontend route requests

- [ ] **Step 1:** Apply migrations and run existing API functional smoke checks.
- [ ] **Step 2:** Exercise G26 shipping/tracking and G27 after-sales/refunds with isolated local data.
- [ ] **Step 3:** Exercise G28 reconciliation, G29 reviews, G30 favorites/notifications, and G31 risk/reports including role isolation and idempotency.
- [ ] **Step 4:** For each failure, add a focused regression test where the repository has an adjacent test pattern, implement one root-cause fix, and re-run the relevant flow.
- [ ] **Step 5:** Start all three dev servers and verify health/pages/routes respond without runtime module errors.

### Task 5: Full verification, commit, and push

**Files:**
- Review: all changed files and Git diff

- [ ] **Step 1:** Run shared typecheck, API tests/build, admin build, storefront build, root typecheck/build, migration check, secrets check, and functional smoke.
- [ ] **Step 2:** Confirm Git contains no credentials, `.env`, local database, or generated artifacts.
- [ ] **Step 3:** Review the final diff for scope and preserve the pre-existing shared-package changes if they are required for runtime compatibility.
- [ ] **Step 4:** Commit the verified patch and push `main` to `origin` as explicitly authorized.
