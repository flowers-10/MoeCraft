# Admin Image Upload Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete authenticated image upload and preview for product media and store branding in the merchant admin.

**Architecture:** Reuse the existing private file route through a raw authenticated admin API request, then manage temporary browser object URLs in a focused composable. Product and store views consume the composable without making draft assets public.

**Tech Stack:** Vue 3 Composition API, strict TypeScript, NestJS file API, browser Blob/Object URL APIs, pnpm.

## Global Constraints

- Preserve `/files/public/:id` authorization rules.
- Keep `LocalObjectStorageService` for this iteration.
- Do not add dependencies or a test framework.
- Preserve unrelated user changes in `apps/admin/src/views/merchant/MerchantLayout.vue`.

---

### Task 1: Authenticated binary download

**Files:**
- Modify: `apps/admin/src/api.ts`
- Verify: `apps/api/test/api.test.ts`

**Interfaces:**
- Produces: `apiFetch(path: string, init?: RequestInit): Promise<Response>`
- Produces: `downloadFileBlob(fileId: string, signal?: AbortSignal): Promise<Blob>`
- Preserves: `apiRequest<T>` JSON envelope behavior and refresh-token retry

- [ ] **Step 1: Confirm the private file authorization regression test passes**

Run:

```bash
pnpm --filter @moecraft/api test
```

Expected: `file downloads keep private uploads protected and expose only published media` passes.

- [ ] **Step 2: Extract authenticated response handling**

Move token header construction, one refresh retry, and non-OK error conversion from `apiRequest` into exported `apiFetch`. Keep `apiRequest` responsible only for parsing the API envelope.

- [ ] **Step 3: Add blob download**

Implement:

```ts
export async function downloadFileBlob(fileId: string, signal?: AbortSignal) {
  const response = await apiFetch(`/files/${encodeURIComponent(fileId)}`, { headers: { Accept: "image/*" }, signal });
  return response.blob();
}
```

- [ ] **Step 4: Verify API and admin contracts**

Run:

```bash
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/admin typecheck
```

Expected: both exit 0.

### Task 2: Object URL lifecycle composable

**Files:**
- Create: `apps/admin/src/composables/useFilePreview.ts`
- Modify: `apps/admin/src/views/commerce/products/components/ProductDraftDrawer.vue`

**Interfaces:**
- Produces: `useFilePreview()` with `previewUrl`, `previewError`, `showFile(file)`, `showFileId(fileId)`, and `clearPreview()`
- Consumes: `downloadFileBlob`

- [ ] **Step 1: Implement preview ownership**

Use one `ref<string>("")`, revoke the prior URL before replacement, and use an incrementing request generation plus `AbortController` so stale downloads cannot replace a newer selection.

- [ ] **Step 2: Integrate each product media row**

Keep previews keyed by the media row object, show a local preview before upload, restore the prior file ID/preview when upload fails, fetch saved file IDs when the drawer opens, and dispose previews when rows are removed or the drawer unmounts.

- [ ] **Step 3: Render accessible image previews**

Add an `<img>` above each `UiFileUpload`, use localized alt text with a safe fallback, and keep the existing cover/sort controls.

- [ ] **Step 4: Verify product editor**

Run:

```bash
pnpm --filter @moecraft/admin build
```

Expected: Vue typecheck and Vite build exit 0.

### Task 3: Store logo and banner upload

**Files:**
- Modify: `apps/admin/src/views/merchant/components/StoreManagement.vue`
- Modify: `apps/admin/src/locales/zh-CN.ts`
- Modify: `apps/admin/src/locales/en-US.ts`

**Interfaces:**
- Consumes: `uploadFile` and `useFilePreview`
- Persists: existing `logoFileId` and `bannerFileId` fields

- [ ] **Step 1: Add localized branding controls**

Add labels and messages for branding, logo, banner, upload hints, uploading, clear, upload failure, and preview failure in both locale files.

- [ ] **Step 2: Add store upload state**

Create independent preview/upload state for logo and banner. On load, resolve saved IDs through the private endpoint. On selection, preview immediately and upload with purposes `store-logo` and `store-banner`.

- [ ] **Step 3: Add profile UI**

Render responsive logo and banner cards with image previews, `UiFileUpload`, clear actions, and permission-aware disabled state before the existing textual profile fields.

- [ ] **Step 4: Verify store editor**

Run:

```bash
pnpm --filter @moecraft/ui typecheck
pnpm --filter @moecraft/admin build
```

Expected: both exit 0.

### Task 4: Runtime regression

**Files:**
- Verify all files above.

**Interfaces:**
- Produces: evidence for upload, private preview, persistence, and public access boundaries

- [ ] **Step 1: Run repository checks**

```bash
pnpm --filter @moecraft/api test
pnpm --filter @moecraft/ui typecheck
pnpm --filter @moecraft/admin build
pnpm format:check
pnpm lint
git diff --check
```

- [ ] **Step 2: Manually verify product media**

At `http://127.0.0.1:3101`, sign in as a merchant, create or edit a draft, select a valid image, confirm immediate preview, save, close, reopen, and confirm the private image reloads.

- [ ] **Step 3: Manually verify store branding**

Upload logo and banner, confirm previews, save, reload, replace one image, clear the other, and confirm persisted IDs match the visible state.

- [ ] **Step 4: Verify access boundary**

Confirm a draft file still returns 404 from `/files/public/:id`, while authenticated `/files/:id` returns the image. Confirm an eligible published product image remains available through the public route.

