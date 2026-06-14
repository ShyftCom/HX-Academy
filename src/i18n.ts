import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

const NAMESPACES = ["common", "auth", "dashboard", "leads", "calendar", "players", "settings", "emails"] as const;

// Only initialize once, client-side
if (typeof window !== "undefined" && !i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "fr",
      supportedLngs: ["en", "fr", "ar"],
      defaultNS: "common",
      ns: NAMESPACES,
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "shyftcom_lang",
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export default i18n;
export type Namespace = (typeof NAMESPACES)[number];
