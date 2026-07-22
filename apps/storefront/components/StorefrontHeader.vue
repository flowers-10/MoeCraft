<script setup lang="ts">
const route = useRoute();
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
function submit() { const value = search.value.trim(); navigateTo({ path: "/catalog", query: value ? { q: value } : {} }); }
</script>

<template>
  <header class="site-header">
    <NuxtLink class="brand" to="/"><span>M</span><div><b>MoeCraft</b><small>FIGURE MARKET</small></div></NuxtLink>
    <nav><NuxtLink to="/">首页</NuxtLink><NuxtLink to="/catalog">商品目录</NuxtLink></nav>
    <form @submit.prevent="submit"><input v-model="search" aria-label="搜索商品" placeholder="搜索角色、作品、品牌"><button type="submit">搜索</button></form>
    <div class="account"><NuxtLink to="/login">登录</NuxtLink><NuxtLink class="register" to="/register">注册</NuxtLink></div>
  </header>
</template>

<style scoped>
.site-header{position:relative;z-index:20;display:grid;width:min(1240px,100%);height:68px;grid-template-columns:auto auto minmax(220px,420px) auto;align-items:center;gap:28px;padding:0 24px;margin:auto;background:#fff}.brand{display:flex;align-items:center;gap:9px;color:#242633;text-decoration:none}.brand>span{display:grid;width:34px;height:34px;place-items:center;border-radius:6px;background:#2d3142;color:#fff;font-weight:800}.brand div{display:grid}.brand b{font-size:14px}.brand small{color:#8e94a3;font-size:8px}.site-header nav{display:flex;gap:20px}.site-header nav a,.account a{color:#5f6573;font-size:12px;text-decoration:none}.site-header nav a.router-link-active{color:#d94d6f}.site-header form{display:flex;height:38px;border:1px solid #dfe2e8;border-radius:7px;background:#f7f8fa}.site-header input{min-width:0;flex:1;padding:0 12px;border:0;background:transparent;outline:0;font:inherit;font-size:12px}.site-header button{padding:0 15px;border:0;border-left:1px solid #dfe2e8;background:#fff;color:#323746;font:inherit;font-size:11px;cursor:pointer}.account{display:flex;align-items:center;justify-content:flex-end;gap:12px}.account .register{padding:8px 11px;border-radius:6px;background:#d94d6f;color:#fff}@media(max-width:850px){.site-header{grid-template-columns:auto 1fr auto}.site-header nav{display:none}.site-header form{grid-column:1/-1;grid-row:2;height:38px}.site-header{height:auto;padding-block:12px}.account{justify-self:end}}@media(max-width:440px){.brand div{display:none}.account{gap:8px}}
</style>
