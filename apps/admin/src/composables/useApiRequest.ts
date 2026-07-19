import { computed, ref, type Ref } from "vue";
import type { PaginatedResult } from "@moecraft/shared";

export function useApiRequest<Data>(request: () => Promise<Data>) {
  const data = ref<Data | null>(null) as Ref<Data | null>;
  const loading = ref(false), error = ref<string | null>(null);
  async function execute() { loading.value = true; error.value = null; try { data.value = await request(); return data.value; } catch (cause) { error.value = cause instanceof Error ? cause.message : "REQUEST_FAILED"; throw cause; } finally { loading.value = false; } }
  return { data, loading, error, execute };
}

export function usePaginatedRequest<Item>(request: (page: number, pageSize: number) => Promise<PaginatedResult<Item>>, initialPageSize = 20) {
  const page = ref(1), pageSize = ref(initialPageSize);
  const state = useApiRequest(() => request(page.value, pageSize.value));
  const items = computed(() => state.data.value?.items ?? []);
  const pagination = computed(() => state.data.value?.pagination ?? { page: page.value, pageSize: pageSize.value, total: 0, totalPages: 0 });
  async function goTo(nextPage: number) { page.value = Math.max(1, nextPage); return state.execute(); }
  return { ...state, page, pageSize, items, pagination, goTo };
}
