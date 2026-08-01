# Product Rich Content, Keyboard Semantics, and SKU Images

## Goal

Upgrade product authoring and the storefront so merchants can create image-rich Chinese product descriptions, assign an optional image to each SKU, and use consistent keyboard behavior from shared UI primitives.

## Chosen design

- Use Tiptap 3 for Vue 3, `StarterKit`, and the official Image extension. `packages/ui` owns a controlled `UiRichTextEditor` wrapper; applications provide the upload callback.
- Keep `descriptionZhCn` as the existing API field for backward compatibility, but define its content as sanitized HTML. Existing plain text remains valid.
- Sanitize rich HTML in the API with an allowlist. Inline images carry `data-file-id`; the API validates merchant ownership and records referenced files in a dedicated product-description asset table so public file access is explicit.
- Add nullable `imageFileId` to `Sku`. SKU images are not product gallery media and never appear as gallery thumbnails or product-card covers.
- On the storefront, the selected SKU image overrides only the large primary image. Selecting a SKU without an image keeps the currently selected product media unchanged. Product media thumbnails remain independent.
- Native controls retain their browser keyboard semantics. Shared `UiSearchField` adds Enter-to-search and optional Escape-to-clear; shared `UiDialog` adds Escape-to-close, focus placement, focus restoration, and backdrop close. `UiRichTextEditor` inherits Tiptap formatting shortcuts. Existing custom overlays in the touched flows migrate to `UiDialog` or consume the same shared dialog behavior.

## Data flow

1. The admin uploads rich-text or SKU images through the existing file API using the `product-media` purpose.
2. `UiRichTextEditor` inserts an image node with a display URL and `data-file-id`.
3. Product create/update sanitizes HTML, extracts image IDs, validates all media/SKU/description files against the merchant, and writes product, SKU, description assets, and media in one transaction.
4. Public catalog responses expose sanitized rich HTML and SKU `imageFileId` values.
5. The storefront rewrites rich-text image URLs from `data-file-id` through its configured API base before rendering and applies the SKU-image priority rule without adding SKU images to `product.media`.

## Security and failure behavior

- Scripts, event handlers, inline styles, iframes, data URLs, and unknown elements/attributes are removed server-side.
- Description images without a valid merchant-owned `FileAsset` are rejected.
- A failed upload keeps the previous description/SKU image and shows a field-level error.
- Clearing a SKU image stores `null` and restores the existing product-media selection behavior.

## Verification

- API unit tests cover sanitization, description image extraction, and SKU/public projection.
- Prisma migration checks cover the new schema.
- Build/typecheck `@moecraft/shared`, `@moecraft/ui`, `@moecraft/api`, `@moecraft/admin`, and `@moecraft/storefront`; build UI docs after public component changes.
