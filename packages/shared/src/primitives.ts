declare const entityIdBrand: unique symbol;

export type EntityId<Entity extends string = string> = string & {
  readonly [entityIdBrand]: Entity;
};

export type UserId = EntityId<"User">;
export type MerchantId = EntityId<"Merchant">;
export type StoreId = EntityId<"Store">;
export type ProductId = EntityId<"Product">;
export type SkuId = EntityId<"Sku">;
export type OrderId = EntityId<"Order">;
export type PaymentId = EntityId<"Payment">;

export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = ["CNY", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type Money = Readonly<{
  /** Integer amount in the currency's smallest unit, for example CNY fen. */
  amount: number;
  currency: Currency;
}>;

export type IsoDateTime = string;

export type LocalizedText = Partial<Record<SupportedLocale, string>> & {
  "zh-CN": string;
};

export type SortDirection = "asc" | "desc";

export type PageRequest = Readonly<{
  page: number;
  pageSize: number;
}>;

export type PageMeta = Readonly<{
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;

export type PageResponse<Item> = Readonly<{
  items: Item[];
  meta: PageMeta;
}>;
