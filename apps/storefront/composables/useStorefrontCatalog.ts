import type { ApiResponse } from "@moecraft/shared";

export function useStorefrontCatalog() {
  const config = useRuntimeConfig();
  const apiBase = String(config.public.apiBase).replace(/\/$/, "");
  function request<T>(path: string) {
    return $fetch<ApiResponse<T>>(`${apiBase}${path}`).then((response) => response.resultData);
  }
  function mediaUrl(fileId: string | null | undefined) {
    return fileId ? `${apiBase}/files/public/${encodeURIComponent(fileId)}` : "";
  }
  function money(amount: number | null, currency = "CNY") {
    return amount === null ? "价格待公布" : new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(amount / 100);
  }
  return { request, mediaUrl, money };
}
