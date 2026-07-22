<script setup lang="ts">
import type { ApiResponse, CatalogOverview, PublicProductSearchResult } from "@moecraft/shared";
const props = defineProps<{ kind: "categories" | "brands" | "franchises"; slug: string }>();
const config = useRuntimeConfig();
const { request } = useStorefrontCatalog();
const filterKey = computed(() => props.kind === "categories" ? "category" : props.kind === "brands" ? "brand" : "franchise");
const { data: overview, error: overviewError, pending: overviewPending } = await useAsyncData(`catalog-${props.kind}-${props.slug}`, () => $fetch<ApiResponse<CatalogOverview>>(`${config.public.apiBase}/catalog/public`).then((response) => response.resultData));
const item = computed(() => overview.value?.[props.kind].find((entry) => entry.slug === props.slug));
const { data: products, error: productsError, pending: productsPending } = await useAsyncData(`products-${props.kind}-${props.slug}`, () => request<PublicProductSearchResult>(`/catalog/products?${filterKey.value}=${encodeURIComponent(props.slug)}&pageSize=60`));
const typeLabel = computed(() => props.kind === "categories" ? "类目" : props.kind === "brands" ? "品牌" : "作品 / IP");
useSeoMeta({ title: () => item.value ? `${item.value.nameZhCn} - MoeCraft ${typeLabel.value}` : `${typeLabel.value} - MoeCraft`, description: () => item.value?.descriptionZhCn ?? `浏览 MoeCraft ${typeLabel.value}相关商品` });
</script>

<template>
  <div class="aggregate-page">
    <StorefrontHeader />
    <main>
      <NuxtLink class="back" to="/catalog">返回商品目录</NuxtLink>
      <section v-if="overviewPending" class="hero skeleton" />
      <section v-else-if="overviewError || !item" class="state">该目录不存在或已停用。</section>
      <template v-else>
        <header class="hero"><small>{{ typeLabel }}</small><h1>{{ item.nameZhCn }}</h1><p>{{ item.nameEnUs }}</p><span>{{ products?.total ?? item.productCount }} 件在售商品</span></header>
        <div class="section-head"><h2>相关商品</h2><span>{{ products?.total ?? 0 }} 件</span></div>
        <div v-if="productsPending" class="product-grid loading"><i v-for="n in 4" :key="n" /></div>
        <div v-else-if="productsError" class="state">商品暂时无法加载。</div>
        <div v-else-if="products?.items.length" class="product-grid"><ProductCard v-for="product in products.items" :key="product.id" :product="product" /></div>
        <div v-else class="state">该目录暂时没有在售商品。</div>
      </template>
    </main>
    <StorefrontFooter />
  </div>
</template>

<style scoped>
.aggregate-page{min-height:100vh;background:#f7f8fa;color:#252832;font-family:Inter,"PingFang SC",sans-serif}main{max-width:1192px;padding:28px 24px 70px;margin:auto}.back{color:#6d7380;font-size:11px;text-decoration:none}.hero{min-height:210px;padding:42px 48px;box-sizing:border-box;margin-top:22px;border-left:5px solid #d94d6f;background:#fff}.hero small{color:#d14b6b;font-size:9px;font-weight:800}.hero h1{margin:10px 0 3px;font-size:38px}.hero p{margin:0;color:#7e8492}.hero span{display:inline-block;margin-top:25px;color:#555b68;font-size:11px}.hero.skeleton{border:0;background:#e8eaee;animation:pulse 1s infinite alternate}.section-head{display:flex;align-items:center;justify-content:space-between;margin:38px 0 16px}.section-head h2{margin:0;font-size:21px}.section-head span{color:#858b98;font-size:10px}.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.product-grid.loading i{aspect-ratio:4/6;background:#e4e7eb}.state{display:grid;min-height:260px;place-content:center;color:#7b818e;border-block:1px solid #e0e3e8}.state.hero{margin-top:22px}.loading i{animation:pulse 1s infinite alternate}@keyframes pulse{to{opacity:.5}}@media(max-width:850px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){main{padding-inline:16px}.hero{padding:32px 24px}.hero h1{font-size:30px}.product-grid{gap:9px}}
</style>
