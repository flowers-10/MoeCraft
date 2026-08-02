<script setup lang="ts">
import { ref } from "vue";
import type { AfterSaleListItem, AfterSaleView } from "@moecraft/shared";
import { useAfterSaleManagement } from "../composables/useAfterSaleManagement";

const props = defineProps<{ items: AfterSaleListItem[] }>();
const emit = defineEmits<{ changed: [] }>();
const { get, review, confirmReturned, refund, platformReview } = useAfterSaleManagement();

const selected = ref<AfterSaleView | null>(null);
const pending = ref(false);
const note = ref("");
const decision = ref<"APPROVED" | "REJECTED">("APPROVED");

const typeLabel = (t: string) => t === "REFUND_ONLY" ? "仅退款" : "退货退款";
const statusLabel = (s: string) => ({ REQUESTED: "待处理", APPROVED: "已同意", REJECTED: "已拒绝", AWAITING_RETURN: "待买家退货", RETURNED: "已退货", REFUND_PROCESSING: "退款中", COMPLETED: "已完成", CANCELLED: "已取消" } as Record<string, string>)[s] ?? s;

async function open(item: AfterSaleListItem) {
  pending.value = true; try { selected.value = await get(item.id); } finally { pending.value = false; }
}
function close() { selected.value = null; note.value = ""; }
async function doReview() {
  if (!selected.value) return;
  await review(selected.value.id, decision.value, note.value);
  close(); emit("changed");
}
async function doConfirmReturned() {
  if (!selected.value) return;
  await confirmReturned(selected.value.id);
  close(); emit("changed");
}
async function doRefund() {
  if (!selected.value) return;
  await refund(selected.value.id, note.value || "商家确认退款");
  close(); emit("changed");
}
async function doPlatformReview(dec: "APPROVED" | "REJECTED") {
  if (!selected.value) return;
  await platformReview(selected.value.id, dec, note.value || "平台仲裁");
  close(); emit("changed");
}
</script>
<template>
  <table class="table">
    <thead><tr><th>售后编号</th><th>商品</th><th>店铺</th><th>类型</th><th>状态</th><th>退款金额</th><th>时间</th><th>操作</th></tr></thead>
    <tbody>
      <tr v-for="item in items" :key="item.id" @click="open(item)" class="row">
        <td><code>{{ item.afterSaleNumber }}</code></td>
        <td>{{ item.productTitle }}<br /><small>{{ item.skuName }} × {{ item.quantity }}</small></td>
        <td>{{ item.storeName }}</td>
        <td><span class="tag">{{ typeLabel(item.type) }}</span></td>
        <td><span :class="['st', item.status.toLowerCase()]">{{ statusLabel(item.status) }}</span></td>
        <td>¥{{ item.refundAmount }}</td>
        <td>{{ new Date(item.createdAt).toLocaleDateString() }}</td>
        <td><button @click.stop="open(item)" class="btn">查看</button></td>
      </tr>
    </tbody>
  </table>
  <div v-if="selected" class="overlay" @click.self="close">
    <div class="drawer">
      <button class="close" @click="close">×</button>
      <h2>{{ selected.productTitle }}</h2>
      <p>{{ selected.skuName }} × {{ selected.quantity }} · {{ selected.storeName }}</p>
      <p><span class="tag">{{ typeLabel(selected.type) }}</span> · {{ statusLabel(selected.status) }} · ¥{{ selected.refundAmount }}</p>
      <div class="info"><strong>理由：</strong>{{ selected.reason }}</div>
      <div class="info desc">{{ selected.description }}</div>
      <div v-if="selected.merchantNote" class="info"><strong>商家备注：</strong>{{ selected.merchantNote }}</div>
      <div v-if="selected.platformNote" class="info"><strong>平台备注：</strong>{{ selected.platformNote }}</div>
      <div v-if="selected.returnCarrier" class="info"><strong>退货物流：</strong>{{ selected.returnCarrier }} · {{ selected.returnTrackingNumber }}</div>
      <div class="actions">
        <template v-if="selected.adminActions.includes('APPROVE') || selected.adminActions.includes('REJECT')">
          <select v-model="decision" class="sel"><option value="APPROVED">同意</option><option value="REJECTED">拒绝</option></select>
          <input v-model="note" placeholder="审核备注" class="inp" />
          <button @click="doReview" class="btn primary">提交审核</button>
        </template>
        <button v-if="selected.adminActions.includes('CONFIRM_RETURNED')" @click="doConfirmReturned" class="btn primary">确认收到退货</button>
        <button v-if="selected.adminActions.includes('REFUND')" @click="doRefund" class="btn primary">执行退款</button>
        <template v-if="selected.adminActions.includes('PLATFORM_APPROVE') || selected.adminActions.includes('PLATFORM_REJECT')">
          <input v-model="note" placeholder="平台仲裁备注" class="inp" />
          <button @click="doPlatformReview('APPROVED')" class="btn primary">平台同意</button>
          <button @click="doPlatformReview('REJECTED')" class="btn danger">平台拒绝</button>
        </template>
      </div>
    </div>
  </div>
</template>
<style scoped>
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #e0e0e0; color: #666; font-weight: 600; }
.table td { padding: 10px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
.row { cursor: pointer; }
.row:hover { background: #fdf9fb; }
.tag { padding: 2px 8px; border-radius: 4px; background: #f3e7ec; color: #7d3c5b; font-size: 11px; }
.st { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.st.requested { background: #fff3e0; color: #b26a21; }
.st.approved, .st.awaiting_return, .st.refund_processing { background: #e8f5e9; color: #2c7a4b; }
.st.rejected, .st.cancelled { background: #fce4ec; color: #b3263e; }
.st.completed { background: #e3f3e7; color: #2c7a4b; }
.btn { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
.btn.primary { background: #7d3c5b; color: #fff; border-color: #7d3c5b; }
.btn.danger { background: #b3263e; color: #fff; border-color: #b3263e; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
.drawer { background: #fff; border-radius: 12px; padding: 28px; max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative; }
.close { position: absolute; top: 12px; right: 16px; border: 0; background: none; font-size: 22px; cursor: pointer; }
.drawer h2 { margin: 0 0 8px; }
.info { margin: 8px 0; font-size: 13px; }
.desc { white-space: pre-wrap; color: #555; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; align-items: center; }
.sel { padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; }
.inp { padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; min-width: 160px; }
</style>
