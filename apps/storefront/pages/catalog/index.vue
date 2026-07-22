<script setup lang="ts">
import type { CatalogOverview, CatalogProductSort, PublicProductSearchResult } from "@moecraft/shared";

const route = useRoute();
const router = useRouter();
const { request } = useStorefrontCatalog();
const form = reactive({
  q: String(route.query.q ?? ""), category: String(route.query.category ?? ""), brand: String(route.query.brand ?? ""), franchise: String(route.query.franchise ?? ""),
  minPrice: route.query.minPrice ? Number(route.query.minPrice) / 100 : undefined as number | undefined,
  maxPrice: route.query.maxPrice ? Number(route.query.maxPrice) / 100 : undefined as number | undefined,
  availability: route.query.inStock === "true" ? "IN_STOCK" : route.query.inStock === "false" ? "OUT" : "ALL",
  saleType: String(route.query.saleType ?? ""), sort: String(route.query.sort ?? (route.query.q ? "RELEVANCE" : "NEWEST")) as CatalogProductSort
});
const queryPath = computed(() => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(route.query)) if (typeof value === "string" && value) params.set(key, value);
  params.set("pageSize", "24");
  return `/catalog/products?${params.toString()}`;
});
const { data: overview } = await useAsyncData("catalog-filters", () => request<CatalogOverview>("/catalog/public"));
const { data: result, pending, error } = await useAsyncData("catalog-products", () => request<PublicProductSearchResult>(queryPath.value), { watch: [queryPath] });

function apply() {
  const query: Record<string, string> = {};
  if (form.q.trim()) query.q = form.q.trim();
  if (form.category) query.category = form.category;
  if (form.brand) query.brand = form.brand;
  if (form.franchise) query.franchise = form.franchise;
  if (form.minPrice !== undefined && form.minPrice >= 0) query.minPrice = String(Math.round(form.minPrice * 100));
  if (form.maxPrice !== undefined && form.maxPrice >= 0) query.maxPrice = String(Math.round(form.maxPrice * 100));
  if (form.availability !== "ALL") query.inStock = String(form.availability === "IN_STOCK");
  if (form.saleType) query.saleType = form.saleType;
  query.sort = form.sort;
  router.push({ path: "/catalog", query });
}
function clear() { Object.assign(form, { q: "", category: "", brand: "", franchise: "", minPrice: undefined, maxPrice: undefined, availability: "ALL", saleType: "", sort: "NEWEST" }); apply(); }
function page(next: number) { router.push({ query: { ...route.query, page: String(next) } }); }
useSeoMeta({ title: () => form.q ? `${form.q} 搜索结果 - MoeCraft` : "手办与同人周边商品目录 - MoeCraft", description: "浏览 MoeCraft 在售手办、限定周边与预售新品。" });
</script>

<template>
  <div class="catalog-page">
    <StorefrontHeader />
    <header class="page-head"><div><small>CATALOG</small><h1>{{ route.query.q ? `“${route.query.q}”的搜索结果` : '商品目录' }}</h1></div><p>{{ result?.total ?? 0 }} 件商品</p></header>
    <main>
      <aside>
        <form @submit.prevent="apply">
          <label><span>关键词</span><input v-model="form.q" placeholder="角色、作品、品牌或商品"></label>
          <label><span>类目</span><select v-model="form.category"><option value="">全部类目</option><option v-for="item in overview?.categories" :key="item.id" :value="item.slug">{{ item.nameZhCn }}</option></select></label>
          <label><span>品牌</span><select v-model="form.brand"><option value="">全部品牌</option><option v-for="item in overview?.brands" :key="item.id" :value="item.slug">{{ item.nameZhCn }}</option></select></label>
          <label><span>作品 / IP</span><select v-model="form.franchise"><option value="">全部作品</option><option v-for="item in overview?.franchises" :key="item.id" :value="item.slug">{{ item.nameZhCn }}</option></select></label>
          <fieldset><legend>价格（元）</legend><div class="prices"><input v-model.number="form.minPrice" type="number" min="0" placeholder="最低"><i>至</i><input v-model.number="form.maxPrice" type="number" min="0" placeholder="最高"></div></fieldset>
          <label><span>库存</span><select v-model="form.availability"><option value="ALL">全部状态</option><option value="IN_STOCK">仅有货</option><option value="OUT">暂时无货</option></select></label>
          <label><span>销售类型</span><select v-model="form.saleType"><option value="">现货与预售</option><option value="IN_STOCK">现货</option><option value="PREORDER">预售</option></select></label>
          <div class="form-actions"><button type="submit">应用筛选</button><button type="button" class="clear" @click="clear">重置</button></div>
        </form>
      </aside>
      <section class="results">
        <div class="toolbar"><span>{{ result?.total ?? 0 }} 件</span><label>排序<select v-model="form.sort" @change="apply"><option value="RELEVANCE">相关度</option><option value="NEWEST">新品</option><option value="PRICE_ASC">价格从低到高</option><option value="PRICE_DESC">价格从高到低</option><option value="SALES">销量</option></select></label></div>
        <div v-if="pending" class="skeleton"><i v-for="n in 8" :key="n" /></div>
        <div v-else-if="error" class="state"><b>商品暂时无法加载</b><button @click="router.go(0)">重新加载</button></div>
        <div v-else-if="result?.items.length" class="grid"><ProductCard v-for="product in result.items" :key="product.id" :product="product" /></div>
        <div v-else class="state"><b>没有找到符合条件的商品</b><button @click="clear">清除筛选</button></div>
        <nav v-if="result && result.totalPages > 1" class="pagination"><button :disabled="result.page <= 1" @click="page(result.page - 1)">上一页</button><span>{{ result.page }} / {{ result.totalPages }}</span><button :disabled="result.page >= result.totalPages" @click="page(result.page + 1)">下一页</button></nav>
      </section>
    </main>
    <StorefrontFooter />
  </div>
</template>

<style scoped>
:global(body){margin:0;background:#f7f8fa;color:#252832;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.catalog-page{min-height:100vh}.page-head{display:flex;max-width:1192px;align-items:end;justify-content:space-between;padding:42px 24px 28px;margin:auto;border-bottom:1px solid #dfe2e8}.page-head small{color:#d14b6b;font-size:9px;font-weight:800}.page-head h1{margin:7px 0 0;font-size:32px}.page-head p{margin:0;color:#7e8492;font-size:12px}main{display:grid;max-width:1192px;grid-template-columns:230px minmax(0,1fr);gap:28px;padding:26px 24px 70px;margin:auto}aside{border-right:1px solid #dfe2e8;padding-right:24px}form{display:grid;gap:16px;position:sticky;top:20px}label{display:grid;gap:7px}label span,legend{color:#6d7380;font-size:10px;font-weight:700}input,select{width:100%;min-height:39px;box-sizing:border-box;padding:8px 10px;border:1px solid #d9dde4;border-radius:6px;background:#fff;color:#303441;font:inherit;font-size:11px}fieldset{padding:0;border:0}.prices{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;margin-top:7px}.prices i{color:#9ca1ac;font-size:9px;font-style:normal}.form-actions{display:flex;gap:8px}.form-actions button,.state button,.pagination button{min-height:36px;padding:8px 13px;border:0;border-radius:6px;background:#d94d6f;color:#fff;font:inherit;font-size:11px;cursor:pointer}.form-actions .clear{border:1px solid #d9dde4;background:#fff;color:#5f6572}.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;color:#818795;font-size:10px}.toolbar label{display:flex;align-items:center;grid-template-columns:auto 170px}.toolbar select{min-height:36px}.grid,.skeleton{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.skeleton i{aspect-ratio:4/6;border-radius:7px;background:#e7e9ee;animation:pulse 1.1s infinite alternate}.state{display:grid;min-height:380px;place-content:center;place-items:center;gap:16px;border-block:1px solid #e1e4e9;color:#777e8c}.pagination{display:flex;align-items:center;justify-content:center;gap:15px;margin-top:30px}.pagination button:disabled{opacity:.4;cursor:not-allowed}.pagination span{color:#767d8a;font-size:11px}@keyframes pulse{to{opacity:.5}}@media(max-width:900px){main{grid-template-columns:1fr}aside{padding:0 0 20px;border-right:0;border-bottom:1px solid #dfe2e8}form{position:static;grid-template-columns:repeat(3,1fr)}.form-actions{align-items:end}.grid,.skeleton{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.page-head{padding-top:30px}.page-head h1{font-size:25px}main{padding-inline:16px}form{grid-template-columns:1fr 1fr}.form-actions{grid-column:1/-1}.grid,.skeleton{gap:9px}.toolbar{align-items:flex-start;gap:10px}.toolbar label{grid-template-columns:1fr}.toolbar select{width:150px}}
</style>
