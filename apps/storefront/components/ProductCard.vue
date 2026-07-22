<script setup lang="ts">
import type { PublicProductCard } from "@moecraft/shared";
const props = defineProps<{ product: PublicProductCard }>();
const { mediaUrl, money } = useStorefrontCatalog();
const label = computed(() => props.product.saleType === "PREORDER" ? "预售" : props.product.inStock ? "现货" : "售罄");
</script>

<template>
  <article class="product-card">
    <NuxtLink class="media" :to="`/products/${product.id}`">
      <img v-if="product.coverFileId" :src="mediaUrl(product.coverFileId)" :alt="product.coverAlt || product.titleZhCn" loading="lazy">
      <div v-else class="fallback" aria-hidden="true"><b>M</b><span>MOECRAFT</span></div>
      <span :class="{ sold: !product.inStock }">{{ label }}</span>
    </NuxtLink>
    <div class="info">
      <small>{{ product.franchiseName || product.categoryName || 'MOECRAFT SELECT' }}</small>
      <NuxtLink :to="`/products/${product.id}`"><h3>{{ product.titleZhCn }}</h3></NuxtLink>
      <p>{{ product.brandName || product.storeName }}</p>
      <footer><b>{{ money(product.priceAmount, product.currency) }}</b><span v-if="product.inStock">可售 {{ product.available }}</span><span v-else>暂时无货</span></footer>
    </div>
  </article>
</template>

<style scoped>
.product-card{overflow:hidden;border:1px solid #e1e4e9;border-radius:7px;background:#fff;transition:transform .18s,box-shadow .18s}.product-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgb(30 35 48 / 10%)}.media{position:relative;display:block;aspect-ratio:4/5;overflow:hidden;background:#f0f1f4}.media img{width:100%;height:100%;object-fit:contain}.media>span{position:absolute;left:10px;top:10px;padding:5px 7px;border-radius:5px;background:#fff;color:#23715f;font-size:9px;font-weight:700}.media>span.sold{color:#a34a5d}.fallback{display:grid;width:100%;height:100%;place-content:center;place-items:center;color:#7a8291}.fallback b{display:grid;width:74px;height:74px;place-items:center;border-radius:50%;background:#d94d6f;color:#fff;font-size:30px}.fallback span{margin-top:12px;font-size:8px}.info{padding:14px}.info small{color:#d14b6b;font-size:9px;font-weight:700}.info>a{color:inherit;text-decoration:none}.info h3{min-height:39px;margin:6px 0 5px;font-size:14px;line-height:1.4}.info p{margin:0;color:#858b98;font-size:10px}.info footer{display:flex;align-items:end;justify-content:space-between;margin-top:15px}.info footer b{font-size:15px}.info footer span{color:#858b98;font-size:9px}
</style>
