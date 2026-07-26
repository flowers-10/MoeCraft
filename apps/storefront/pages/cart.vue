<script setup lang="ts">
import type { CartItemInvalidReason } from "@moecraft/shared";

useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
useSeoMeta({ title: "购物车 - MoeCraft" });

const { cart, pending, lastError, groups, selectedAmount, invalidCount, refresh, update, remove, selectItems, clearInvalid } = useCart();
const { mediaUrl, money } = useStorefrontCatalog();

onMounted(() => { refresh(); });

const reasons: Record<CartItemInvalidReason, string> = {
  SKU_NOT_FOUND: "商品已失效",
  SKU_INACTIVE: "规格已下架",
  PRODUCT_NOT_SELLABLE: "商品已下架",
  STORE_CLOSED: "店铺休息中",
  MERCHANT_INACTIVE: "商家已停业",
  OUT_OF_STOCK: "已售罄",
  PURCHASE_LIMIT_EXCEEDED: "超过限购",
  QUANTITY_EXCEEDS_STOCK: "库存不足"
};

async function toggleItem(item: { id: string; selected: boolean }) {
  await update(item.id, { selected: !item.selected });
}

async function toggleGroup(group: { items: { id: string; selected: boolean }[] }) {
  const groupAllSelected = group.items.every((i) => i.selected);
  const targets = groupAllSelected ? group.items.map((i) => i.id) : group.items.filter((i) => !i.selected).map((i) => i.id);
  if (!targets.length) return;
  await selectItems(targets, !groupAllSelected);
}

async function changeQty(itemId: string, current: number, delta: number) {
  const next = current + delta;
  if (next < 1) return;
  await update(itemId, { quantity: next });
}
</script>

<template>
  <div class="cart-page">
    <StorefrontHeader />
    <main>
      <header class="title"><h1>购物车</h1><span v-if="cart">共 {{ cart.itemCount }} 件</span></header>

      <div v-if="cart?.mergeNotices.length" class="notices" role="status">
        <p v-for="(notice, index) in cart.mergeNotices" :key="index">{{ notice.message }}</p>
      </div>

      <section v-if="pending && !cart" class="loading"><i v-for="n in 3" :key="n" /></section>

      <section v-else-if="lastError" class="state">
        <h2>购物车加载失败</h2>
        <button type="button" @click="refresh">重试</button>
      </section>

      <section v-else-if="!cart || !cart.groups.length" class="state empty">
        <h2>购物车空空如也</h2>
        <p>去逛逛心仪的二创好物吧。</p>
        <NuxtLink to="/catalog">浏览商品</NuxtLink>
      </section>

      <section v-else class="content">
        <div class="groups">
          <article v-for="group in groups" :key="group.storeId" class="store">
            <header>
              <label class="group-check">
                <input type="checkbox" :checked="group.items.every((i) => i.selected)" @change="toggleGroup(group)">
                <NuxtLink :to="`/stores/${group.storeSlug}`">{{ group.storeName }}</NuxtLink>
              </label>
              <span v-if="!group.isOpen" class="store-closed">店铺休息中</span>
            </header>
            <ul>
              <li v-for="item in group.items" :key="item.id" :class="{ invalid: !item.valid }">
                <label class="row-check">
                  <input type="checkbox" :checked="item.selected" :disabled="!item.valid" @change="toggleItem(item)">
                </label>
                <div class="thumb">
                  <img v-if="item.coverFileId" :src="mediaUrl(item.coverFileId)" :alt="item.productTitleZhCn">
                  <span v-else>{{ item.productTitleZhCn.slice(0, 1) }}</span>
                </div>
                <div class="meta">
                  <NuxtLink :to="`/products/${item.productId}`" class="name">{{ item.productTitleZhCn }}</NuxtLink>
                  <small>{{ item.skuNameZhCn }}<span v-if="item.saleType === 'PREORDER'"> · 预售</span></small>
                  <p v-if="!item.valid" class="reason">{{ reasons[item.invalidReason ?? 'SKU_NOT_FOUND'] }}</p>
                </div>
                <div class="price-col">
                  <b class="unit">{{ money(item.unitPriceAmount, item.currency) }}</b>
                  <span class="line">{{ money(item.linePriceAmount, item.currency) }}</span>
                </div>
                <div class="qty" v-if="item.valid">
                  <button type="button" :disabled="item.quantity <= 1" @click="changeQty(item.id, item.quantity, -1)">−</button>
                  <input :value="item.quantity" readonly aria-label="数量">
                  <button type="button" :disabled="item.quantity >= Math.min(99, item.available, item.purchaseLimit || 99)" @click="changeQty(item.id, item.quantity, 1)">+</button>
                </div>
                <div class="qty" v-else><span class="reason-tag">不可购买</span></div>
                <button type="button" class="remove" @click="remove(item.id)">删除</button>
              </li>
            </ul>
          </article>
        </div>

        <aside class="summary">
          <div v-if="invalidCount > 0" class="invalid-banner">
            <p>有 {{ invalidCount }} 件商品失效或不可购买，将不参与结算。</p>
            <button type="button" @click="clearInvalid">清除失效</button>
          </div>
          <dl>
            <dt>已选商品</dt><dd>{{ cart.validSelectedCount }} 件</dd>
            <dt>商品合计</dt><dd class="total">{{ money(selectedAmount, cart.currency) }}</dd>
          </dl>
          <p class="disclaimer">{{ cart.priceDisclaimer }}</p>
          <button type="button" class="checkout" disabled title="结算台将在后续版本开放">去结算</button>
          <NuxtLink class="keep" to="/catalog">继续购物</NuxtLink>
        </aside>
      </section>
    </main>
    <StorefrontFooter />
  </div>
</template>

<style scoped>
:global(body){margin:0;background:#f7f8fa;color:#252832;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.cart-page{min-height:100vh}.cart-page>main{max-width:1192px;padding:20px 24px 80px;margin:auto}.title{display:flex;align-items:baseline;gap:12px;padding-bottom:18px}.title h1{margin:0;font-size:24px}.title span{color:#9398a4;font-size:12px}.notices{padding:12px 16px;margin-bottom:18px;border-radius:8px;background:#fff7e6;border:1px solid #ffe3a8;color:#7a5a12;font-size:12px}.notices p{margin:0}.loading{display:grid;gap:12px}.loading i{display:block;height:84px;border-radius:8px;background:#e5e8ec;animation:pulse 1s infinite alternate}.state{display:grid;min-height:50vh;place-content:center;place-items:center;gap:10px;text-align:center}.state h2{margin:0;font-size:18px}.state p{margin:0;color:#828895;font-size:12px}.state a,.state button{margin-top:8px;padding:10px 20px;border-radius:8px;background:#d94d6f;color:#fff;text-decoration:none;border:0;cursor:pointer}.content{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}.groups{display:grid;gap:16px}.store{background:#fff;border-radius:10px;overflow:hidden;border:1px solid #eef0f3}.store>header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f0f1f4;background:#fafbfc}.group-check{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700}.group-check a{color:#252832;text-decoration:none}.store-closed{color:#c0392b;font-size:11px}ul{list-style:none;margin:0;padding:0}li{display:grid;grid-template-columns:auto 84px minmax(0,1fr) auto auto auto;gap:14px;align-items:center;padding:16px 18px;border-top:1px solid #f5f6f8}li:first-child{border-top:0}li.invalid{background:#fff8f8}.row-check input,.group-check input{width:16px;height:16px}.thumb{display:grid;width:84px;height:84px;place-items:center;border-radius:8px;background:#eef0f3;overflow:hidden}.thumb img{width:100%;height:100%;object-fit:contain}.thumb span{color:#9398a4;font-size:24px;font-weight:700}.meta{display:grid;gap:4px;min-width:0}.name{color:#252832;text-decoration:none;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.meta small{color:#828895;font-size:11px}.reason{margin:0;color:#c0392b;font-size:11px}.price-col{display:grid;justify-items:end;gap:2px}.unit{font-size:13px;color:#d94d6f}.line{font-size:12px;color:#59606d}.qty{display:flex;align-items:center;border:1px solid #dfe2e8;border-radius:6px;overflow:hidden}.qty button{width:30px;height:30px;border:0;background:#fff;color:#464c59;cursor:pointer;font-size:15px}.qty button:disabled{color:#cfd2d8;cursor:not-allowed}.qty input{width:38px;height:30px;border:0;border-left:1px solid #eef0f3;border-right:1px solid #eef0f3;text-align:center;font:inherit;font-size:12px}.reason-tag{color:#c0392b;font-size:11px;padding:4px 8px;background:#fdecea;border-radius:4px}.remove{border:0;background:transparent;color:#9398a4;font-size:12px;cursor:pointer}.remove:hover{color:#c0392b}.summary{position:sticky;top:20px;display:grid;gap:14px;padding:20px;border-radius:10px;background:#fff;border:1px solid #eef0f3}.invalid-banner{padding:10px 12px;border-radius:8px;background:#fdecea;display:grid;gap:8px;font-size:11px;color:#a83227}.invalid-banner button{justify-self:start;border:1px solid #e8b3ad;background:#fff;color:#a83227;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px}.summary dl{display:grid;grid-template-columns:1fr auto;gap:8px 12px;margin:0;font-size:13px}.summary dt{color:#828895}.summary dd{margin:0;text-align:right}.summary dd.total{color:#d94d6f;font-size:18px;font-weight:800}.disclaimer{margin:0;color:#9398a4;font-size:10px;line-height:1.5}.checkout{padding:12px;border:0;border-radius:8px;background:#d94d6f;color:#fff;font-size:14px;cursor:not-allowed;opacity:.6}.keep{text-align:center;color:#5f6573;font-size:12px;text-decoration:none}@keyframes pulse{to{opacity:.5}}@media(max-width:900px){.content{grid-template-columns:1fr}.summary{position:static}}@media(max-width:640px){li{grid-template-columns:auto 64px minmax(0,1fr);grid-template-areas:"check thumb meta" "check price qty" "check remove remove";row-gap:10px}.row-check{grid-area:check;align-self:start}.thumb{grid-area:thumb;width:64px;height:64px}.meta{grid-area:meta}.price-col{grid-area:price;justify-self:start;justify-items:start}.qty{grid-area:qty;justify-self:end}.remove{grid-area:remove;justify-self:start}}
</style>
