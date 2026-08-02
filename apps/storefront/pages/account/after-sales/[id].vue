<script setup lang="ts">
import type { AfterSaleView } from "@moecraft/shared";
definePageMeta({ middleware: "auth" }); useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
const route = useRoute(), api = useAfterSales(), afterSale = ref<AfterSaleView | null>(null), error = ref(""), busy = ref(false);
const returnCarrier = ref(""), returnTracking = ref("");
const statusLabel = (s: string) => ({ REQUESTED: "待处理", APPROVED: "已同意", REJECTED: "已拒绝", AWAITING_RETURN: "待买家退货", RETURNED: "已退货", REFUND_PROCESSING: "退款中", COMPLETED: "已完成", CANCELLED: "已取消" } as Record<string, string>)[s] ?? s;
const typeLabel = (t: string) => t === "REFUND_ONLY" ? "仅退款" : "退货退款";
async function load() { try { afterSale.value = await api.get(String(route.params.id)); } catch { error.value = "售后记录不存在。"; } }
async function doCancel() { if (!afterSale.value) return; busy.value = true; try { afterSale.value = await api.cancel(afterSale.value.id); } finally { busy.value = false; } }
async function doShipReturn() { if (!afterSale.value || !returnCarrier.value.trim() || !returnTracking.value.trim()) return; busy.value = true; try { afterSale.value = await api.shipReturn(afterSale.value.id, returnCarrier.value.trim(), returnTracking.value.trim()); } finally { busy.value = false; } }
const canCancel = (a: AfterSaleView) => a.buyerActions.includes("CANCEL");
const canShipReturn = (a: AfterSaleView) => a.buyerActions.includes("SHIP_RETURN");
onMounted(load);
</script>
<template>
  <div class="page">
    <StorefrontHeader />
    <main>
      <NuxtLink to="/account/after-sales">← 返回售后列表</NuxtLink>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="!afterSale">正在加载…</p>
      <template v-else>
        <header><div><small>{{ afterSale.afterSaleNumber }}</small><h1>{{ statusLabel(afterSale.status) }}</h1></div><strong>¥{{ afterSale.refundAmount }}</strong></header>
        <section class="panel">
          <h2>{{ afterSale.productTitle }}</h2>
          <p>{{ afterSale.skuName }} × {{ afterSale.quantity }} · {{ afterSale.storeName }}</p>
          <p><span class="tag">{{ typeLabel(afterSale.type) }}</span></p>
        </section>
        <section class="panel">
          <h3>售后原因</h3><p>{{ afterSale.reason }}</p>
          <p class="desc">{{ afterSale.description }}</p>
        </section>
        <section v-if="afterSale.returnCarrier" class="panel">
          <h3>退货物流</h3>
          <p>{{ afterSale.returnCarrier }} · {{ afterSale.returnTrackingNumber }}</p>
          <small>发货于 {{ afterSale.returnShippedAt ? new Date(afterSale.returnShippedAt).toLocaleString() : "N/A" }}</small>
        </section>
        <section v-if="afterSale.merchantNote" class="panel">
          <h3>商家备注</h3><p>{{ afterSale.merchantNote }}</p>
        </section>
        <section class="actions">
          <button v-if="canCancel(afterSale)" :disabled="busy" @click="doCancel">取消售后</button>
          <template v-if="canShipReturn(afterSale)">
            <input v-model="returnCarrier" placeholder="物流公司" />
            <input v-model="returnTracking" placeholder="物流单号" />
            <button :disabled="busy || !returnCarrier.trim() || !returnTracking.trim()" @click="doShipReturn">提交退货物流</button>
          </template>
        </section>
      </template>
    </main>
    <StorefrontFooter />
  </div>
</template>
<style scoped>
:global(body) { margin: 0; background: #f7f4f5; color: #2e2730; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
.page main { max-width: 920px; min-height: 65vh; margin: auto; padding: 28px 22px 70px; }
.page main > a { color: #7d3c5b; }
header { display: flex; justify-content: space-between; align-items: end; margin: 26px 0; }
header strong { font-size: 28px; color: #d44870; }
.panel { margin: 14px 0; padding: 22px; border: 1px solid #eadfe4; border-radius: 12px; background: white; }
.panel h2 { margin: 0 0 8px; font-size: 16px; }
.panel h3 { margin: 0 0 6px; font-size: 13px; color: #8b7f85; }
.panel p { margin: 4px 0; font-size: 14px; }
.desc { color: #5c4a52; white-space: pre-wrap; }
.tag { display: inline-block; padding: 3px 10px; border-radius: 6px; background: #f3e7ec; color: #7d3c5b; font-size: 12px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.actions button { padding: 11px 16px; border: 0; border-radius: 8px; background: #7d3c5b; color: white; cursor: pointer; }
.actions button:disabled { opacity: .5; cursor: default; }
.actions input { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; min-width: 160px; }
.error { color: #b3263e; }
</style>
