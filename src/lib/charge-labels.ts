import type { TFunction } from "i18next";
import { BUILT_IN_CHARGE_CATEGORIES } from "@/lib/charge-fields";

/**
 * A charge category's display name: the seeded categories in the viewer's
 * language, an admin-created one as typed, and no category as "Sans catégorie".
 * Lists, forms and charts all go through here so historical charges read the
 * same everywhere.
 */
export function chargeCategoryLabel(name: string | null | undefined, t: TFunction): string {
  if (!name) return t("finance:charges.no_category");
  const key = BUILT_IN_CHARGE_CATEGORIES[name];
  return key ? t(`finance:categories.${key}`, { defaultValue: name }) : name;
}
