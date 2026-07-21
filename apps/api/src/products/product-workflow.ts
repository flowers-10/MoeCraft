import type { ProductStatus } from "@moecraft/shared";

export const PRODUCT_TRANSITIONS: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
  DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "DRAFT", "ARCHIVED"],
  REJECTED: ["PENDING_REVIEW", "ARCHIVED"],
  ACTIVE: ["INACTIVE"],
  INACTIVE: ["ACTIVE", "DRAFT", "ARCHIVED"],
  ARCHIVED: []
};

export function canTransitionProduct(from: ProductStatus, to: ProductStatus): boolean {
  return PRODUCT_TRANSITIONS[from].includes(to);
}
