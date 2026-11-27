/**
 * Charge fields shared by the charges routes and the charges screen.
 * Client-safe: no imports.
 */

export const PAYMENT_METHODS = ["cash", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * The seeded global categories, by their stored name → translation key.
 *
 * The stored names stay English: payroll finds "Salaries" by name, and
 * renaming the rows would break that and every historical association. The
 * screens translate them instead; a category an admin created is shown as
 * typed.
 */
export const BUILT_IN_CHARGE_CATEGORIES: Record<string, string> = {
  Rent: "rent",
  Utilities: "utilities",
  Equipment: "equipment",
  Marketing: "marketing",
  Salaries: "salaries",
  Coaching: "coaching",
  Other: "other",
};

/** Name a salary charge with no category is grouped under in totals and charts. */
export const SALARY_CATEGORY_NAME = "Salaries";
