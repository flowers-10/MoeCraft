import { computed, ref } from "vue";

export type Locale = "zh-CN" | "en-US";
const saved = localStorage.getItem("mc-locale");
const locale = ref<Locale>(saved === "en-US" ? "en-US" : "zh-CN");

const messages = {
  "zh-CN": { overview: "工作台", onboarding: "商家入驻", products: "商品管理", inventory: "库存管理", orders: "订单中心", afterSales: "售后服务", members: "成员管理", reports: "数据报表", settings: "系统设置", greeting: "欢迎回来", platformAdmin: "平台管理员", platformOperator: "平台运营", merchantOwner: "商家店主", merchantStaff: "商家员工", customer: "申请人", comingSoon: "模块正在建设中", comingSoonHint: "导航与权限入口已经就绪，业务功能会按 Harness 单元逐步交付。", logout: "退出登录", switchLanguage: "切换语言", theme: "切换主题", localTime: "本地时间" },
  "en-US": { overview: "Overview", onboarding: "Onboarding", products: "Products", inventory: "Inventory", orders: "Orders", afterSales: "After-sales", members: "Team", reports: "Analytics", settings: "Settings", greeting: "Welcome back", platformAdmin: "Platform admin", platformOperator: "Platform operator", merchantOwner: "Merchant owner", merchantStaff: "Merchant staff", customer: "Applicant", comingSoon: "Module in progress", comingSoonHint: "Navigation and access boundaries are ready. Business features will ship unit by unit.", logout: "Sign out", switchLanguage: "Switch language", theme: "Switch theme", localTime: "Local time" }
} as const;

export type MessageKey = keyof typeof messages["zh-CN"];
export function useLocale() {
  const t = (key: MessageKey) => messages[locale.value][key];
  function setLocale(next: Locale) { locale.value = next; localStorage.setItem("mc-locale", next); document.documentElement.lang = next; }
  function toggleLocale() { setLocale(locale.value === "zh-CN" ? "en-US" : "zh-CN"); }
  return { locale: computed(() => locale.value), t, setLocale, toggleLocale };
}

document.documentElement.lang = locale.value;
