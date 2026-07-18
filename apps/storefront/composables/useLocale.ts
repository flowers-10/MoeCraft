export type Locale = "zh-CN" | "en-US";
const messages = { "zh-CN": { login: "登录", register: "注册", account: "账号", password: "密码" }, "en-US": { login: "Sign in", register: "Register", account: "Account", password: "Password" } } as const;
export function useLocale() { const locale = useCookie<Locale>("mc-locale", { default: () => "zh-CN", sameSite: "lax" }); const t = (key: keyof typeof messages["zh-CN"]) => messages[locale.value][key]; function setLocale(next: Locale) { locale.value = next; if (import.meta.client) document.documentElement.lang = next; } return { locale, t, setLocale }; }
