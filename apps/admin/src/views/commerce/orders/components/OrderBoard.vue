<script setup lang="ts">
import { onMounted, reactive } from "vue";
import type { AdminButtonPermission, OrderStatus } from "@moecraft/shared";
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDialog,
  UiField,
  UiForm,
  UiSearchField,
  UiTable,
  UiTextarea,
  type UiTableColumn,
} from "@moecraft/ui";
import { useOrderManagement } from "../composables/useOrderManagement";
import ShipmentPanel from "./ShipmentPanel.vue";

const props = withDefaults(defineProps<{ buttonPermissions?: AdminButtonPermission[] }>(), {
  buttonPermissions: () => [],
});
const state = useOrderManagement();
const noteForm = reactive({ note: "" });
const canManage = props.buttonPermissions.includes("orders.manage");
const statuses: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "PENDING_PAYMENT", label: "待支付" },
  { value: "PAID", label: "待发货" },
  { value: "PARTIALLY_SHIPPED", label: "部分发货" },
  { value: "SHIPPED", label: "已发货" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "AFTER_SALE", label: "售后中" },
  { value: "CLOSED", label: "已关闭" },
];
const columns: UiTableColumn[] = [
  { key: "order", label: "订单" },
  { key: "buyer", label: "买家" },
  { key: "stores", label: "店铺" },
  { key: "amount", label: "应付", align: "right" },
  { key: "payment", label: "支付" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作", align: "right" },
];

async function open(id: string) {
  await state.open(id);
  noteForm.note = state.selected.value?.merchantOrders[0]?.merchantNote ?? "";
}

function close() {
  state.selected.value = null;
  noteForm.note = "";
}

async function save() {
  const child = state.selected.value?.merchantOrders[0];
  const note = noteForm.note.trim();
  if (!child || !note) return;
  await state.saveNote(child.id, note);
  noteForm.note = state.selected.value?.merchantOrders[0]?.merchantNote ?? note;
}

const tone = (status: string) => status === "SUCCEEDED" || status === "COMPLETED"
  ? "success"
  : status === "FAILED" || status === "CANCELLED"
    ? "danger"
    : "warning";

onMounted(state.load);
</script>

<template>
  <section class="orders">
    <div class="filters">
      <UiSearchField v-model="state.search.value" placeholder="搜索订单号" search-label="查询" @search="state.load" />
      <select v-model="state.status.value" aria-label="订单状态">
        <option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <UiButton variant="secondary" :disabled="state.busy.value" @click="state.createExport">异步导出 CSV</UiButton>
    </div>

    <p v-if="state.error.value" class="notice">{{ state.error.value }}</p>
    <div v-if="state.loading.value" class="loading">正在加载订单…</div>
    <UiTable
      v-else
      :columns="columns"
      :rows="state.orders.value.map(row => ({ ...row, paymentStatus: row.payment.status, order: row.id, buyer: row.id, stores: row.id, amount: row.id, actions: row.id }))"
      empty-text="没有符合条件的订单"
    >
      <template #cell-order="{ row }"><b>{{ row.orderNumber }}</b><small>{{ new Date(String(row.createdAt)).toLocaleString() }}</small></template>
      <template #cell-buyer="{ row }"><span>{{ row.buyerDisplayName }}</span><small>{{ row.buyerMaskedPhone }}</small></template>
      <template #cell-stores="{ row }">{{ Array.isArray(row.storeNames) ? row.storeNames.join(" / ") : "" }}</template>
      <template #cell-amount="{ row }"><b>¥{{ row.payableAmount }}</b></template>
      <template #cell-payment="{ row }"><UiBadge :tone="tone(String(row.paymentStatus))">{{ row.paymentStatus }}</UiBadge></template>
      <template #cell-status="{ row }"><UiBadge :tone="tone(String(row.status))">{{ row.status }}</UiBadge></template>
      <template #cell-actions="{ row }"><UiButton size="sm" variant="ghost" @click="open(String(row.id))">详情</UiButton></template>
    </UiTable>

    <UiDialog
      :model-value="Boolean(state.selected.value)"
      label="订单详情"
      placement="right"
      width="min(680px, 100vw)"
      @close="close"
    >
      <article v-if="state.selected.value" class="order-drawer">
        <header class="drawer-header">
          <div class="drawer-heading">
            <span class="eyebrow">ORDER DETAIL</span>
            <div class="title-row">
              <h2>订单详情</h2>
              <UiBadge :tone="tone(state.selected.value.status)">{{ state.selected.value.status }}</UiBadge>
            </div>
            <p>{{ state.selected.value.orderNumber }}</p>
          </div>
          <UiButton class="close-button" variant="ghost" size="sm" aria-label="关闭订单详情" @click="close">×</UiButton>
        </header>

        <div class="drawer-body">
          <UiCard class="drawer-card" title="订单信息" subtitle="买家、收货与支付信息" padding="md">
            <dl class="order-facts">
              <div>
                <dt>买家</dt>
                <dd>{{ state.selected.value.buyerDisplayName }} · {{ state.selected.value.buyerMaskedPhone }}</dd>
              </div>
              <div>
                <dt>收货人</dt>
                <dd>{{ state.selected.value.address.recipient }} · {{ state.selected.value.address.phone }}</dd>
              </div>
              <div>
                <dt>收货地址</dt>
                <dd>{{ state.selected.value.address.province }} {{ state.selected.value.address.city }} {{ state.selected.value.address.district }} {{ state.selected.value.address.addressLine }}</dd>
              </div>
              <div>
                <dt>支付事实</dt>
                <dd class="payment-fact">
                  <UiBadge :tone="tone(state.selected.value.payment.status)">{{ state.selected.value.payment.status }}</UiBadge>
                  <strong>¥{{ state.selected.value.payment.amount }}</strong>
                  <span>{{ state.selected.value.payment.provider }}</span>
                </dd>
              </div>
            </dl>
          </UiCard>

          <UiCard
            v-for="child in state.selected.value.merchantOrders"
            :key="child.id"
            class="drawer-card"
            padding="md"
          >
            <template #header>
              <div class="merchant-heading">
                <h2>{{ child.storeName }}</h2>
                <p>店铺子订单 · 共 {{ child.items.length }} 种商品</p>
              </div>
            </template>
            <template #actions><UiBadge :tone="tone(child.status)">{{ child.status }}</UiBadge></template>
            <div class="line-items">
              <div v-for="item in child.items" :key="item.id" class="line-item">
                <div>
                  <strong>{{ item.productTitle }}</strong>
                  <span>{{ item.skuName }} · × {{ item.quantity }}</span>
                </div>
                <b>¥{{ item.payableAmount }}</b>
              </div>
            </div>
            <ShipmentPanel
              :child="child"
              :tracking="state.tracking.value"
              :busy="state.busy.value"
              :can-manage="canManage"
              @ship="payload => state.ship(child.id, payload)"
            />
            <template #footer>
              <div class="merchant-total"><span>店铺应付</span><strong>¥{{ child.payableAmount }}</strong></div>
            </template>
          </UiCard>

          <UiCard
            v-if="canManage && state.selected.value.merchantOrders.length"
            class="drawer-card"
            title="商家内部备注"
            subtitle="仅运营和商家后台可见，不会展示给买家"
            padding="md"
          >
            <UiForm class="note-form" :model="noteForm" @submit="save">
              <UiField label="备注内容" name="note" hint="最多 1000 个字符">
                <UiTextarea v-model="noteForm.note" rows="5" maxlength="1000" placeholder="填写订单处理信息…" />
              </UiField>
              <div class="form-actions">
                <UiButton type="submit" :loading="state.busy.value" :disabled="!noteForm.note.trim()">保存备注</UiButton>
              </div>
            </UiForm>
          </UiCard>

          <p class="readonly">支付状态与支付金额仅由支付回调更新，运营页面不可修改。</p>
        </div>
      </article>
    </UiDialog>
  </section>
</template>

<style scoped lang="less">
.orders {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.filters :deep(.mc-search) { flex: 1; }
.filters select {
  min-width: 142px;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-raised);
  color: var(--text);
}

.notice { padding: 10px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); }
td b, td small { display: block; }
td small { margin-top: 4px; color: var(--text-muted); }
.loading { padding: 50px; text-align: center; }

.order-drawer {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  background: var(--surface-raised);
}

.drawer-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 28px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.drawer-heading { min-width: 0; }
.eyebrow { color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: .12em; }
.title-row { display: flex; align-items: center; gap: 12px; margin-top: 7px; }
.title-row h2 { margin: 0; color: var(--text); font-size: 24px; line-height: 1.2; }
.drawer-heading p { margin: 7px 0 0; color: var(--text-muted); font-size: 12px; overflow-wrap: anywhere; }
.close-button { min-width: 36px; padding: 0; color: var(--text); font-size: 24px; line-height: 1; }

.drawer-body {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  padding: 20px 28px 28px;
}

.drawer-card { box-shadow: none; }
.order-facts { display: grid; gap: 14px; margin: 0; }
.order-facts > div { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 16px; align-items: start; }
.order-facts dt { color: var(--text-muted); font-size: 12px; }
.order-facts dd { margin: 0; color: var(--text); font-size: 13px; line-height: 1.65; }
.payment-fact { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.payment-fact span { color: var(--text-muted); }

.merchant-heading h2 { margin: 0; color: var(--text); font-size: 17px; }
.merchant-heading p { margin: 5px 0 0; color: var(--text-muted); font-size: 11px; }
.line-items { display: grid; gap: 0; }
.line-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 13px 0; border-top: 1px solid var(--border); }
.line-item:first-child { padding-top: 0; border-top: 0; }
.line-item:last-child { padding-bottom: 0; }
.line-item > div { display: grid; min-width: 0; gap: 5px; }
.line-item strong { color: var(--text); font-size: 13px; }
.line-item span { color: var(--text-muted); font-size: 11px; }
.line-item > b { flex: 0 0 auto; color: var(--text); font-size: 13px; }
.merchant-total { display: flex; align-items: center; justify-content: space-between; color: var(--text-secondary); font-size: 12px; }
.merchant-total strong { color: var(--text); font-size: 15px; }

.note-form { display: grid; gap: 16px; }
.form-actions { display: flex; justify-content: flex-end; }
.readonly { margin: 0; padding: 12px 14px; border-radius: 8px; background: var(--accent-soft); color: var(--text-muted); font-size: 11px; line-height: 1.6; }

@media (max-width: 700px) {
  .filters { flex-direction: column; }
  .filters select { min-width: 0; }
  .drawer-header { padding: 20px; }
  .drawer-body { gap: 12px; padding: 16px 16px 24px; }
  .order-facts > div { grid-template-columns: 72px minmax(0, 1fr); gap: 10px; }
}
</style>
