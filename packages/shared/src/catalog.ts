export const CATALOG_ENTITY_TYPES = ["categories", "brands", "franchises", "characters", "tags", "attribute-templates"] as const;
export type CatalogEntityType = (typeof CATALOG_ENTITY_TYPES)[number];

export type CatalogTranslation = { nameZhCn: string; nameEnUs: string | null };
export type CatalogBaseView = CatalogTranslation & {
  id: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
export type CategoryView = CatalogBaseView & { parentId: string | null; descriptionZhCn: string | null; descriptionEnUs: string | null; children?: CategoryView[] };
export type BrandView = CatalogBaseView & { descriptionZhCn: string | null; descriptionEnUs: string | null };
export type FranchiseView = BrandView & { characterCount: number };
export type CharacterView = CatalogBaseView & { franchiseId: string; franchiseName: string };
export type TagView = CatalogBaseView;
export type AttributeTemplateView = Omit<CatalogBaseView, "slug" | "productCount"> & { code: string; categoryId: string | null; inputType: "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN"; options: string[]; isRequired: boolean };
export type PublicProductCard = { id: string; titleZhCn: string; titleEnUs: string | null; storeName: string; storeSlug: string; categoryName: string | null; brandName: string | null; franchiseName: string | null; priceAmount: number | null; currency: string; inStock: boolean };
export type CatalogOverview = { categories: CategoryView[]; brands: BrandView[]; franchises: FranchiseView[]; characters: CharacterView[]; tags: TagView[]; attributeTemplates: AttributeTemplateView[]; products: PublicProductCard[] };
