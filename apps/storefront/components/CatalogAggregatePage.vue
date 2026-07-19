<script setup lang="ts">
import type { ApiResponse, CatalogOverview } from "@moecraft/shared";
const props=defineProps<{kind:"categories"|"brands"|"franchises";slug:string}>();
const config=useRuntimeConfig();
const {data,error,pending}=await useAsyncData(`catalog-${props.kind}-${props.slug}`,()=>$fetch<ApiResponse<CatalogOverview>>(`${config.public.apiBase}/catalog/public`).then(response=>response.resultData));
const item=computed(()=>data.value?.[props.kind].find(entry=>entry.slug===props.slug));
const typeLabel=computed(()=>props.kind==="categories"?"类目":props.kind==="brands"?"品牌":"作品 / IP");
useSeoMeta({title:()=>item.value?`${item.value.nameZhCn} - MoeCraft ${typeLabel.value}`:`${typeLabel.value} - MoeCraft`,description:()=>item.value?.descriptionZhCn??`浏览 MoeCraft ${typeLabel.value}聚合内容`});
</script>
<template><main class="aggregate"><NuxtLink to="/catalog">← 返回目录</NuxtLink><section v-if="pending" class="state">正在加载…</section><section v-else-if="error||!item" class="state">该目录不存在或已停用。</section><template v-else><header><small>{{typeLabel.toUpperCase()}}</small><h1>{{item.nameZhCn}}</h1><p>{{item.nameEnUs}}</p><div><span>{{item.productCount}} 件商品</span><span>已通过平台目录审核</span></div></header><section class="products"><h2>相关商品</h2><p>商品发布功能将在 G14–G15 接入，这里已经提供可索引的目录聚合 URL 与 SEO 元数据。</p></section></template></main></template>
<style scoped>.aggregate{max-width:1100px;margin:auto;padding:40px 22px;font-family:Inter,"PingFang SC",sans-serif;color:#25283a}.aggregate>a{color:#6656df;text-decoration:none}header{padding:55px;margin-top:25px;border-radius:24px;background:linear-gradient(135deg,#eeeaff,#fff);border:1px solid #dfdbf4}small{color:#6656df;font-weight:800;letter-spacing:.18em}h1{margin:12px 0 5px;font-size:42px}header p{color:#7f8395}header div{display:flex;gap:10px;margin-top:25px}header span{padding:8px 12px;border-radius:999px;background:#fff;color:#606579;font-size:12px}.products,.state{padding:35px;margin-top:20px;border:1px solid #e5e7ef;border-radius:18px}.products p,.state{color:#7f8395}@media(max-width:600px){header{padding:32px 24px}h1{font-size:32px}header div{align-items:flex-start;flex-direction:column}}</style>
