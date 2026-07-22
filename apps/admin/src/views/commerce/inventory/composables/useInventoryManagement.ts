import { computed, ref } from "vue";
import type { InventoryLedgerView, InventoryListItem } from "@moecraft/shared";
import { apiRequest, type ApiError } from "../../../../api";

function errorMessage(error: unknown) {
  const apiError = error as Partial<ApiError>;
  const messages: Record<string, string> = {
    NEGATIVE_INVENTORY: "库存调整后不能为负数。",
    INSUFFICIENT_AVAILABLE_STOCK: "调整后的总库存不能小于已锁定库存。",
    INVENTORY_VERSION_CHANGED: "库存已被其他操作更新，请刷新后重试。"
  };
  return messages[apiError.message ?? ""] ?? messages[apiError.code ?? ""] ?? "库存操作失败，请稍后重试。";
}

export function useInventoryManagement() {
  const items = ref<InventoryListItem[]>([]);
  const ledger = ref<InventoryLedgerView[]>([]);
  const selected = ref<InventoryListItem | null>(null);
  const loading = ref(false);
  const busy = ref(false);
  const drawerOpen = ref(false);
  const error = ref("");
  const keyword = ref("");
  const stockFilter = ref<"ALL" | "LOW" | "AVAILABLE" | "OUT">("ALL");

  const filtered = computed(() => {
    const query = keyword.value.trim().toLocaleLowerCase();
    return items.value.filter((item) => {
      const matchesQuery = !query || `${item.productTitle} ${item.skuName} ${item.skuCode}`.toLocaleLowerCase().includes(query);
      const matchesStock = stockFilter.value === "ALL"
        || (stockFilter.value === "LOW" && item.lowStock)
        || (stockFilter.value === "AVAILABLE" && item.available > 0)
        || (stockFilter.value === "OUT" && item.available === 0);
      return matchesQuery && matchesStock;
    });
  });
  const totals = computed(() => items.value.reduce((result, item) => ({
    onHand: result.onHand + item.onHand,
    reserved: result.reserved + item.reserved,
    available: result.available + item.available,
    low: result.low + (item.lowStock ? 1 : 0)
  }), { onHand: 0, reserved: 0, available: 0, low: 0 }));

  async function load() {
    loading.value = true;
    error.value = "";
    try { items.value = await apiRequest<InventoryListItem[]>("/merchant/inventory"); }
    catch (cause) { error.value = errorMessage(cause); }
    finally { loading.value = false; }
  }

  async function open(item: InventoryListItem) {
    selected.value = item;
    ledger.value = [];
    drawerOpen.value = true;
    try { ledger.value = await apiRequest<InventoryLedgerView[]>(`/merchant/inventory/${item.skuId}/ledger`); }
    catch (cause) { error.value = errorMessage(cause); }
  }

  async function save(payload: { delta: number; reason: string; lowStockThreshold: number }) {
    if (!selected.value) return;
    busy.value = true;
    error.value = "";
    try {
      let current = selected.value;
      if (payload.delta !== 0) {
        current = await apiRequest<InventoryListItem>(`/merchant/inventory/${current.skuId}/adjustments`, {
          method: "POST",
          body: JSON.stringify({ delta: payload.delta, reason: payload.reason, expectedVersion: current.version })
        });
      }
      if (payload.lowStockThreshold !== current.lowStockThreshold) {
        current = await apiRequest<InventoryListItem>(`/merchant/inventory/${current.skuId}/low-stock-threshold`, {
          method: "PATCH",
          body: JSON.stringify({ lowStockThreshold: payload.lowStockThreshold, expectedVersion: current.version })
        });
      }
      selected.value = current;
      ledger.value = await apiRequest<InventoryLedgerView[]>(`/merchant/inventory/${current.skuId}/ledger`);
      await load();
    } catch (cause) { error.value = errorMessage(cause); }
    finally { busy.value = false; }
  }

  return { items, ledger, selected, loading, busy, drawerOpen, error, keyword, stockFilter, filtered, totals, load, open, save };
}
