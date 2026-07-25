# Admin Image Upload Preview Design

## Goal

Complete the existing authenticated file-upload flow so merchant users can see product images, store logos, and store banners immediately after upload and again when reopening saved data.

## Scope

- Keep `LocalObjectStorageService` as the configured object store for this iteration.
- Do not invent a remote StoreAPI/S3 contract without an endpoint, credentials model, or provider protocol.
- Keep draft and merchant assets private; do not weaken `/files/public/:id`.
- Support JPEG, PNG, and WebP exactly as the current upload API does.
- Add no dependencies or test framework.

## Architecture

The admin API client will expose one authenticated raw-response path shared by JSON requests and file downloads. `downloadFileBlob(fileId)` will call the existing private `GET /files/:id` route, including token refresh and current request headers, then return a `Blob`.

An admin composable will own browser object URLs. It will:

- create an immediate preview from a newly selected `File`;
- fetch an existing private asset as a blob when a saved file ID is loaded;
- revoke replaced and unmounted object URLs to avoid memory leaks;
- ignore stale asynchronous downloads after an image is replaced.

Product media cards will render a preview for every image row. Store profile will add separate logo and banner upload controls, previews, progress/error state, and clear actions. Saving the store will continue to persist only `logoFileId` and `bannerFileId`.

## Data Flow

### New upload

1. User selects an image.
2. UI immediately creates an object URL and displays it.
3. UI uploads the file to `POST /files`.
4. On success, the returned file ID is assigned to the product media or store profile.
5. On failure, the previous file ID and preview are restored and a localized error is shown.

### Existing saved image

1. Product draft or store profile loads with a file ID.
2. The preview composable requests `GET /files/:id` with the current bearer token.
3. The response blob becomes an object URL rendered by `<img>`.
4. A failed private download shows the upload control without leaking a public URL.

### Public storefront

The storefront continues to use `/files/public/:id`. Existing publication checks remain unchanged: product media becomes public only for active products in an open store owned by an active merchant; store branding follows the corresponding store rule.

## Error Handling

- Upload failure preserves the previous persisted image and displays a localized upload error.
- Preview download failure does not clear persisted data; it displays a localized preview error so the user can retry by replacing the image.
- Clearing an image revokes its object URL and clears the corresponding file ID.
- Components revoke every owned object URL on unmount.

## Verification

- Existing API file authorization tests remain green.
- Admin and UI package typechecks pass.
- Admin production build passes.
- Manual browser verification covers immediate product preview, saved-draft preview, store logo/banner upload, save/reload preview, clear/replace, and mobile-width layout.

