import { ref } from "vue";
export type Locale = "zh-CN" | "en-US";
const locale = ref<Locale>((localStorage.getItem("mc-locale") as Locale) || "zh-CN");
const messages = { "zh-CN": { admin: "MoeCraft 后台", login: "登录", denied: "登录失败或没有后台权限" }, "en-US": { admin: "MoeCraft Admin", login: "Sign in", denied: "Sign-in failed or permission denied" } };
export function useLocale() { const t = (key: keyof typeof messages["zh-CN"]) => messages[locale.value][key]; function setLocale(next: Locale) { locale.value = next; localStorage.setItem("mc-locale", next); document.documentElement.lang = next; } return { locale, t, setLocale }; }
