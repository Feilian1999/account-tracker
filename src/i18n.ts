import { createI18n } from "vue-i18n";
import zhTW from "./locales/zh-TW";
import en from "./locales/en";
import ja from "./locales/ja";

function detectLocale(): string {
  const saved = localStorage.getItem("account-tracker-lang");
  if (saved) return saved;
  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("zh")) return "zh-TW";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}
const defaultLocale = detectLocale();

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: "en",
  messages: {
    "zh-TW": zhTW,
    en,
    ja,
  },
});
