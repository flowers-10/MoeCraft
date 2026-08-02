import { ref } from 'vue';
import type { AfterSaleListItem, AfterSaleView } from "@moecraft/shared";
import { apiRequest } from "../../../../api";

export function useAfterSaleManagement() {
  const items = ref<AfterSaleListItem[]>([]);
  const pending = ref(false);
  const error = ref("");
  async function list(status?: string) {
    pending.value = true; error.value = "";
    try {
      const params = status ? "?status=" + encodeURIComponent(status) : "";
      items.value = await apiRequest<AfterSaleListItem[]>("/admin/after-sales" + params);
    } catch { error.value = "售后列表加载失败"; }
    finally { pending.value = false; }
  }
  const get = (id: string) => apiRequest<AfterSaleView>("/admin/after-sales/" + encodeURIComponent(id));
  const review = (id: string, decision: "APPROVED" | "REJECTED", note: string) =>
    apiRequest<AfterSaleView>("/admin/after-sales/" + encodeURIComponent(id) + "/review", { method: "PATCH", body: JSON.stringify({ decision, note }) });
  const confirmReturned = (id: string) =>
    apiRequest<AfterSaleView>("/admin/after-sales/" + encodeURIComponent(id) + "/confirm-returned", { method: "PATCH" });
  const refund = (id: string, note: string) =>
    apiRequest<AfterSaleView>("/admin/after-sales/" + encodeURIComponent(id) + "/refund", { method: "PATCH", body: JSON.stringify({ note }) });
  const platformReview = (id: string, decision: "APPROVED" | "REJECTED", note: string) =>
    apiRequest<AfterSaleView>("/admin/after-sales/" + encodeURIComponent(id) + "/platform-review", { method: "PATCH", body: JSON.stringify({ decision, note }) });
  return { items, pending, error, list, get, review, confirmReturned, refund, platformReview };
}
