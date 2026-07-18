import { computed, ref } from "vue";
import { enUS } from "./locales/en-US";
import { zhCN, type MessageKey } from "./locales/zh-CN";

export type Locale = "zh-CN" | "en-US";
export type { MessageKey };
export type MessageParams = Record<string, string | number>;

const savedLocale = localStorage.getItem("mc-locale");
const localeState = ref<Locale>(savedLocale === "en-US" ? "en-US" : "zh-CN");
const dictionaries: Record<Locale, Record<MessageKey, string>> = { "zh-CN": zhCN, "en-US": enUS };

function translate(key: MessageKey, params: MessageParams = {}): string {
  const template = dictionaries[localeState.value][key];
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

export function useLocale() {
  function setLocale(next: Locale) { localeState.value = next; localStorage.setItem("mc-locale", next); document.documentElement.lang = next; }
  function toggleLocale() { setLocale(localeState.value === "zh-CN" ? "en-US" : "zh-CN"); }
  return { locale: computed(() => localeState.value), t: translate, setLocale, toggleLocale };
}

document.documentElement.lang = localeState.value;
