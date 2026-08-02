<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import AfterSaleBoard from "./components/AfterSaleBoard.vue";
import { useAfterSaleManagement } from "./composables/useAfterSaleManagement";

const { items, pending, error, list } = useAfterSaleManagement();
const filterStatus = ref("");
onMounted(() => list(filterStatus.value || undefined));
watch(filterStatus, () => list(filterStatus.value || undefined));

const statusOptions = [
  { label: "全部", value: "" },
  { label: "待处理", value: "REQUESTED" },
  { label: "已同意", value: "APPROVED" },
  { label: "已拒绝", value: "REJECTED" },
  { label: "待退货", value: "AWAITING_RETURN" },
  { label: "已退货", value: "RETURNED" },
  { label: "退款中", value: "REFUND_PROCESSING" },
  { label: "已完成", value: "COMPLETED" },
  { label: "已取消", value: "CANCELLED" }
];
</script>
<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>售后服务</h1>
        <p>处理退款、退货申请；平台可执行仲裁操作。</p>
      </div>
      <div class="filter-bar">
        <select v-model="filterStatus">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </header>
    <p v-if="pending">正在加载…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!items.length" class="empty">暂无售后记录</p>
    <AfterSaleBoard v-else :items="items" @changed="list(filterStatus || undefined)" />
  </div>
</template>
<style scoped>
.page { padding: 10px; }
.page-header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 20px; }
.page-header h1 { margin: 0 0 4px; font-size: 20px; }
.page-header p { color: #666; margin: 0; }
.filter-bar select { padding: 6px 12px; border: 1px solid #ccc; border-radius: 6px; }
.error { color: #b3263e; }
.empty { color: #888; }
</style>
