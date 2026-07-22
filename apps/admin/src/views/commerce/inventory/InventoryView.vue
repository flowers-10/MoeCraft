<script setup lang="ts">
import { computed, onMounted } from "vue";
import { UiBadge, UiButton, UiPageContainer, UiPageHeader, UiTable, UiToast, type UiTableColumn } from "@moecraft/ui";
import type { AdminButtonPermission, InventoryListItem } from "@moecraft/shared";
import { useLocale } from "../../../i18n";
import InventoryAdjustmentDrawer from "./components/InventoryAdjustmentDrawer.vue";
import { useInventoryManagement } from "./composables/useInventoryManagement";

const props = withDefaults(defineProps<{ buttonPermissions?: AdminButtonPermission[] }>(), { buttonPermissions: () => [] });
const { t } = useLocale();
const state = useInventoryManagement();
const canAdjust = computed(() => props.buttonPermissions.includes("inventory.adjust"));
const columns = computed<UiTableColumn[]>(() => [
  { key: "sku", label: t("inventory.sku"), width: "34%" },
  { key: "available", label: t("inventory.available"), width: "11%", align: "right" },
  { key: "reserved", label: t("inventory.reserved"), width: "11%", align: "right" },
  { key: "onHand", label: t("inventory.onHand"), width: "11%", align: "right" },
  { key: "threshold", label: t("inventory.threshold"), width: "13%", align: "right" },
  { key: "status", label: t("inventory.status"), width: "10%" },
  { key: "actions", label: t("inventory.actions"), width: "10%", align: "right" }
]);
onMounted(state.load);
</script>

<template>
  <UiPageContainer size="full" class="inventory-page content-scroll">
    <UiPageHeader eyebrow="STOCK CONTROL" :title="t('inventory.title')" :description="t('inventory.subtitle')"><template #actions><UiButton variant="secondary" @click="state.load">{{ t('common.refresh') }}</UiButton></template></UiPageHeader>
    <UiToast :message="state.error.value" tone="error" @close="state.error.value = ''" />
    <section class="summary"><div><span>{{ t('inventory.available') }}</span><b>{{ state.totals.value.available }}</b></div><div><span>{{ t('inventory.reserved') }}</span><b>{{ state.totals.value.reserved }}</b></div><div><span>{{ t('inventory.onHand') }}</span><b>{{ state.totals.value.onHand }}</b></div><div :class="{ alert: state.totals.value.low > 0 }"><span>{{ t('inventory.lowStock') }}</span><b>{{ state.totals.value.low }}</b></div></section>
    <section class="panel">
      <div class="filters"><input v-model="state.keyword.value" :placeholder="t('inventory.search')"><select v-model="state.stockFilter.value"><option value="ALL">{{ t('inventory.filterAll') }}</option><option value="LOW">{{ t('inventory.filterLow') }}</option><option value="AVAILABLE">{{ t('inventory.filterAvailable') }}</option><option value="OUT">{{ t('inventory.filterOut') }}</option></select></div>
      <div v-if="state.loading.value" class="loading">{{ t('inventory.loading') }}</div>
      <UiTable v-else :columns="columns" :rows="state.filtered.value.map(item => ({ ...item, sku: item.skuId, threshold: item.lowStockThreshold, status: item.lowStock, actions: item.skuId }))" :empty-text="t('inventory.empty')">
        <template #cell-sku="{ row }"><div class="sku-name"><b>{{ row.productTitle }}</b><span>{{ row.skuName }} · {{ row.skuCode }}</span></div></template>
        <template #cell-available="{ row }"><b class="number">{{ row.available }}</b></template>
        <template #cell-reserved="{ row }">{{ row.reserved }}</template>
        <template #cell-onHand="{ row }">{{ row.onHand }}</template>
        <template #cell-threshold="{ row }">≤ {{ row.lowStockThreshold }}</template>
        <template #cell-status="{ row }"><UiBadge :tone="row.lowStock ? 'warning' : 'success'">{{ row.lowStock ? t('inventory.low') : t('inventory.healthy') }}</UiBadge></template>
        <template #cell-actions="{ row }"><UiButton size="sm" variant="ghost" @click="state.open(row as unknown as InventoryListItem)">{{ canAdjust ? t('inventory.manage') : t('inventory.view') }}</UiButton></template>
      </UiTable>
    </section>
    <Teleport to="body"><InventoryAdjustmentDrawer v-if="state.drawerOpen.value && state.selected.value" :item="state.selected.value" :ledger="state.ledger.value" :busy="state.busy.value" :can-adjust="canAdjust" @save="state.save" @close="state.drawerOpen.value = false" /></Teleport>
  </UiPageContainer>
</template>

<style scoped lang="less">
.inventory-page{background:var(--app-bg)}.summary{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:18px;border-block:1px solid var(--border);background:var(--surface)}.summary div{display:grid;gap:5px;padding:18px 22px;border-right:1px solid var(--border)}.summary div:last-child{border:0}.summary span{color:var(--text-muted);font-size:10px}.summary b{font-size:23px}.summary .alert b{color:var(--warning)}.panel{padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--surface);box-shadow:var(--shadow)}.filters{display:flex;gap:10px;margin-bottom:16px}.filters input{flex:1}.filters input,.filters select{min-height:39px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface-raised);color:var(--text)}.sku-name{display:grid;gap:4px}.sku-name b{color:var(--text)}.sku-name span{color:var(--text-muted);font-size:10px}.number{color:var(--text);font-size:14px}.loading{padding:50px;text-align:center;color:var(--text-muted)}@media(max-width:700px){.summary{grid-template-columns:1fr 1fr}.summary div:nth-child(2){border-right:0}.filters{flex-direction:column}}
</style>
