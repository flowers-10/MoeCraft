<script setup lang="ts">
import type { FavoriteView } from "@moecraft/shared";
definePageMeta({ middleware: "auth" }); useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
const { toggle, list } = useFavorites();
const items = ref<FavoriteView[]>([]);
const filter = ref<"PRODUCT" | "STORE" | "">("");
async function load() { items.value = await list(filter.value || undefined); }
async function doToggle(targetType: string, targetId: string) { await toggle(targetType, targetId); load(); }
onMounted(load);
watch(filter, load);
const typeLabel = (t: string) => t === "PRODUCT" ? "商品" : "店铺";
</script>
<template>
  <div class="page">
    <StorefrontHeader />
    <main>
      <NuxtLink to="/account">← 返回账户</NuxtLink>
      <h1>我的收藏</h1>
      <div class="filter"><button :class="{ active: filter === '' }" @click="filter = ''">全部</button><button :class="{ active: filter === 'PRODUCT' }" @click="filter = 'PRODUCT'">商品</button><button :class="{ active: filter === 'STORE' }" @click="filter = 'STORE'">店铺</button></div>
      <p v-if="!items.length" class="empty">暂无收藏</p>
      <ul v-else class="list">
        <li v-for="item in items" :key="item.id">
          <NuxtLink :to="item.targetType === 'PRODUCT' ? '/products/' + item.targetId : '/stores/' + item.targetId">{{ typeLabel(item.targetType) }} #{{ item.targetId.slice(0, 8) }}</NuxtLink>
          <button @click.prevent="doToggle(item.targetType, item.targetId)" class="btn">取消收藏</button>
        </li>
      </ul>
    </main>
    <StorefrontFooter />
  </div>
</template>
<style scoped>
:global(body) { margin: 0; background: #f7f4f5; color: #2e2730; font-family: Inter, "PingFang SC", sans-serif; }
.page main { max-width: 920px; min-height: 65vh; margin: auto; padding: 28px 22px 70px; }
.page main > a { color: #7d3c5b; }
h1 { margin: 16px 0; }
.filter { display: flex; gap: 8px; margin-bottom: 16px; }
.filter button { padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
.filter button.active { background: #7d3c5b; color: #fff; border-color: #7d3c5b; }
.empty { color: #8b7f85; }
.list { display: grid; gap: 10px; list-style: none; padding: 0; }
.list li { display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid #eadfe4; border-radius: 10px; background: white; }
.list li a { color: #2e2730; text-decoration: none; }
.btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 12px; }
</style>
