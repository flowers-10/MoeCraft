import type { SaveShippingAddressInput, ShippingAddressView } from "@moecraft/shared";

export function useAddresses() {
  const { request } = useApi();
  const addresses = useState<ShippingAddressView[]>("shipping-addresses", () => []);
  const pending = useState("shipping-addresses-pending", () => false);
  const error = useState<string | null>("shipping-addresses-error", () => null);

  async function load() {
    pending.value = true;
    error.value = null;
    try {
      addresses.value = await request<ShippingAddressView[]>("/addresses");
      return addresses.value;
    } catch {
      error.value = "收货地址加载失败，请稍后重试。";
      throw new Error(error.value);
    } finally {
      pending.value = false;
    }
  }

  async function create(input: SaveShippingAddressInput) {
    const created = await request<ShippingAddressView>("/addresses", { method: "POST", body: input });
    await load();
    return created;
  }

  async function update(id: string, input: Partial<SaveShippingAddressInput>) {
    const updated = await request<ShippingAddressView>(`/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
    await load();
    return updated;
  }

  async function remove(id: string) {
    await request<void>(`/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return { addresses, pending, error, load, create, update, remove };
}
