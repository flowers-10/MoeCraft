<script setup lang="ts">
definePageMeta({middleware:"auth"});
useHead({meta:[{name:"robots",content:"noindex, nofollow"}]});
const session=useAuthSession();
async function logout(){await session.logout();await navigateTo("/login");}
</script>
<template><div class="account-page"><StorefrontHeader/><main><p>ACCOUNT</p><h1>账户中心</h1><h2>你好，{{session.user.value?.displayName}}</h2><nav><NuxtLink to="/account/orders">我的订单</NuxtLink><NuxtLink to="/account/addresses">收货地址</NuxtLink><NuxtLink to="/cart">购物车</NuxtLink></nav><button type="button" @click="logout">退出登录</button></main><StorefrontFooter/></div></template>
<style scoped>
:global(body){margin:0;background:#f7f4f5;color:#2e2730;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.account-page main{max-width:900px;min-height:62vh;margin:auto;padding:48px 22px}.account-page main>p{color:#a65071;font-size:11px;letter-spacing:.16em}nav{display:flex;gap:12px;margin:28px 0}nav a,button{padding:12px 18px;border:0;border-radius:8px;background:#7d3c5b;color:white;text-decoration:none;cursor:pointer}button{background:#806f77}
</style>
