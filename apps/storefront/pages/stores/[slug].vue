<script setup lang="ts">
import type { StoreProfileView } from "@moecraft/shared";

const route = useRoute();
const { request } = useApi();
const { locale } = useLocale();
const slug = String(route.params.slug);
const { data: store, error } = await useAsyncData(`store-${slug}`, () =>
  request<StoreProfileView>(`/stores/${encodeURIComponent(slug)}`),
);
const copy = computed(() => locale.value === "zh-CN" ? {
  notFound: "店铺不存在或暂停营业",
  service: "联系客服",
  returns: "退货与售后",
  empty: "店铺正在准备第一批商品，敬请期待。",
  open: "营业中",
} : {
  notFound: "Store not found or currently closed",
  service: "Customer service",
  returns: "Returns & support",
  empty: "This store is preparing its first collection.",
  open: "Open",
});

useHead(() => ({
  title: store.value ? `${store.value.name} · MoeCraft` : copy.value.notFound,
  meta: [{ name: "description", content: store.value?.description ?? copy.value.empty }],
}));
</script>

<template>
  <main class="store-page">
    <div v-if="error || !store" class="not-found">
      <span>◇</span><h1>{{ copy.notFound }}</h1><NuxtLink to="/">MoeCraft</NuxtLink>
    </div>
    <template v-else>
      <header class="banner" :style="store.bannerFileId ? { '--banner': `url('/api/v1/files/${store.bannerFileId}')` } : undefined">
        <div class="pattern" />
        <div class="store-head">
          <img v-if="store.logoFileId" class="logo image" :src="`/api/v1/files/${store.logoFileId}`" :alt="store.name" />
          <span v-else class="logo">{{ store.name.slice(0, 1) }}</span>
          <div><i>{{ copy.open }}</i><h1>{{ store.name }}</h1><p>@{{ store.slug }}</p></div>
        </div>
      </header>
      <section class="content">
        <article class="about"><p>{{ store.description || copy.empty }}</p></article>
        <aside>
          <div><span>✦</span><b>{{ copy.service }}</b><a v-if="store.customerServiceEmail" :href="`mailto:${store.customerServiceEmail}`">{{ store.customerServiceEmail }}</a><a v-if="store.customerServicePhone" :href="`tel:${store.customerServicePhone}`">{{ store.customerServicePhone }}</a></div>
          <div><span>↗</span><b>{{ copy.returns }}</b><p>{{ copy.empty }}</p></div>
        </aside>
      </section>
      <section class="products"><div><small>COLLECTION</small><h2>{{ copy.empty }}</h2></div></section>
    </template>
  </main>
</template>

<style scoped>
.store-page{min-height:100vh;background:#f5f4fa;color:#25223c;font-family:Inter,"PingFang SC",sans-serif}.banner{position:relative;min-height:300px;overflow:hidden;background-image:linear-gradient(135deg,#221d4dcc,#5846a5d9 65%,#8d6bc6cc),var(--banner,none);background-position:center;background-size:cover}.pattern{position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgb(255 255 255 / 18%),transparent 23%)}.store-head{position:absolute;display:flex;align-items:center;gap:22px;left:max(24px,calc((100% - 1120px)/2));bottom:36px;color:white}.logo{display:grid;width:90px;height:90px;place-items:center;border:5px solid rgb(255 255 255 / 25%);border-radius:25px;background:linear-gradient(145deg,#765cf1,#cf86c2);font-size:36px;font-weight:700}.logo.image{object-fit:cover}.store-head i{padding:5px 9px;border-radius:999px;background:rgb(55 200 154 / 22%);color:#83f0cc;font-size:11px;font-style:normal}.store-head h1{margin:10px 0 2px;font-size:36px}.store-head p{margin:0;color:#d5d0ee}.content{display:grid;max-width:1120px;grid-template-columns:1fr 360px;gap:22px;padding:30px 24px;margin:auto}.about,aside>div,.products{padding:26px;border:1px solid #e4e0ed;border-radius:16px;background:white;box-shadow:0 12px 30px rgb(45 35 80 / 6%)}.about p{margin:0;line-height:1.9;color:#68637b}aside{display:grid;gap:12px}aside>div{display:grid;gap:7px}aside span{color:#7058df;font-size:20px}aside b{font-size:13px}aside a,aside p{margin:0;color:#777187;font-size:12px}.products{display:grid;max-width:1072px;min-height:220px;place-items:center;margin:0 auto;text-align:center}.products small{color:#7058df;letter-spacing:.18em}.products h2{max-width:500px;color:#777187;font-size:18px;font-weight:500}.not-found{display:grid;min-height:100vh;place-content:center;place-items:center}.not-found span{color:#7058df;font-size:50px}.not-found a{color:#7058df}@media(max-width:700px){.banner{min-height:260px}.store-head{left:20px;bottom:25px}.logo{width:70px;height:70px}.store-head h1{font-size:27px}.content{grid-template-columns:1fr}.products{margin:0 24px}}
</style>
