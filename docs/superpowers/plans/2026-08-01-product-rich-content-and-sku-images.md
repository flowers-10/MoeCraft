# Product Rich Content and SKU Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver rich Chinese product descriptions, semantic keyboard interaction primitives, and independent SKU images with storefront priority behavior.

**Architecture:** Shared contracts carry HTML and nullable SKU file references. The API sanitizes HTML and persists explicit description-file references plus SKU image IDs. Shared Vue components encapsulate Tiptap, search, and dialog keyboard behavior; admin and storefront wire business upload and rendering rules around them.

**Tech Stack:** TypeScript, Vue 3, Tiptap 3, Nuxt 3, NestJS 11, Prisma 6, MySQL, sanitize-html.

## Global Constraints

- Preserve existing dirty worktree changes and do not modify unrelated behavior.
- Add no test framework; use the API's existing Node test runner and package build/typecheck commands.
- SKU images remain independent from product media.
- Rich HTML is sanitized before persistence and public rendering.

---

### Task 1: Rich-text security and persistence contract

**Files:**
- Create: `apps/api/src/products/product-rich-text.test.ts`
- Create: `apps/api/src/products/product-rich-text.ts`
- Modify: `apps/api/package.json`
- Modify: `packages/shared/src/products.ts`
- Modify: `packages/shared/src/catalog.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801150000_product_rich_content_sku_images/migration.sql`

**Interfaces:**
- Produces: `sanitizeProductRichText(html: string): string` and `extractProductDescriptionFileIds(html: string): string[]`.
- Produces: nullable `imageFileId` on draft/public SKU contracts.

- [ ] Write Node tests asserting scripts/event attributes are removed and unique `data-file-id` values are extracted.
- [ ] Run the focused test and confirm it fails because the module is absent.
- [ ] Implement the allowlist sanitizer and extractor, then rerun the focused test.
- [ ] Extend Prisma/shared contracts and add a forward-only migration for `Sku.imageFileId` and `ProductDescriptionAsset`.

### Task 2: Product API write/read behavior

**Files:**
- Modify: `apps/api/src/products/product.dto.ts`
- Modify: `apps/api/src/products/product.service.ts`
- Modify: `apps/api/src/catalog/catalog.service.ts`
- Modify: `apps/api/src/files/files.service.ts`

**Interfaces:**
- Consumes: sanitizer/extractor and `imageFileId` contracts from Task 1.
- Produces: validated product drafts and public SKU/description-image access.

- [ ] Add failing service-focused assertions for sanitized persisted HTML and SKU file projection using existing API test patterns.
- [ ] Validate all product, SKU, and description file IDs as merchant-owned `product-media` assets.
- [ ] Sanitize description HTML before create/update, synchronize description asset rows transactionally, and include SKU images in create/update/copy/view.
- [ ] Permit public download when a file is referenced by an active SKU or product description.
- [ ] Run API tests, typecheck, and build.

### Task 3: Shared keyboard and rich editor primitives

**Files:**
- Create: `packages/ui/src/components/UiDialog.vue`
- Create: `packages/ui/src/components/UiSearchField.vue`
- Create: `packages/ui/src/components/UiRichTextEditor.vue`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/docs/src/catalog.ts`

**Interfaces:**
- Produces: `UiDialog` with Escape/focus behavior, `UiSearchField` with submit/clear events, and controlled `UiRichTextEditor` with `uploadImage(file)` callback.

- [ ] Install official Tiptap Vue, ProseMirror, StarterKit, and Image packages.
- [ ] Implement typed controlled components using native semantics and focus-visible styling.
- [ ] Document every new public component and keyboard behavior.
- [ ] Run UI typecheck and docs build.

### Task 4: Admin product authoring

**Files:**
- Modify: `apps/admin/src/views/commerce/products/components/ProductDraftDrawer.vue`
- Modify: `apps/admin/src/views/commerce/products/composables/useProductManagement.ts`
- Modify: `apps/admin/src/locales/zh-CN.ts`
- Modify: `apps/admin/src/locales/en-US.ts`

**Interfaces:**
- Consumes: shared editor/dialog/file upload components and SKU `imageFileId`.
- Produces: rich Chinese description editing and per-SKU optional image upload/clear/preview.

- [ ] Replace the Chinese textarea with `UiRichTextEditor`, using the existing upload API and public file URL.
- [ ] Add per-SKU image upload state, preview, clear, and error handling without adding entries to product media.
- [ ] Preserve IDs in draft reset/payload and update validation copy from “中文描述” to “图文描述”.
- [ ] Run the admin build.

### Task 5: Storefront priority behavior and rich rendering

**Files:**
- Modify: `apps/storefront/pages/products/[id].vue`

**Interfaces:**
- Consumes: public SKU `imageFileId`, product media, and sanitized description HTML.
- Produces: `SKU image > current product media` primary-image behavior while thumbnails remain product-media-only.

- [ ] Derive the primary image from selected SKU only when `imageFileId` exists.
- [ ] Keep `selectedMediaId` unchanged when selecting a SKU with no image; keep SKU images out of thumbnails.
- [ ] Rewrite rich-text `data-file-id` image sources through the configured API base and render the sanitized HTML.
- [ ] Run the storefront build and final cross-package verification.
