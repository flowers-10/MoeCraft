<script setup lang="ts">
import type { PublicProductSearchResult, StoreProfileView } from "@moecraft/shared";
const route = useRoute();
const { request, mediaUrl } = useStorefrontCatalog();
const { locale } = useLocale();
const slug = String(route.params.slug);
const { data: store, pending, error } = await useAsyncData(`store-${slug}`, () => request<StoreProfileView>(`/stores/${encodeURIComponent(slug)}`));
const { data: products, pending: productsPending, error: productsError } = await useAsyncData(`store-products-${slug}`, () => request<PublicProductSearchResult>(`/catalog/products?store=${encodeURIComponent(slug)}&pageSize=60`));
const copy = computed(() => locale.value === "zh-CN" ? { notFound: "店铺不存在或暂停营业", service: "联系客服", returns: "退货与售后", empty: "店铺暂时没有在售商品。", open: "营业中", collection: "店铺商品" } : { notFound: "Store not found or currently closed", service: "Customer service", returns: "Returns & support", empty: "This store has no active products.", open: "Open", collection: "Collection" });
useSeoMeta({ title: () => store.value ? `${store.value.name} · MoeCraft` : copy.value.notFound, description: () => store.value?.description ?? copy.value.empty });
</script>

<template>
  <div class="store-page">
    <StorefrontHeader />
    <main v-if="pending" class="state">正在加载店铺…</main>
    <main v-else-if="error || !store" class="state"><h1>{{ copy.notFound }}</h1><NuxtLink to="/catalog">返回商品目录</NuxtLink></main>
    <template v-else>
      <header class="banner" :style="store.bannerFileId ? { backgroundImage: `url(${mediaUrl(store.bannerFileId)})` } : undefined"><div class="store-head"><img v-if="store.logoFileId" :src="mediaUrl(store.logoFileId)" :alt="store.name"><span v-else>{{ store.name.slice(0, 1) }}</span><div><small>{{ copy.open }}</small><h1>{{ store.name }}</h1><p>@{{ store.slug }}</p></div></div></header>
      <section class="profile"><article><p>{{ store.description || copy.empty }}</p></article><aside><div><b>{{ copy.service }}</b><a v-if="store.customerServiceEmail" :href="`mailto:${store.customerServiceEmail}`">{{ store.customerServiceEmail }}</a><a v-if="store.customerServicePhone" :href="`tel:${store.customerServicePhone}`">{{ store.customerServicePhone }}</a></div><div><b>{{ copy.returns }}</b><p>商品详情中标注适用的售后说明。</p></div></aside></section>
      <section class="collection"><div class="section-head"><h2>{{ copy.collection }}</h2><span>{{ products?.total ?? 0 }} 件</span></div><div v-if="productsPending" class="grid loading"><i v-for="n in 4" :key="n" /></div><div v-else-if="productsError" class="product-state">商品暂时无法加载。</div><div v-else-if="products?.items.length" class="grid"><ProductCard v-for="product in products.items" :key="product.id" :product="product" /></div><div v-else class="product-state">{{ copy.empty }}</div></section>
    </template>
    <StorefrontFooter />
  </div>
</template>

<style scoped>
.store-page{min-height:100vh;background:#f7f8fa;color:#252832;font-family:Inter,"PingFang SC",sans-serif}.banner{position:relative;min-height:310px;background-color:#343845;background-position:center;background-size:cover}.banner::after{position:absolute;content:"";inset:0;background:rgb(23 26 36 / 58%)}.store-head{position:absolute;z-index:1;display:flex;align-items:center;gap:20px;left:max(24px,calc((100% - 1144px)/2));bottom:34px;color:#fff}.store-head>img,.store-head>span{display:grid;width:86px;height:86px;box-sizing:border-box;place-items:center;border:3px solid rgb(255 255 255 / 65%);border-radius:7px;background:#d94d6f;object-fit:cover;font-size:30px;font-weight:800}.store-head small{padding:4px 7px;border-radius:4px;background:#fff;color:#23715f;font-size:9px;font-weight:700}.store-head h1{margin:9px 0 2px;font-size:31px}.store-head p{margin:0;color:#d9dce4;font-size:11px}.profile{display:grid;max-width:1144px;grid-template-columns:1fr 380px;gap:30px;padding:28px 24px;margin:auto;border-bottom:1px solid #dde1e7}.profile article p{margin:0;color:#656b78;line-height:1.8}.profile aside{display:grid;grid-template-columns:1fr 1fr;gap:20px}.profile aside div{display:grid;align-content:start;gap:7px}.profile aside b{font-size:11px}.profile aside a,.profile aside p{margin:0;color:#777e8b;font-size:10px;text-decoration:none}.collection{max-width:1144px;padding:36px 24px 70px;margin:auto}.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.section-head h2{margin:0;font-size:22px}.section-head span{color:#858b98;font-size:10px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.loading i{aspect-ratio:4/6;background:#e2e5e9;animation:pulse 1s infinite alternate}.product-state,.state{display:grid;min-height:260px;place-content:center;place-items:center;color:#777e8b}.state{min-height:calc(100vh - 68px)}.state a{color:#d14b6b}@keyframes pulse{to{opacity:.5}}@media(max-width:850px){.profile{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.banner{min-height:260px}.store-head{left:18px;bottom:24px}.store-head>img,.store-head>span{width:68px;height:68px}.store-head h1{font-size:24px}.profile aside{grid-template-columns:1fr}.grid{gap:9px}}
</style>
