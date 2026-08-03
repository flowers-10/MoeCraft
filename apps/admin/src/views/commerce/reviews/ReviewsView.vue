<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { ReviewListItem, ReviewView } from "@moecraft/shared";
import { apiRequest } from "../../../api";

const items = ref<ReviewListItem[]>([]);
const onlyHidden = ref(false);
const pending = ref(false);
const replyContent = ref("");

async function load() {
  pending.value = true;
  try { items.value = await apiRequest<ReviewListItem[]>("/admin/reviews" + (onlyHidden.value ? "?hidden=true" : "")); }
  finally { pending.value = false; }
}
async function doReply(id: string) {
  if (!replyContent.value.trim()) return;
  await apiRequest("/admin/reviews/" + encodeURIComponent(id) + "/reply", { method: "PATCH", body: JSON.stringify({ content: replyContent.value.trim() }) });
  replyContent.value = ""; load();
}
async function doHide(id: string, hide: boolean) {
  const note = prompt(hide ? "隐藏原因:" : "取消隐藏原因:");
  if (note == null) return;
  await apiRequest("/admin/reviews/" + encodeURIComponent(id) + "/hide", { method: "PATCH", body: JSON.stringify({ hide, note }) });
  load();
}
onMounted(load);
watch(onlyHidden, load);

const stars = (r: number) => "★".repeat(r) + "☆".repeat(5 - r);
</script>
<template>
  <div class="page">
    <header>
      <h1>评价管理</h1>
      <label><input type="checkbox" v-model="onlyHidden" /> 仅显示已隐藏</label>
    </header>
    <p v-if="pending">加载中…</p>
    <table v-else class="table">
      <thead><tr><th>买家</th><th>评分</th><th>内容</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" :class="{ hidden: item.isHidden }">
          <td>{{ item.buyerDisplayName }}</td>
          <td>{{ stars(item.rating) }}</td>
          <td>{{ item.content.slice(0, 80) }}{{ item.content.length > 80 ? "…" : "" }}</td>
          <td>{{ item.isHidden ? "已隐藏" : "正常" }}</td>
          <td>{{ new Date(item.createdAt).toLocaleDateString() }}</td>
          <td class="actions">
            <input v-model="replyContent" placeholder="回复…" size="20" />
            <button @click="doReply(item.id)" class="btn">回复</button>
            <button v-if="!item.isHidden" @click="doHide(item.id, true)" class="btn warn">隐藏</button>
            <button v-else @click="doHide(item.id, false)" class="btn">取消隐藏</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.page { padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
.table td { padding: 8px; border-bottom: 1px solid #eee; }
.hidden { opacity: 0.5; }
.actions { display: flex; gap: 6px; align-items: center; }
.btn { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
.btn.warn { border-color: #b3263e; color: #b3263e; }
</style>
