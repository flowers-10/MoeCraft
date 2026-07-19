<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { UserRole } from "@moecraft/shared";
import type { MessageKey } from "../../i18n";
import { useLocale } from "../../i18n";

const props = defineProps<{
  activePage: string;
  theme: "system" | "light" | "dark";
  user: { displayName: string; username: string; roles: UserRole[] } | null;
}>();
defineEmits<{ toggleTheme: []; toggleLocale: []; navigate: [page: string]; logout: [] }>();

const { locale, t } = useLocale();
const now = ref(new Date());
const timer = window.setInterval(() => { now.value = new Date(); }, 1000);
onBeforeUnmount(() => window.clearInterval(timer));

const pageKeys: Record<string, MessageKey> = {
  overview: "nav.overview", onboarding: "nav.onboarding", products: "nav.products",
  inventory: "nav.inventory", orders: "nav.orders", afterSales: "nav.afterSales",
  members: "nav.members", reports: "nav.reports", settings: "nav.settings",
};
const roleKeys: Record<UserRole, MessageKey> = {
  PLATFORM_ADMIN: "role.platformAdmin", PLATFORM_OPERATOR: "role.platformOperator",
  MERCHANT_OWNER: "role.merchantOwner", MERCHANT_STAFF: "role.merchantStaff", CUSTOMER: "role.customer",
};
const pageKey = computed(() => pageKeys[props.activePage] ?? "nav.overview");
const time = computed(() => new Intl.DateTimeFormat(locale.value, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now.value));
const date = computed(() => new Intl.DateTimeFormat(locale.value, { month: "short", day: "numeric", weekday: "short" }).format(now.value));
const rolePriority: UserRole[] = ["PLATFORM_ADMIN", "PLATFORM_OPERATOR", "MERCHANT_OWNER", "MERCHANT_STAFF", "CUSTOMER"];
const primaryRole = computed(() => rolePriority.find((item) => props.user?.roles.includes(item)) ?? "CUSTOMER");
const role = computed(() => t(roleKeys[primaryRole.value]));
const initials = computed(() => (props.user?.displayName || props.user?.username || "M").slice(0, 1).toUpperCase());
const isOwner = computed(() => props.user?.roles.includes("MERCHANT_OWNER") ?? false);
const isMerchant = computed(() => props.user?.roles.some((item) => item === "MERCHANT_OWNER" || item === "MERCHANT_STAFF") ?? false);
const showOnboarding = computed(() => isOwner.value);
const showStore = computed(() => isMerchant.value);
</script>

<template>
  <header class="header">
    <div class="page-title"><span>{{ t('header.welcome') }}，{{ user?.displayName || user?.username || 'MoeCraft' }}</span><h2>{{ t(pageKey) }}</h2></div>
    <div class="header-actions">
      <div class="clock" :title="t('header.localTime')"><i>◷</i><div><b>{{ time }}</b><small>{{ date }}</small></div></div>
      <button class="tool-button language" :aria-label="t('header.switchLanguage')" @click="$emit('toggleLocale')"><span>{{ locale === 'zh-CN' ? '中' : 'EN' }}</span>{{ locale === 'zh-CN' ? '中文' : 'English' }}</button>
      <button class="tool-button theme" :aria-label="t('header.switchTheme')" @click="$emit('toggleTheme')">{{ theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐' }}</button>
      <div class="divider" />
      <div class="profile-menu">
        <button class="profile" type="button" :aria-label="t('header.myAccount')">
          <span class="avatar">{{ initials }}<i /></span><span class="profile-copy"><b>{{ user?.displayName || user?.username || 'MoeCraft' }}</b><small>{{ role }}</small></span><em>⌄</em>
        </button>
        <div class="profile-popover">
          <div class="account-summary"><span class="avatar small">{{ initials }}</span><div><b>{{ user?.displayName || user?.username }}</b><small>@{{ user?.username }}</small></div></div>
          <button v-if="showOnboarding" type="button" @click="$emit('navigate', 'onboarding')"><span>◇</span><div><b>{{ t('header.onboardingRecord') }}</b><small>{{ t('header.onboardingRecordHint') }}</small></div></button>
          <button v-if="showStore" type="button" @click="$emit('navigate', 'settings')"><span>⌂</span><div><b>{{ t('header.storeProfile') }}</b><small>{{ t('header.storeProfileHint') }}</small></div></button>
          <button class="logout-entry" type="button" @click="$emit('logout')"><span>→</span><div><b>{{ t('header.logout') }}</b></div></button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="less">
.header{position:relative;z-index:20;display:flex;min-height:74px;align-items:center;justify-content:space-between;gap:20px;padding:0 clamp(18px,2.5vw,34px);border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 94%,transparent);box-shadow:0 5px 18px rgb(36 42 74 / 5%);backdrop-filter:blur(14px)}
.page-title{span{color:var(--text-muted);font-size:10px}h2{margin:3px 0 0;color:var(--text);font-size:17px}}
.header-actions{display:flex;align-items:center;gap:9px}.clock{display:flex;align-items:center;gap:9px;padding-right:10px;i{color:#6957e8;font-size:18px;font-style:normal}div{display:grid}b{color:var(--text);font-size:12px;font-variant-numeric:tabular-nums}small{color:var(--text-muted);font-size:9px}}
.tool-button{height:36px;border:1px solid var(--border);border-radius:9px;background:var(--surface-raised);color:var(--text-secondary);cursor:pointer;&:hover{border-color:#6957e8;color:#6957e8}}.language{display:flex;align-items:center;gap:7px;padding:0 11px;font-size:10px;span{display:grid;width:20px;height:20px;place-items:center;border-radius:6px;background:#6957e8;color:white;font-size:9px}}.theme{width:36px;font-size:16px}.divider{width:1px;height:30px;margin:0 3px;background:var(--border)}
.profile-menu{position:relative;padding:8px 0}.profile{display:flex;align-items:center;gap:9px;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.profile-copy{display:grid}.profile b{max-width:130px;overflow:hidden;color:var(--text);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.profile small{color:var(--text-muted);font-size:9px}.profile em{color:var(--text-muted);font-size:12px;font-style:normal}.avatar{position:relative;display:grid;width:36px;height:36px;place-items:center;border-radius:11px;background:linear-gradient(145deg,#6957e8,#a76fd9);color:white;font-size:13px;font-weight:700}.avatar i{position:absolute;width:8px;height:8px;right:-1px;bottom:-1px;border:2px solid var(--surface);border-radius:50%;background:#27a979}.avatar.small{width:34px;height:34px;border-radius:10px}
.profile-popover{position:absolute;width:260px;right:0;top:calc(100% - 3px);padding:8px;border:1px solid var(--border);border-radius:13px;background:var(--surface);box-shadow:0 18px 46px rgb(30 35 68 / 18%);opacity:0;visibility:hidden;transform:translateY(-6px);transition:.18s}.profile-menu:hover .profile-popover,.profile-menu:focus-within .profile-popover{opacity:1;visibility:visible;transform:translateY(0)}.account-summary{display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);margin-bottom:6px}.account-summary div{display:grid;min-width:0}.account-summary b{overflow:hidden;color:var(--text);font-size:12px;text-overflow:ellipsis}.account-summary small{color:var(--text-muted);font-size:10px}.profile-popover>button{display:grid;width:100%;grid-template-columns:28px 1fr;align-items:center;gap:8px;padding:10px;border:0;border-radius:9px;background:transparent;color:var(--text-secondary);text-align:left;cursor:pointer}.profile-popover>button:hover{background:var(--surface-raised);color:var(--accent)}.profile-popover>button>span{display:grid;width:28px;height:28px;place-items:center;border-radius:8px;background:var(--accent-soft);color:var(--accent)}.profile-popover>button div{display:grid;gap:2px}.profile-popover>button b{font-size:11px}.profile-popover>button small{color:var(--text-muted);font-size:9px}.profile-popover>.logout-entry{border-top:1px solid var(--border);margin-top:5px;border-radius:0;color:var(--danger)}
@media(max-width:930px){.clock{display:none}.header{padding:0 17px}}@media(max-width:620px){.page-title span,.language,.profile-copy,.profile em,.divider{display:none}.header-actions{gap:4px}.profile-popover{right:-4px}}
</style>
