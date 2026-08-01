<script setup lang="ts">
const route = useRoute();
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
const session = useAuthSession();
const { itemCount, refresh: refreshCart } = useCart();
const menuOpen = ref(false);
function submit() { const value = search.value.trim(); navigateTo({ path: "/catalog", query: value ? { q: value } : {} }); }
async function logout() {
  menuOpen.value = false;
  await session.logout();
  await refreshCart().catch(() => undefined);
  await navigateTo("/");
}
onMounted(() => { refreshCart().catch(() => undefined); });
</script>

<template>
  <header class="site-header">
    <NuxtLink class="brand" to="/"><span>M</span><div><b>MoeCraft</b><small>FIGURE MARKET</small></div></NuxtLink>
    <nav><NuxtLink to="/">首页</NuxtLink><NuxtLink to="/catalog">商品目录</NuxtLink></nav>
    <form @submit.prevent="submit"><input v-model="search" aria-label="搜索商品" placeholder="搜索角色、作品、品牌"><button type="submit">搜索</button></form>
    <div class="account">
      <NuxtLink class="cart-link" to="/cart" aria-label="购物车">购物车<span v-if="itemCount > 0" class="badge">{{ itemCount > 99 ? "99+" : itemCount }}</span></NuxtLink>
      <template v-if="session.user.value">
        <div class="user-menu" @mouseleave="menuOpen = false">
          <button type="button" class="user" @click="menuOpen = !menuOpen" @mouseenter="menuOpen = true">
            <span class="avatar">{{ session.user.value.displayName.slice(0, 1) }}</span>
            <span class="name">{{ session.user.value.displayName }}</span>
          </button>
          <div v-if="menuOpen" class="dropdown" @click="menuOpen = false">
            <NuxtLink to="/account">账户中心</NuxtLink>
            <NuxtLink to="/account/addresses">收货地址</NuxtLink>
            <NuxtLink to="/cart">购物车</NuxtLink>
            <button type="button" @click="logout">退出登录</button>
          </div>
        </div>
      </template>
      <template v-else>
        <NuxtLink to="/login">登录</NuxtLink><NuxtLink class="register" to="/register">注册</NuxtLink>
      </template>
    </div>
  </header>
</template>

<style scoped>
.site-header{position:relative;z-index:20;display:grid;box-sizing:border-box;width:100%;height:68px;grid-template-columns:auto auto minmax(220px,420px) auto;align-items:center;justify-content:space-between;gap:28px;padding:0 max(24px,calc((100vw - 1240px)/2));margin:0;background:#fff}.brand{display:flex;align-items:center;gap:9px;color:#242633;text-decoration:none}.brand>span{display:grid;width:34px;height:34px;place-items:center;border-radius:6px;background:#2d3142;color:#fff;font-weight:800}.brand div{display:grid}.brand b{font-size:14px}.brand small{color:#8e94a3;font-size:8px}.site-header nav{display:flex;gap:20px}.site-header nav a,.account a{color:#5f6573;font-size:12px;text-decoration:none}.site-header nav a.router-link-active{color:#d94d6f}.site-header form{display:flex;width:min(420px,100%);height:38px;border:1px solid #dfe2e8;border-radius:7px;background:#f7f8fa}.site-header input{min-width:0;flex:1;padding:0 12px;border:0;background:transparent;outline:0;font:inherit;font-size:12px}.site-header button{padding:0 15px;border:0;border-left:1px solid #dfe2e8;background:#fff;color:#323746;font:inherit;font-size:11px;cursor:pointer}.account{display:flex;align-items:center;justify-content:flex-end;gap:12px}.account .register{padding:8px 11px;border-radius:6px;background:#d94d6f;color:#fff}.cart-link{position:relative}.cart-link .badge{position:absolute;top:-8px;right:-12px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#d94d6f;color:#fff;font-size:9px;font-weight:700;line-height:16px;text-align:center}.user-menu{position:relative}.user{display:flex;align-items:center;gap:8px;padding:5px 6px;border:1px solid transparent;border-radius:20px;background:transparent;cursor:pointer;font:inherit;color:#323746}.user:hover{border-color:#e4e6ea;background:#f7f8fa}.user .avatar{display:grid;width:26px;height:26px;place-items:center;border-radius:50%;background:#2d3142;color:#fff;font-size:11px;font-weight:700}.user .name{max-width:96px;overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dropdown{position:absolute;right:0;top:calc(100% - 1px);z-index:40;display:grid;gap:2px;min-width:150px;padding:6px;border-radius:8px;background:#fff;box-shadow:0 12px 32px #0000001a;border:1px solid #eef0f3}.dropdown a,.dropdown button{display:block;padding:9px 12px;border:0;border-radius:6px;background:transparent;color:#323746;font-size:12px;text-align:left;text-decoration:none;cursor:pointer;font:inherit}.dropdown a:hover,.dropdown button:hover{background:#f7f8fa;color:#d94d6f}@media(max-width:850px){.site-header{grid-template-columns:auto 1fr auto;justify-content:stretch}.site-header nav{display:none}.site-header form{width:100%;grid-column:1/-1;grid-row:2;height:38px}.site-header{height:auto;padding:12px 18px}.account{justify-self:end}}@media(max-width:440px){.brand div{display:none}.account{gap:8px}}
</style>
