import { getSettings } from "@/lib/settings";
import {
  APPLY_OUTCOME_SETTINGS,
  APPLY_OUTCOME_SETTING_KEYS,
  APPLY_OUTCOME_DEFAULTS,
} from "@/lib/setting-keys";

export type ApplyOutcome = "qualified" | "rejected";

/**
 * The Super Admin's text for one of the two end pages of the application form,
 * in the visitor's locale.
 *
 * Same fallback chain as the rest of the public site's settings: the Arabic
 * variant if it has been written, otherwise the base (French) key, otherwise
 * the shipped default — so a half-translated page still reads as a sentence
 * rather than as an empty box.
 */
export async function getApplyOutcomeText(
  outcome: ApplyOutcome,
  locale: string,
): Promise<{ title: string; body: string }> {
  const settings = await getSettings(APPLY_OUTCOME_SETTING_KEYS);

  const pick = (baseKey: string) => {
    const localised = locale === "fr" ? "" : settings[`${baseKey}_${locale}`];
    const value = localised?.trim() || settings[baseKey]?.trim();
    if (value) return value;
    const fallbackKey = locale === "fr" ? baseKey : `${baseKey}_${locale}`;
    return APPLY_OUTCOME_DEFAULTS[fallbackKey] ?? APPLY_OUTCOME_DEFAULTS[baseKey] ?? "";
  };

  return outcome === "qualified"
    ? {
        title: pick(APPLY_OUTCOME_SETTINGS.qualifiedTitle),
        body: pick(APPLY_OUTCOME_SETTINGS.qualifiedBody),
      }
    : {
        title: pick(APPLY_OUTCOME_SETTINGS.rejectedTitle),
        body: pick(APPLY_OUTCOME_SETTINGS.rejectedBody),
      };
}
