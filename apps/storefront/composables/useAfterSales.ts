import type { AfterSaleListItem, AfterSaleView } from "@moecraft/shared";

export function useAfterSales() {
  const { request } = useApi();
  const list = () => request<AfterSaleListItem[]>("/after-sales");
  const get = (id: string) => request<AfterSaleView>("/after-sales/" + encodeURIComponent(id));
  const create = (body: {
    orderItemId: string; type: string; reason: string; description: string; evidence: Array<{ fileIds: string[]; description: string }>;
  }) => request<AfterSaleView>("/after-sales", { method: "POST", body });
  const cancel = (id: string) => request<AfterSaleView>("/after-sales/" + encodeURIComponent(id) + "/cancel", { method: "PATCH" });
  const shipReturn = (id: string, carrier: string, trackingNumber: string) =>
    request<AfterSaleView>("/after-sales/" + encodeURIComponent(id) + "/ship-return", { method: "PATCH", body: { carrier, trackingNumber } });
  return { list, get, create, cancel, shipReturn };
}
