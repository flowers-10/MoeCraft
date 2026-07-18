<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import type { UserRole } from "@moecraft/shared";
import AppHeader from "./components/layout/AppHeader.vue";
import AppSidebar from "./components/layout/AppSidebar.vue";
import { apiRequest } from "./api";
import { useLocale } from "./i18n";

type CurrentUser = { id: string; username: string; displayName: string; roles: UserRole[] };
const adminToken = ref(sessionStorage.getItem("mc-admin-token"));
const currentUser = ref<CurrentUser | null>(null);
const userLoading = ref(Boolean(adminToken.value));
const route = useRoute();
const router = useRouter();
const activePage = computed(() => String(route.name ?? "overview"));
const theme = ref<"system" | "light" | "dark">((localStorage.getItem("mc-admin-theme") as "system" | "light" | "dark") || "system");
const themeAttribute = computed(() => theme.value === "system" ? undefined : theme.value);
const { t, toggleLocale } = useLocale();
function canOpen(user: CurrentUser) { const required = route.meta.roles as UserRole[] | undefined; return !required?.length || required.some((role) => user.roles.includes(role)); }
async function loadUser() { if (!adminToken.value) return; userLoading.value = true; try { const user = await apiRequest<CurrentUser>("/auth/me"); sessionStorage.setItem("mc-admin-roles", JSON.stringify(user.roles)); if (!canOpen(user)) await router.replace(user.roles.some((role) => role.startsWith("MERCHANT_")) ? "/merchant/store" : "/system/overview"); currentUser.value = user; } catch { signOut(); } finally { userLoading.value = false; } }
function authenticated(token: string) { sessionStorage.removeItem("mc-admin-roles"); adminToken.value = token; userLoading.value = true; void loadUser(); void router.replace(typeof route.query.redirect === "string" ? route.query.redirect : "/overview"); }
function cycleTheme() { theme.value = theme.value === "system" ? "light" : theme.value === "light" ? "dark" : "system"; localStorage.setItem("mc-admin-theme", theme.value); }
function signOut() { sessionStorage.removeItem("mc-admin-token"); sessionStorage.removeItem("mc-admin-refresh"); sessionStorage.removeItem("mc-admin-roles"); adminToken.value = null; currentUser.value = null; userLoading.value = false; void router.replace("/login"); }
function navigate(page: string) { void router.push({ name: page }); }
onMounted(loadUser);
</script>

<template>
  <RouterView v-if="!adminToken" v-slot="{ Component }"><component :is="Component" @authenticated="authenticated" /></RouterView>
  <div v-else class="wrapper" :data-theme="themeAttribute">
    <AppSidebar :active-page="activePage" :roles="currentUser?.roles ?? []" @select="navigate" />
    <main class="main-container">
      <AppHeader :active-page="activePage" :theme="theme" :user="currentUser" @toggle-theme="cycleTheme" @toggle-locale="toggleLocale" @logout="signOut" />
      <section v-if="userLoading || !currentUser" class="session-loading"><span /><p>{{ t('common.loading') }}</p></section>
      <RouterView v-else v-slot="{ Component }"><component :is="Component" :roles="currentUser.roles" /></RouterView>
    </main>
  </div>
</template>

<style lang="less">
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
@import "./styles/index.less";
:root{font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text-muted);background:var(--app-bg);font-synthesis:none}*{box-sizing:border-box}html,body,#app{height:100%}body{min-width:320px;margin:0;overflow:hidden;background:var(--app-bg)}button{font:inherit}.wrapper{display:flex;width:100%;height:100dvh;overflow:hidden;background:var(--shell-bg)}.main-container{display:flex;min-width:0;height:100%;flex:1;flex-direction:column;overflow:hidden}.dashboard,.placeholder{min-width:0;flex:1;min-height:0}.content-scroll{overflow:auto;overscroll-behavior:contain;padding:clamp(14px,2vw,25px)}.module-heading{padding:10px 5px 24px}.module-heading span{color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.15em}.module-heading h1{margin:7px 0;color:var(--text);font-size:27px}.module-heading p{margin:0;font-size:12px}.placeholder{display:grid;place-items:center;background:radial-gradient(circle at 55% 45%,var(--accent-soft),transparent 42%)}.placeholder-card{display:grid;width:min(90%,520px);place-items:center;padding:55px 30px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow);text-align:center}.placeholder-card>span{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:var(--accent-soft);color:var(--accent);font-size:25px}.placeholder-card small{margin-top:18px;color:var(--accent);font-size:9px;font-weight:700;letter-spacing:.17em}.placeholder-card h1{margin:8px 0;color:var(--text)}.placeholder-card p{max-width:390px;margin:0;color:var(--text-muted);font-size:12px;line-height:1.7}.placeholder-card b{padding:7px 11px;margin-top:20px;border-radius:999px;background:var(--surface-raised);color:var(--text-secondary);font-size:10px}@media(max-width:650px){.content-scroll{padding:12px}}
.session-loading{display:grid;flex:1;place-content:center;place-items:center;gap:12px;background:var(--shell-bg);color:var(--text-muted);font-size:12px}.session-loading span{width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:session-spin .8s linear infinite}@keyframes session-spin{to{transform:rotate(360deg)}}
</style>
