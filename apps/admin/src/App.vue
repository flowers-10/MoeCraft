<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import type { AccessProfile, AdminRoutePermission, UserRole } from "@moecraft/shared";
import AppHeader from "./components/layout/AppHeader.vue";
import AppSidebar from "./components/layout/AppSidebar.vue";
import { apiRequest } from "./api";
import { useLocale } from "./i18n";

type CurrentUser = { id: string; username: string; displayName: string; roles: UserRole[] };
const adminToken = ref(sessionStorage.getItem("mc-admin-token"));
const currentUser = ref<CurrentUser | null>(null);
const accessProfile = ref<AccessProfile | null>(null);
const sessionInitializing = ref(true);
const route = useRoute();
const router = useRouter();
const activePage = computed(() => String(route.name ?? "overview"));
const theme = ref<"system" | "light" | "dark">((localStorage.getItem("mc-admin-theme") as "system" | "light" | "dark") || "system");
function themeForLocalTime(date = new Date()): "light" | "dark" { const hour = date.getHours(); return hour >= 6 && hour < 18 ? "light" : "dark"; }
const timedTheme = ref(themeForLocalTime());
const themeAttribute = computed(() => theme.value === "system" ? timedTheme.value : theme.value);
const themeTimer = window.setInterval(() => { timedTheme.value = themeForLocalTime(); }, 60_000);
const { t, toggleLocale } = useLocale();
function fallbackPath(permissions: AdminRoutePermission[]) { const candidates: Array<[AdminRoutePermission,string]>=[["merchant.store","/merchant/store"],["merchant.team","/merchant/team"],["system.overview","/system/overview"],["platform.onboarding","/platform/merchant-applications"],["commerce.products","/commerce/products"],["commerce.orders","/commerce/orders"]];return candidates.find(([key])=>permissions.includes(key))?.[1]??"/login"; }
function canOpen(user: CurrentUser, access: AccessProfile) { const required = route.meta.roles as UserRole[] | undefined; const key=route.meta.accessKey as AdminRoutePermission|undefined;return(!required?.length||required.some((role)=>user.roles.includes(role)))&&(!key||access.routePermissions.includes(key)); }
async function loadUser() { if (!adminToken.value) return false; try { const [user,access]=await Promise.all([apiRequest<CurrentUser>("/auth/me"),apiRequest<AccessProfile>("/auth/access-profile")]);sessionStorage.setItem("mc-admin-roles",JSON.stringify(user.roles));sessionStorage.setItem("mc-admin-route-permissions",JSON.stringify(access.routePermissions));sessionStorage.setItem("mc-admin-button-permissions",JSON.stringify(access.buttonPermissions));accessProfile.value=access;currentUser.value=user;if(!canOpen(user,access))await router.replace(fallbackPath(access.routePermissions));return true;}catch{signOut();return false;} }
async function initializeSession() { sessionInitializing.value = true; try { await loadUser(); } finally { sessionInitializing.value = false; } }
async function authenticated(token: string) { sessionInitializing.value = true; sessionStorage.removeItem("mc-admin-roles"); sessionStorage.removeItem("mc-admin-route-permissions"); sessionStorage.removeItem("mc-admin-button-permissions"); adminToken.value = token; try { const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/system/overview"; const loaded = await loadUser(); if (loaded) await router.replace(redirect); } finally { sessionInitializing.value = false; } }
function setTheme(value: "system" | "light" | "dark") { theme.value = value; localStorage.setItem("mc-admin-theme", value); }
function signOut() { sessionStorage.removeItem("mc-admin-token"); sessionStorage.removeItem("mc-admin-refresh"); sessionStorage.removeItem("mc-admin-roles");sessionStorage.removeItem("mc-admin-route-permissions");sessionStorage.removeItem("mc-admin-button-permissions"); adminToken.value = null; currentUser.value = null;accessProfile.value=null; void router.replace("/login"); }
function navigate(page: string) { void router.push({ name: page }); }
onMounted(initializeSession);
onBeforeUnmount(() => window.clearInterval(themeTimer));
</script>

<template>
  <section v-if="sessionInitializing" class="app-loading" :data-theme="themeAttribute"><span /><p>{{ t('common.loading') }}</p></section>
  <RouterView v-else-if="!adminToken" v-slot="{ Component }"><component :is="Component" @authenticated="authenticated" /></RouterView>
  <div v-else-if="currentUser&&accessProfile" class="wrapper" :data-theme="themeAttribute">
    <AppSidebar :active-page="activePage" :roles="currentUser.roles" :route-permissions="accessProfile.routePermissions" @select="navigate" />
    <main class="main-container">
      <AppHeader :active-page="activePage" :theme="theme" :user="currentUser" @set-theme="setTheme" @toggle-locale="toggleLocale" @navigate="navigate" @logout="signOut" />
      <RouterView v-slot="{ Component }"><component :is="Component" :roles="currentUser.roles" :button-permissions="accessProfile.buttonPermissions" /></RouterView>
    </main>
  </div>
</template>

<style lang="less">
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
@import "./styles/index.less";
:root{font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text-muted);background:var(--app-bg);font-synthesis:none}*{box-sizing:border-box}html,body,#app{height:100%}body{min-width:320px;margin:0;overflow:hidden;background:var(--app-bg)}button{font:inherit}.wrapper{display:flex;width:100%;height:100dvh;overflow:hidden;background:var(--shell-bg)}.main-container{display:flex;min-width:0;height:100%;flex:1;flex-direction:column;overflow:hidden}.dashboard,.placeholder{min-width:0;flex:1;min-height:0}.content-scroll{overflow:auto;overscroll-behavior:contain;padding:clamp(14px,2vw,25px)}.module-heading{padding:10px 5px 24px}.module-heading span{color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.15em}.module-heading h1{margin:7px 0;color:var(--text);font-size:27px}.module-heading p{margin:0;font-size:12px}.placeholder{display:grid;place-items:center;background:radial-gradient(circle at 55% 45%,var(--accent-soft),transparent 42%)}.placeholder-card{display:grid;width:min(90%,520px);place-items:center;padding:55px 30px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow);text-align:center}.placeholder-card>span{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:var(--accent-soft);color:var(--accent);font-size:25px}.placeholder-card small{margin-top:18px;color:var(--accent);font-size:9px;font-weight:700;letter-spacing:.17em}.placeholder-card h1{margin:8px 0;color:var(--text)}.placeholder-card p{max-width:390px;margin:0;color:var(--text-muted);font-size:12px;line-height:1.7}.placeholder-card b{padding:7px 11px;margin-top:20px;border-radius:999px;background:var(--surface-raised);color:var(--text-secondary);font-size:10px}@media(max-width:650px){.content-scroll{padding:12px}}
.app-loading{display:grid;width:100%;height:100dvh;place-content:center;place-items:center;gap:12px;background:var(--shell-bg);color:var(--text-muted);font-size:12px}.app-loading span{width:34px;height:34px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:session-spin .8s linear infinite}@keyframes session-spin{to{transform:rotate(360deg)}}
</style>
