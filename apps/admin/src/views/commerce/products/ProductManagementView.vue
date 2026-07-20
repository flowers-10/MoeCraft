<script setup lang="ts">
import { computed, onMounted } from "vue";
import { UiButton, UiPageContainer, UiPageHeader, UiTable, UiToast, type UiTableColumn } from "@moecraft/ui";
import type { AdminButtonPermission, ProductStatus } from "@moecraft/shared";
import { useLocale } from "../../../i18n";
import ProductDraftDrawer from "./components/ProductDraftDrawer.vue";
import { useProductManagement } from "./composables/useProductManagement";
import { productStatusKeys } from "./productI18n";

const props = withDefaults(defineProps<{ buttonPermissions?: AdminButtonPermission[] }>(), { buttonPermissions: () => [] });
const { locale, t } = useLocale();
const state = useProductManagement();
const statusOptions: ProductStatus[] = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"];
const columns = computed<UiTableColumn[]>(() => [
  { key: "product", label: t("products.columnProduct"), width: "29%" },
  { key: "status", label: t("products.columnStatus"), width: "11%" },
  { key: "sku", label: t("products.columnSkuStock"), width: "14%" },
  { key: "price", label: t("products.columnPrice"), width: "14%" },
  { key: "updated", label: t("products.columnUpdated"), width: "13%" },
  { key: "actions", label: t("products.columnActions"), width: "19%", align: "right" }
]);

const canManage = () => props.buttonPermissions.includes("products.manage");
const canSubmit = () => props.buttonPermissions.includes("products.submit");
function statusLabel(value: unknown) { const key = productStatusKeys[value as ProductStatus]; return key ? t(key) : String(value); }
function money(value?: number) { return value === undefined ? "—" : new Intl.NumberFormat(locale.value, { style: "currency", currency: "CNY" }).format(value / 100); }
function formatDate(value: unknown) { return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(value))); }
function productTitle(row: Record<string, unknown>) {
  const zhCn = String(row.titleZhCn ?? "");
  const enUs = String(row.titleEnUs ?? "");
  return locale.value === "en-US" ? enUs || zhCn : zhCn || enUs;
}
function productSubtitle(row: Record<string, unknown>) {
  const zhCn = String(row.titleZhCn ?? "");
  const enUs = String(row.titleEnUs ?? "");
  const category = String(row.categoryName ?? "");
  return (locale.value === "en-US" ? (enUs ? zhCn : category) : enUs || category) || t("products.incomplete");
}

onMounted(state.load);
</script>

<template>
  <UiPageContainer size="full" class="product-page content-scroll">
    <UiPageHeader eyebrow="PRODUCT STUDIO" :title="t('products.title')" :description="t('products.subtitle')">
      <template #actions><UiButton v-if="canManage()" @click="state.create">＋ {{ t('products.newDraft') }}</UiButton></template>
    </UiPageHeader>
    <UiToast :message="state.error.value" tone="error" @close="state.error.value = ''" />
    <section class="panel">
      <div class="filters">
        <input v-model="state.keyword.value" :placeholder="t('products.searchPlaceholder')">
        <select v-model="state.status.value">
          <option value="ALL">{{ t('products.allStatuses') }}</option>
          <option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </div>
      <div v-if="state.loading.value" class="loading">{{ t('products.loading') }}</div>
      <UiTable
        v-else
        :columns="columns"
        :rows="state.filtered.value.map(item => ({ ...item, product: item.titleZhCn, sku: item.skuCount, price: item.priceMin, updated: item.updatedAt, actions: item.id }))"
        :empty-text="t('products.empty')"
      >
        <template #cell-product="{ row }"><div class="name"><b>{{ productTitle(row) }}</b><small>{{ productSubtitle(row) }}</small></div></template>
        <template #cell-status="{ row }"><em :class="String(row.status).toLowerCase()">{{ statusLabel(row.status) }}</em></template>
        <template #cell-sku="{ row }">{{ t('products.skuStock', { sku: Number(row.skuCount), stock: Number(row.stock) }) }}</template>
        <template #cell-price="{ row }">{{ money(row.priceMin as number | undefined) }}<span v-if="row.priceMax !== row.priceMin"> – {{ money(row.priceMax as number | undefined) }}</span></template>
        <template #cell-updated="{ row }">{{ formatDate(row.updatedAt) }}</template>
        <template #cell-actions="{ row }">
          <div class="actions">
            <UiButton size="sm" variant="ghost" @click="state.edit(row.id as string)">{{ t('products.viewEdit') }}</UiButton>
            <UiButton v-if="canSubmit() && ['DRAFT', 'REJECTED'].includes(row.status as string)" size="sm" @click="state.action(row.id as string, 'submit')">{{ t('products.submitReview') }}</UiButton>
            <UiButton v-if="canManage() && ['APPROVED', 'INACTIVE'].includes(row.status as string)" size="sm" @click="state.action(row.id as string, 'publish')">{{ t('products.publish') }}</UiButton>
            <UiButton v-if="canManage() && row.status === 'ACTIVE'" size="sm" variant="secondary" @click="state.action(row.id as string, 'unpublish')">{{ t('products.unpublish') }}</UiButton>
            <UiButton v-if="canManage()" size="sm" variant="secondary" @click="state.action(row.id as string, 'copy')">{{ t('products.copy') }}</UiButton>
            <UiButton v-if="canManage() && ['DRAFT', 'REJECTED', 'INACTIVE'].includes(row.status as string)" size="sm" variant="danger" @click="state.archive(row.id as string)">{{ t('products.archive') }}</UiButton>
          </div>
        </template>
      </UiTable>
    </section>
    <Teleport to="body">
      <ProductDraftDrawer
        v-if="state.drawerOpen.value"
        :model-value="state.form"
        :catalog="state.catalog.value"
        :review-events="state.reviewEvents.value"
        :editing="Boolean(state.editingId.value)"
        :editable="state.editable.value"
        :busy="state.busy.value"
        @save="state.save"
        @close="state.drawerOpen.value = false"
      />
    </Teleport>
  </UiPageContainer>
</template>

<style scoped lang="less">.product-page{background:var(--app-bg)}.panel{padding:20px;border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow)}.filters{display:flex;gap:10px;margin-bottom:16px}.filters input{flex:1}.filters input,.filters select{padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface-raised);color:var(--text)}.name{display:grid}.name b{color:var(--text)}.name small{margin-top:3px;color:var(--text-muted)}em{padding:5px 8px;border-radius:99px;background:var(--accent-soft);color:var(--accent);font-size:9px;font-style:normal}.rejected{background:#ffe4eb;color:#c43d5c}.active{background:#dff7ef;color:#128562}.actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.error{padding:12px;border-radius:10px;background:#ffe4eb;color:#be3c59}.loading{padding:50px;text-align:center}@media(max-width:650px){.filters{flex-direction:column}}</style>
