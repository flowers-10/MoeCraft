<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ReportView, RiskFlagView } from "@moecraft/shared";
import { apiRequest } from "../../../../api";

const flags = ref<RiskFlagView[]>([]);
const reports = ref<ReportView[]>([]);
const tab = ref<"flags" | "reports">("flags");
const flagResolved = ref(false);
const reportStatus = ref("PENDING");

async function load() {
  flags.value = await apiRequest<RiskFlagView[]>("/admin/risk/flags?resolved=" + (flagResolved.value ? "true" : "false"));
  reports.value = await apiRequest<ReportView[]>("/admin/risk/reports?status=" + reportStatus.value);
}
async function resolveFlag(id: string) { await apiRequest("/admin/risk/flags/" + encodeURIComponent(id) + "/resolve", { method: "PATCH" }); load(); }
async function handleReport(id: string, decision: string) {
  const notes = prompt("处理备注:");
  if (notes == null) return;
  await apiRequest("/admin/risk/reports/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ decision, notes }) });
  load();
}
onMounted(load);
watch([flagResolved, reportStatus], load);
</script>
<template>
  <div class="page">
    <header><h1>风控中心</h1></header>
    <nav><button :class="{ active: tab === 'flags' }" @click="tab = 'flags'">异常标记</button><button :class="{ active: tab === 'reports' }" @click="tab = 'reports'">举报管理</button></nav>
    <div v-if="tab === 'flags'">
      <label><input type="checkbox" v-model="flagResolved" /> 已处理</label>
      <table class="table"><thead><tr><th>类型</th><th>严重度</th><th>用户</th><th>IP</th><th>时间</th><th>操作</th></tr></thead>
        <tbody><tr v-for="f in flags" :key="f.id">
          <td>{{ f.type }}</td><td>{{ f.severity }}</td><td>{{ f.userId ?? "N/A" }}</td><td>{{ f.ipAddress ?? "N/A" }}</td>
          <td>{{ new Date(f.createdAt).toLocaleString() }}</td>
          <td><button v-if="!f.resolved" @click="resolveFlag(f.id)" class="btn">处理</button></td>
        </tr></tbody>
      </table>
    </div>
    <div v-if="tab === 'reports'">
      <select v-model="reportStatus"><option value="PENDING">待处理</option><option value="RESOLVED">已解决</option><option value="DISMISSED">已驳回</option></select>
      <table class="table"><thead><tr><th>举报人</th><th>目标</th><th>原因</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody><tr v-for="r in reports" :key="r.id">
          <td>{{ r.reporterId.slice(0, 8) }}</td><td>{{ r.targetType }} #{{ r.targetId.slice(0, 8) }}</td><td>{{ r.reason }}</td><td>{{ r.status }}</td>
          <td>{{ new Date(r.createdAt).toLocaleString() }}</td>
          <td>
            <button v-if="r.status === 'PENDING'" @click="handleReport(r.id, 'RESOLVED')" class="btn">解决</button>
            <button v-if="r.status === 'PENDING'" @click="handleReport(r.id, 'DISMISSED')" class="btn warn">驳回</button>
          </td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
<style scoped>
.page { padding: 20px; }
header h1 { margin: 0 0 12px; }
nav { display: flex; gap: 8px; margin-bottom: 16px; }
nav button { padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
nav button.active { background: #7d3c5b; color: #fff; border-color: #7d3c5b; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
.table td { padding: 8px; border-bottom: 1px solid #eee; }
.btn { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
.btn.warn { border-color: #b3263e; color: #b3263e; }
select { margin-bottom: 10px; padding: 6px; }
</style>
