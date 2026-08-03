<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ReconciliationListItem, ReconciliationView } from "@moecraft/shared";
import { apiRequest } from "../../../api";

const items = ref<ReconciliationListItem[]>([]);
const pending = ref(false);
const error = ref("");
const selected = ref<ReconciliationView | null>(null);

async function load() {
  pending.value = true;
  try { items.value = await apiRequest<ReconciliationListItem[]>("/admin/reconciliation"); }
  catch { error.value = "对账列表加载失败"; }
  finally { pending.value = false; }
}
async function view(id: string) {
  selected.value = await apiRequest<ReconciliationView>("/admin/reconciliation/" + encodeURIComponent(id));
}
async function doImport() {
  const date = prompt("对账日期 (YYYY-MM-DD):");
  if (!date) return;
  const fileName = prompt("文件名:");
  if (!fileName) return;
  const raw = prompt("CSV 内容 (orderNumber,expectedAmount):");
  if (!raw) return;
  const rows = raw.split("\n").filter(Boolean).map((line) => {
    const [orderNumber, expectedAmount] = line.split(",");
    return { orderNumber: orderNumber.trim(), expectedAmount: expectedAmount.trim() };
  });
  await apiRequest("/admin/reconciliation/import", { method: "POST", body: JSON.stringify({ date, fileName, rows }) });
  close(); load();
}
async function doResolve(id: string) {
  const notes = prompt("确认备注:");
  if (notes == null) return;
  await apiRequest("/admin/reconciliation/" + encodeURIComponent(id) + "/resolve", { method: "PATCH", body: JSON.stringify({ notes }) });
  close(); load();
}
function close() { selected.value = null; }
onMounted(load);
</script>
<template>
  <div class="page">
    <header>
      <h1>支付对账</h1>
      <button @click="doImport" class="btn primary">导入对账文件</button>
    </header>
    <p v-if="pending">加载中…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <table v-else class="table">
      <thead><tr><th>日期</th><th>来源</th><th>文件</th><th>期望金额</th><th>匹配金额</th><th>差异数</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.date }}</td><td>{{ item.source }}</td><td>{{ item.fileName }}</td>
          <td>¥{{ item.totalExpected }}</td><td>¥{{ item.totalMatched }}</td>
          <td>{{ item.unmatchedCount }}</td>
          <td>{{ item.status }}</td>
          <td><button @click="view(item.id)" class="btn">查看</button></td>
        </tr>
      </tbody>
    </table>
    <div v-if="selected" class="overlay" @click.self="close">
      <div class="drawer">
        <button class="close" @click="close">×</button>
        <h2>{{ selected.fileName }}</h2>
        <p>{{ selected.date }} · 期望 ¥{{ selected.totalExpected }} · 匹配 ¥{{ selected.totalMatched }}</p>
        <h3>差异明细 ({{ selected.unmatchedCount }} 项)</h3>
        <table class="table">
          <thead><tr><th>订单号</th><th>期望</th><th>实际</th><th>差异</th><th>类型</th></tr></thead>
          <tbody>
            <tr v-for="d in selected.discrepancies" :key="d.orderNumber">
              <td>{{ d.orderNumber }}</td><td>¥{{ d.expectedAmount }}</td>
              <td>¥{{ d.actualAmount }}</td><td>{{ d.difference }}</td>
              <td>{{ d.type }}</td>
            </tr>
          </tbody>
        </table>
        <button v-if="selected.status !== 'RESOLVED'" @click="doResolve(selected.id)" class="btn primary">确认解决</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.page { padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
header h1 { margin: 0; }
.btn { padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
.btn.primary { background: #7d3c5b; color: #fff; border-color: #7d3c5b; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
.table td { padding: 8px; border-bottom: 1px solid #eee; }
.error { color: #b3263e; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
.drawer { background: #fff; border-radius: 12px; padding: 28px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative; }
.close { position: absolute; top: 12px; right: 16px; border: 0; background: none; font-size: 22px; cursor: pointer; }
</style>
