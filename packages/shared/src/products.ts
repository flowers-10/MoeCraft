import type { ProductStatus } from "./statuses";

export type ProductMediaKind = "IMAGE" | "VIDEO";
export interface ProductMediaDraft { id?: string; fileId: string; kind: ProductMediaKind; altZhCn?: string; altEnUs?: string; sortOrder: number; isCover: boolean }
export interface ProductSkuDraft { id?: string; code?: string; nameZhCn: string; nameEnUs?: string; barcode?: string; optionValues: Record<string, string>; weightGrams?: number; lengthMm?: number; widthMm?: number; heightMm?: number; priceAmount: number; currency?: string; initialStock: number }
export interface ProductDraftInput { titleZhCn: string; titleEnUs?: string; descriptionZhCn?: string; descriptionEnUs?: string; categoryId?: string; brandId?: string; franchiseId?: string; characterId?: string; tagIds: string[]; material?: string; scale?: string; manufacturer?: string; copyrightNotice?: string; skus: ProductSkuDraft[]; media: ProductMediaDraft[] }
export interface ProductDraftView extends ProductDraftInput { id: string; storeId: string; status: ProductStatus; createdAt: string; updatedAt: string }
export interface ProductDraftListItem { id: string; titleZhCn: string; titleEnUs?: string; status: ProductStatus; categoryName?: string; skuCount: number; priceMin?: number; priceMax?: number; stock: number; coverFileId?: string; updatedAt: string }
export interface ProductFieldFeedback { field: string; message: string }
export interface ProductReviewEventView { id: string; actorId: string; fromStatus: ProductStatus; toStatus: ProductStatus; reason?: string; fieldFeedback: ProductFieldFeedback[]; createdAt: string }
export interface ProductReviewDetail extends ProductDraftView { storeName: string; reviewEvents: ProductReviewEventView[] }
export interface ProductReviewDecision { approved: boolean; reason?: string; fieldFeedback: ProductFieldFeedback[] }
