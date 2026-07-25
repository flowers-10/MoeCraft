# Database Migration Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the API from reporting ready against an outdated Prisma schema while automatically applying committed migrations during local development.

**Architecture:** Embed the latest required Prisma migration name in the API, verify it through `_prisma_migrations` during readiness, and statically compare it with the newest migration directory. Keep production migration deployment explicit, while local `predev` prepares Client and schema automatically.

**Tech Stack:** TypeScript, NestJS, Prisma 6, MySQL 8.4, Node.js test runner, pnpm, GitHub Actions.

## Global Constraints

- Do not modify historical migrations.
- Do not reset, truncate, or automatically roll back a database.
- Do not execute migrations from the production application startup command.
- Do not introduce dependencies or a new test framework.
- Preserve unrelated user changes in `apps/admin/src/views/merchant/MerchantLayout.vue`.

---

### Task 1: Make readiness migration-aware

**Files:**
- Create: `apps/api/src/prisma/schema-version.ts`
- Modify: `apps/api/src/app.service.ts`
- Modify: `packages/shared/src/api.ts`
- Test: `apps/api/test/api.test.ts`

**Interfaces:**
- Produces: `REQUIRED_DATABASE_MIGRATION: string`
- Produces: `AppReadiness.dependencies` with `{ database: "ok"; migrations: "ok" }`
- Consumes: Prisma `_prisma_migrations` table created by `prisma migrate deploy`

- [ ] **Step 1: Add failing readiness tests**

Update the existing readiness tests so the Prisma fake returns one row for the second `$queryRaw` call, asserts two probes, and asserts `dependencies.migrations === "ok"`. Add a test whose second query returns `[]` and assert `ServiceUnavailableException("READINESS_FAILED")`.

- [ ] **Step 2: Verify the new tests fail for the missing migration check**

Run:

```bash
pnpm --filter @moecraft/api test
```

Expected: the readiness success test fails because `migrations` is absent or only one query runs, and the missing-migration test fails because readiness incorrectly succeeds.

- [ ] **Step 3: Implement the migration contract and readiness query**

Create:

```ts
export const REQUIRED_DATABASE_MIGRATION = "20260723003000_g17_storefront_catalog";
```

In `AppService.getReadiness()`, keep `SELECT 1`, then query:

```ts
const applied = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
  SELECT migration_name
  FROM _prisma_migrations
  WHERE migration_name = ${REQUIRED_DATABASE_MIGRATION}
    AND finished_at IS NOT NULL
    AND rolled_back_at IS NULL
  LIMIT 1
`;
if (applied.length !== 1) throw new ServiceUnavailableException("READINESS_FAILED");
```

Return both dependency statuses. Keep the catch boundary so raw database errors are never exposed.

- [ ] **Step 4: Verify readiness tests and API test typecheck**

Run:

```bash
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/api test:typecheck
```

Expected: both commands exit 0.

---

### Task 2: Enforce schema-version synchronization

**Files:**
- Modify: `scripts/check-migrations.mjs`

**Interfaces:**
- Consumes: latest directory name under `apps/api/prisma/migrations`
- Consumes: `REQUIRED_DATABASE_MIGRATION` declared in `apps/api/src/prisma/schema-version.ts`
- Produces: a non-zero check result when the two values differ

- [ ] **Step 1: Demonstrate the current migration check cannot catch a stale API contract**

Run:

```bash
pnpm check:migrations
```

Expected before implementation: command succeeds without reading `schema-version.ts`.

- [ ] **Step 2: Add strict static contract validation**

Read directory entries, sort migration directory names, extract exactly one quoted value assigned to `REQUIRED_DATABASE_MIGRATION`, and fail with:

```text
REQUIRED_DATABASE_MIGRATION must match latest Prisma migration: <name>
```

The check must run before Prisma validate so it also works without a database.

- [ ] **Step 3: Verify the contract check**

Run:

```bash
pnpm check:migrations
```

Expected: exit 0 and print the existing schema/migration validation result.

---

### Task 3: Prepare local development and CI safely

**Files:**
- Modify: `apps/api/package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/operations/observability.md`
- Modify: `docs/operations/release.md`

**Interfaces:**
- Produces: `pnpm --filter @moecraft/api db:prepare`
- Preserves: production migration deployment as a separate release step

- [ ] **Step 1: Add local database preparation**

Change API scripts to:

```json
"predev": "pnpm db:prepare",
"db:prepare": "pnpm db:generate && pnpm db:deploy"
```

Keep `prebuild` and `pretypecheck` as `pnpm db:generate`.

- [ ] **Step 2: Add real migration deployment to CI**

Configure MySQL with `MYSQL_DATABASE: moecraft`, create `moecraft_shadow` before migration checks, then run:

```yaml
- run: pnpm --filter @moecraft/api db:deploy
- run: pnpm --filter @moecraft/api exec prisma migrate status
```

Do not add migration execution to the Docker entrypoint.

- [ ] **Step 3: Update operational documentation**

Document that local dev applies committed migrations, production runs `db:deploy` before rollout, and readiness returns 503 when the required migration is missing or incomplete.

- [ ] **Step 4: Verify configuration and docs**

Run:

```bash
pnpm format:check
pnpm lint
```

Expected: both commands exit 0.

---

### Task 4: Add a safe read-only functional smoke check

**Files:**
- Create: `scripts/api-functional-smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TARGET_URL`, defaulting to `http://127.0.0.1:3102`
- Consumes: optional `ALLOW_REMOTE_SMOKE=1`
- Produces: `pnpm api:functional-smoke`

- [ ] **Step 1: Write the smoke script**

Validate that remote targets require `ALLOW_REMOTE_SMOKE=1`. Request `/health`, `/readiness`, `/api/v1/catalog/public`, and `/api/v1/catalog/products?page=1&pageSize=1`; require HTTP 200 and API envelopes with `code === 0`.

- [ ] **Step 2: Run the smoke against the local API**

Run:

```bash
pnpm api:functional-smoke
```

Expected: four PASS lines and a zero exit code.

---

### Task 5: Full regression verification

**Files:**
- Verify all files above.

**Interfaces:**
- Produces: evidence that static checks, type contracts, runtime readiness, and the existing API suite agree.

- [ ] **Step 1: Run API and shared verification**

```bash
pnpm --filter @moecraft/shared typecheck
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/api test:typecheck
pnpm --filter @moecraft/api typecheck
pnpm --filter @moecraft/api build
```

- [ ] **Step 2: Run migration and repository checks**

```bash
pnpm check:migrations
pnpm format:check
pnpm lint
pnpm api:functional-smoke
```

- [ ] **Step 3: Audit the patch**

```bash
git diff --check
git status --short
```

Confirm no generated Client, environment file, object storage data, or unrelated admin change is staged or included.
