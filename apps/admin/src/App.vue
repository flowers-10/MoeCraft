<script setup lang="ts">
import { computed, ref } from "vue";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import FigureActivity from "./components/FigureActivity.vue";
import FigureCalendar from "./components/FigureCalendar.vue";
import FigureOffer from "./components/FigureOffer.vue";
import OrderBoard from "./components/OrderBoard.vue";

const activePage = ref("orders");
const theme = ref<"system" | "light" | "dark">("system");
const themeAttribute = computed(() => (theme.value === "system" ? undefined : theme.value));

function cycleTheme() {
  theme.value = theme.value === "system" ? "light" : theme.value === "light" ? "dark" : "system";
}
</script>

<template>
  <div class="wrapper" :data-theme="themeAttribute">
    <AppSidebar :active-page="activePage" @select="activePage = $event" />
    <main class="main-container">
      <AppHeader :active-page="activePage" :theme="theme" @select="activePage = $event" @toggle-theme="cycleTheme" />
      <section v-if="activePage === 'orders'" class="dashboard content-scroll">
        <div class="user-box first-box">
          <FigureActivity />
          <FigureOffer />
          <FigureCalendar />
          <div class="account-wrapper">
            <div class="account-profile"><div class="figure-avatar figure-avatar--large">凛</div><i class="blob blob--one" /><i class="blob blob--two" /><i class="blob blob--three" /><strong>凛凛玩具店</strong><span>旗舰店 · 上海</span></div>
            <div class="account card"><div class="account-cash">¥ 563,704.20</div><div class="account-income">本月总营收</div><div class="account-iban">**** **** **** 3060</div></div>
          </div>
        </div>
        <OrderBoard />
      </section>
      <section v-else class="placeholder content-scroll"><span>✦</span><h2>{{ activePage === 'inventory' ? '库存管理' : activePage === 'members' ? '会员中心' : activePage === 'settings' ? '店铺设置' : '数据看板' }}</h2><p>此模块已准备好，后续可接入手办商城业务接口。</p></section>
    </main>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap");
@import "./styles/theme.css";
:root { font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; color:var(--text-muted); background:var(--app-bg); font-synthesis:none; } * { box-sizing:border-box; } html,body,#app { height:100%; } body { min-width:320px; margin:0; overflow:hidden; background:var(--app-bg); } button { font:inherit; } .wrapper { display:flex; width:100%; height:100dvh; overflow:hidden; background:var(--shell-bg); }.main-container { display:flex; min-width:0; height:100%; flex:1; flex-direction:column; overflow:hidden; }.dashboard,.placeholder { min-width:0; flex:1; min-height:0; }.content-scroll { overflow:auto; overscroll-behavior:contain; padding:clamp(14px,2vw,25px); }.user-box { gap:clamp(14px,1.5vw,20px); }.first-box { display:grid; grid-template-columns:minmax(300px,1.55fr) minmax(260px,1fr) minmax(260px,1fr) minmax(220px,.85fr); align-items:stretch; margin-top:0; }.card { display:flex; min-width:0; flex:1; flex-direction:column; padding:clamp(22px,2.4vw,40px) clamp(20px,2vw,30px); border:1px solid var(--border); border-radius:8px; background:radial-gradient(circle at top left,var(--surface-raised),var(--surface)); box-shadow:var(--shadow); }.account-wrapper { display:flex; min-width:0; flex-direction:column; align-items:center; }.account-profile { position:relative; margin:auto; text-align:center; }.account-profile strong { display:block; margin:20px 0 10px; color:var(--text); font-size:15px; font-weight:500; }.account-profile span { font-size:13px; }.figure-avatar { display:grid; place-items:center; border:2px solid var(--accent); border-radius:50%; background:linear-gradient(145deg,#edccbf,#8c5575); color:white; font-size:18px; font-weight:600; }.figure-avatar--large { width:84px; height:84px; margin:auto; box-shadow:inset 0 0 0 5px var(--surface); }.blob { position:absolute; border-radius:50%; animation:float 5.8s linear infinite alternate; }.blob--one { width:14px;height:14px;top:25px;left:-20px;background:var(--accent-strong); }.blob--two { width:18px;height:18px;right:-20px;top:-20px;background:#87344c;animation-delay:.2s; }.blob--three { width:12px;height:12px;right:-35px;top:50%;background:#13645b;animation-delay:1.8s; }.account { min-height:180px; margin-top:auto; flex-grow:0; cursor:pointer; transition:.3s; }.account:hover { transform:scale(1.02); }.account-cash { position:relative; padding-top:16px; margin-bottom:6px; color:var(--text); font-size:22px; font-weight:500; }.account-cash::after { position:absolute; top:24px; right:8px; content:"•••"; color:var(--text-muted); letter-spacing:4px; }.account-income { font-size:14px; }.account-iban { margin-top:auto; font-size:14px; font-weight:500; }.placeholder { display:grid; margin:0; place-content:center; text-align:center; background:var(--shell-bg); }.placeholder span { color:var(--accent); font-size:34px; }.placeholder h2 { margin:12px 0 8px; color:var(--text); }.placeholder p { margin:0; font-size:13px; } @keyframes float { 40%{transform:translate(-6px,-6px)}60%{transform:translate(-12px,-2px)}100%{transform:translate(0)} }
@media(max-width:1280px){.first-box{grid-template-columns:minmax(300px,1fr) minmax(260px,1fr)}.account-wrapper{display:grid;grid-template-columns:1fr 1fr;gap:20px;grid-column:1 / -1}.account{margin-top:0}} @media(max-width:900px){.first-box{grid-template-columns:repeat(2,minmax(0,1fr))}} @media(max-width:650px){.content-scroll{padding:14px}.first-box{grid-template-columns:1fr}.account-wrapper{grid-template-columns:1fr}.account-profile{display:none}.user-box{margin-top:14px}.card{padding:24px 20px}}
</style>
