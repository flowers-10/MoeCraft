<script setup lang="ts">
import { computed, onMounted } from "vue";
import { UiBadge, UiButton, UiPageContainer, UiPageHeader, UiTable, UiToast, type UiTableColumn } from "@moecraft/ui";
import type { AdminButtonPermission, CouponView } from "@moecraft/shared";
import CouponCreateDialog from "./components/CouponCreateDialog.vue";
import { usePromotionManagement } from "./composables/usePromotionManagement";

const props = withDefaults(defineProps<{ buttonPermissions?: AdminButtonPermission[] }>(), { buttonPermissions: () => [] });
const state = usePromotionManagement();
const canManage = computed(() => props.buttonPermissions.includes("promotions.manage"));
const columns: UiTableColumn[] = [
  { key: "campaign", label: "优惠活动", width: "28%" }, { key: "rule", label: "规则", width: "20%" },
  { key: "period", label: "有效期", width: "20%" }, { key: "statistics", label: "领取 / 使用", width: "14%" },
  { key: "status", label: "状态", width: "8%" }, { key: "actions", label: "操作", width: "10%", align: "right" }
];
const rows = computed(() => state.coupons.value.map((coupon) => ({ ...coupon, campaign: coupon.id, rule: coupon.id, period: coupon.id, statistics: coupon.id, actions: coupon.id })));
const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const productScope = (row: Record<string, unknown>) => {
  const ids = Array.isArray(row.productIds) ? row.productIds : [];
  return ids.length ? `限定 ${ids.length} 件商品` : "全店适用";
};
onMounted(state.load);
</script>

<template>
  <UiPageContainer size="full" class="promotions content-scroll">
    <UiPageHeader eyebrow="PROMOTION ENGINE" title="优惠券" description="创建固定减免或百分比优惠，控制领取范围与限额，并追踪实际使用。">
      <template #actions><UiButton variant="secondary" @click="state.load">刷新</UiButton><UiButton v-if="canManage" @click="state.dialogOpen.value = true">创建优惠券</UiButton></template>
    </UiPageHeader>
    <UiToast :message="state.error.value" tone="error" @close="state.error.value = ''" />
    <section class="summary"><div><span>优惠券</span><b>{{ state.coupons.value.length }}</b></div><div><span>累计领取</span><b>{{ state.totals.value.claimed }}</b></div><div><span>累计使用</span><b>{{ state.totals.value.used }}</b></div><div><span>累计优惠</span><b>¥{{ state.totals.value.discount.toFixed(2) }}</b></div></section>
    <section class="panel">
      <div v-if="state.loading.value" class="loading">正在加载优惠活动…</div>
      <UiTable v-else :columns="columns" :rows="rows" empty-text="尚未创建优惠券">
        <template #cell-campaign="{ row }"><div class="campaign"><b>{{ row.name }}</b><small>{{ productScope(row) }}</small></div></template>
        <template #cell-rule="{ row }"><b>{{ row.type === "FIXED" ? `减 ¥${row.value}` : `${row.value}% OFF` }}</b><small>满 ¥{{ row.minimumAmount }} 可用 · 每人 {{ row.perUserLimit }} 张</small></template>
        <template #cell-period="{ row }"><small>{{ date(String(row.startsAt)) }}<br>至 {{ date(String(row.endsAt)) }}</small></template>
        <template #cell-statistics="{ row }"><b>{{ row.claimedCount }} / {{ row.usedCount }}</b><small>已优惠 ¥{{ row.discountTotal }}</small></template>
        <template #cell-status="{ row }"><UiBadge :tone="row.status === 'ACTIVE' ? 'success' : 'warning'">{{ row.status === "ACTIVE" ? "启用" : "暂停" }}</UiBadge></template>
        <template #cell-actions="{ row }"><UiButton v-if="canManage" size="sm" variant="ghost" :disabled="state.busy.value" @click="state.toggle(row as unknown as CouponView)">{{ row.status === "ACTIVE" ? "暂停" : "启用" }}</UiButton></template>
      </UiTable>
    </section>
    <Teleport to="body"><CouponCreateDialog v-if="state.dialogOpen.value" :busy="state.busy.value" @close="state.dialogOpen.value = false" @submit="state.create" /></Teleport>
  </UiPageContainer>
</template>

<style scoped lang="less">
.promotions{background:var(--app-bg)}.summary{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:18px;border-block:1px solid var(--border);background:var(--surface)}.summary div{display:grid;gap:5px;padding:18px 22px;border-right:1px solid var(--border)}.summary div:last-child{border:0}.summary span,.campaign small,td small{color:var(--text-muted);font-size:10px}.summary b{color:var(--text);font-size:22px}.panel{padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--surface);box-shadow:var(--shadow)}.campaign{display:grid;gap:4px}.campaign b{color:var(--text)}td b,td small{display:block}.loading{padding:50px;text-align:center}@media(max-width:700px){.summary{grid-template-columns:1fr 1fr}.summary div:nth-child(2){border-right:0}.panel{overflow-x:auto}}
</style>
