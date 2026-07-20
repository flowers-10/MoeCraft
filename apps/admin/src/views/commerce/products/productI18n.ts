import type { ProductStatus } from "@moecraft/shared";
import type { MessageKey } from "../../../i18n";

export const productStatusKeys: Record<ProductStatus, MessageKey> = {
  DRAFT: "products.status.DRAFT",
  PENDING_REVIEW: "products.status.PENDING_REVIEW",
  APPROVED: "products.status.APPROVED",
  REJECTED: "products.status.REJECTED",
  ACTIVE: "products.status.ACTIVE",
  INACTIVE: "products.status.INACTIVE",
  ARCHIVED: "products.status.ARCHIVED"
};
