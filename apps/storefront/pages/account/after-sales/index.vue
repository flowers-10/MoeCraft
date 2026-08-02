<script setup lang="ts">
import type { AfterSaleListItem } from "@moecraft/shared";
definePageMeta({ middleware: "auth" }); useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
const api = useAfterSales(), items = ref<AfterSaleListItem[]>([]), error = ref(""), busy = ref(false);
const typeLabel = (t: string) => t === "REFUND_ONLY" ? "仅退款" : "退货退款";
const statusLabel = (s: string) => ({ REQUESTED: "待处理", APPROVED: "已同意", REJECTED: "已拒绝", AWAITING_RETURN: "待买家退货", RETURNED: "已退货", REFUND_PROCESSING: "退款中", COMPLETED: "已完成", CANCELLED: "已取消" } as Record<string, string>)[s] ?? s;
async function load() { busy.value = true; try { items.value = await api.list(); } catch { error.value = "售后列表加载失败"; } finally { busy.value = false; } }
onMounted(load);
</script>
<template>
  <div class="page">
    <StorefrontHeader />
    <main>
      <NuxtLink to="/account">← 返回账户</NuxtLink>
      <h1 class="title">售后服务</h1>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="busy">正在加载…</p>
      <p v-else-if="!items.length" class="empty">暂无售后记录</p>
      <ul v-else class="list">
        <li v-for="item in items" :key="item.id">
          <NuxtLink :to="'/account/after-sales/' + item.id">
            <div class="item-head">
              <strong>{{ item.productTitle }}</strong>
              <span class="amount">¥{{ item.refundAmount }}</span>
            </div>
            <div class="item-meta">
              <span>{{ item.skuName }} × {{ item.quantity }}</span>
              <span>{{ item.storeName }}</span>
            </div>
            <div class="item-foot">
              <span class="tag">{{ typeLabel(item.type) }}</span>
              <span :class="['status', item.status.toLowerCase()]">{{ statusLabel(item.status) }}</span>
              <time>{{ new Date(item.createdAt).toLocaleDateString() }}</time>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </main>
    <StorefrontFooter />
  </div>
</template>
<style scoped>
:global(body) { margin: 0; background: #f7f4f5; color: #2e2730; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
.page main { max-width: 920px; min-height: 65vh; margin: auto; padding: 28px 22px 70px; }
.page main > a { color: #7d3c5b; }
.title { font-size: 22px; margin: 20px 0; }
.error { color: #b3263e; }
.empty { color: #8b7f85; }
.list { display: grid; gap: 12px; list-style: none; padding: 0; }
.list li a { display: block; padding: 18px; border: 1px solid #eadfe4; border-radius: 10px; background: white; text-decoration: none; color: inherit; }
.item-head { display: flex; justify-content: space-between; align-items: start; }
.item-head strong { font-size: 15px; }
.amount { color: #d44870; font-weight: 600; }
.item-meta { display: flex; gap: 12px; font-size: 12px; color: #8b7f85; margin: 6px 0; }
.item-foot { display: flex; align-items: center; gap: 10px; font-size: 12px; margin-top: 8px; }
.tag { padding: 2px 8px; border-radius: 4px; background: #f3e7ec; color: #7d3c5b; }
.status { padding: 2px 8px; border-radius: 4px; }
.status.requested { background: #fff3e0; color: #b26a21; }
.status.approved, .status.awaiting_return, .status.refund_processing { background: #e8f5e9; color: #2c7a4b; }
.status.rejected, .status.cancelled { background: #fce4ec; color: #b3263e; }
.status.completed { background: #e3f3e7; color: #2c7a4b; }
time { color: #a08e96; }
</style>
