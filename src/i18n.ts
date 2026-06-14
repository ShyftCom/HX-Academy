import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import engCommon from "../messages/eng.json";
import frCommon from "../messages/fr.json";
import arCommon from "../messages/ar.json";

function getInitialLang(): string {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem("shyftcom_lang");
  if (stored === "eng" || stored === "en") return "en";
  if (stored === "fr" || stored === "ar") return stored;
  return "fr";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: getInitialLang(),
    fallbackLng: "fr",
    supportedLngs: ["en", "fr", "ar"],
    defaultNS: "common",
    ns: ["common"],
    resources: {
      en: { common: engCommon },
      fr: { common: frCommon },
      ar: { common: arCommon },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
export type Namespace = "common";
