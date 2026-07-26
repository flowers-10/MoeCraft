import type { ApiResponse, CartView } from "@moecraft/shared";

type AddPayload = { skuId: string; quantity: number; selected?: boolean };
type UpdatePayload = { quantity?: number; selected?: boolean };

export function useCart() {
  const config = useRuntimeConfig();
  const session = useAuthSession();
  const apiBase = String(config.public.apiBase).replace(/\/$/, "");
  const guestToken = useCookie<string | null>("mc-guest-cart", { sameSite: "lax", secure: !import.meta.dev, maxAge: 60 * 60 * 24 * 60 });
  const cart = useState<CartView | null>("cart-state", () => null);
  const pending = useState<boolean>("cart-pending", () => false);
  const lastError = useState<string>("cart-error", () => "");

  if (!guestToken.value) {
    // Stable anonymous identifier so the guest cart survives refreshes.
    guestToken.value = "g_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function headers(): Record<string, string> {
    const base: Record<string, string> = { "X-Guest-Token": guestToken.value ?? "" };
    if (session.accessToken.value) base.Authorization = `Bearer ${session.accessToken.value}`;
    return base;
  }

  async function refresh() {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart`, { headers: headers() }).then((r) => r.resultData);
    } catch {
      lastError.value = "CART_LOAD_FAILED";
    } finally {
      pending.value = false;
    }
    return cart.value;
  }

  async function add(payload: AddPayload) {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/items`, {
        method: "POST",
        headers: headers(),
        body: payload
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_UPDATE_FAILED";
      throw error;
    } finally {
      pending.value = false;
    }
  }

  async function update(itemId: string, payload: UpdatePayload) {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: headers(),
        body: payload
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_UPDATE_FAILED";
      throw error;
    } finally {
      pending.value = false;
    }
  }

  async function remove(itemId: string) {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
        headers: headers()
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_UPDATE_FAILED";
      throw error;
    } finally {
      pending.value = false;
    }
  }

  async function selectItems(itemIds: string[], selected: boolean) {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/items/selection`, {
        method: "PUT",
        headers: headers(),
        body: { itemIds, selected }
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_UPDATE_FAILED";
      throw error;
    } finally {
      pending.value = false;
    }
  }

  async function clearInvalid() {
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/items`, {
        method: "DELETE",
        headers: headers()
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_UPDATE_FAILED";
      throw error;
    } finally {
      pending.value = false;
    }
  }

  /**
   * Called right after login. The server reads the guest cart by token and
   * folds it into the user cart, then deletes the guest cart. Nothing the
   * visitor accumulated is lost, and merge notices tell the user what changed.
   */
  async function mergeGuest() {
    if (!session.accessToken.value) return refresh();
    pending.value = true;
    lastError.value = "";
    try {
      cart.value = await $fetch<ApiResponse<CartView>>(`${apiBase}/cart/merge-guest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken.value}`, "X-Guest-Token": guestToken.value ?? "" }
      }).then((r) => r.resultData);
      return cart.value;
    } catch (error) {
      lastError.value = (error as { data?: { code?: string } })?.data?.code ?? "CART_MERGE_FAILED";
      return refresh();
    } finally {
      pending.value = false;
    }
  }

  const itemCount = computed(() => cart.value?.itemCount ?? 0);
  const groups = computed(() => cart.value?.groups ?? []);
  const selectedAmount = computed(() => cart.value?.selectedAmount ?? 0);
  const invalidCount = computed(() => cart.value?.invalidCount ?? 0);

  return { cart, pending, lastError, guestToken, refresh, add, update, remove, selectItems, clearInvalid, mergeGuest, itemCount, groups, selectedAmount, invalidCount };
}
