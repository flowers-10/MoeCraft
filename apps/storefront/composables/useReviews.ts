import type { ProductRatingSummary, ReviewView } from "@moecraft/shared";

export function useReviews() {
  const { request } = useApi();
  const list = (productId: string, page = 1) => request<{ items: ReviewView[]; meta: { page: number; pageSize: number; total: number } }>("/reviews/product/" + encodeURIComponent(productId) + "?page=" + page);
  const rating = (productId: string) => request<ProductRatingSummary>("/reviews/product/" + encodeURIComponent(productId) + "/rating");
  const create = (orderItemId: string, rating: number, content: string, images: string[]) => request<ReviewView>("/reviews", { method: "POST", body: { orderItemId, rating, content, images } });
  return { list, rating, create };
}
