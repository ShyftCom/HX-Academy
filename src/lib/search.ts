import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Reduces a phone number to its Algerian national digits so every way of
 * writing the same number compares equal: "+213 662 82 83 46", "00213662828346"
 * and "0662-82-83-46" all become "662828346". Returns "" when the input has
 * too few digits to be worth matching as a phone.
 */
export function phoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00213")) digits = digits.slice(5);
  else if (digits.startsWith("213") && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 3 ? digits : "";
}

/**
 * Ids of rows in `table` whose phone columns contain `digits` once their own
 * spaces, dashes, "+" and country code are ignored. Stored numbers come from
 * many forms and are not normalized, so Prisma's `contains` can't do this.
 */
async function idsByPhone(table: "leads" | "players", columns: string[], digits: string): Promise<string[]> {
  const pattern = `%${digits}%`;
  const conditions = columns.map(
    (c) => Prisma.sql`regexp_replace(coalesce(${Prisma.raw(`"${c}"`)}, ''), '\\D', '', 'g') LIKE ${pattern}`,
  );
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE ${Prisma.join(conditions, " OR ")}`,
  );
  return rows.map((r) => r.id);
}

/**
 * Builds the `where` fragment for a back-office people search (leads, players).
 * Case-insensitive; every word must match one of `textFields`, so "ahmed benali"
 * finds "Benali Ahmed". Phone-looking queries also match on normalized digits.
 */
export async function peopleSearchWhere(
  q: string,
  opts: { table: "leads" | "players"; textFields: string[]; phoneColumns: string[] },
): Promise<Record<string, unknown> | null> {
  const query = q.trim();
  if (!query) return null;

  const words = query.split(/\s+/);
  const textMatch = {
    AND: words.map((w) => ({
      OR: opts.textFields.map((f) => ({ [f]: { contains: w, mode: "insensitive" } })),
    })),
  };

  const digits = phoneDigits(query);
  // Only treat it as a phone search when the query is mostly a number, so a
  // name with a digit in it doesn't pull in unrelated rows.
  const looksLikePhone = digits && /^[\d\s+().-]+$/.test(query);
  if (!looksLikePhone) return textMatch;

  const ids = await idsByPhone(opts.table, opts.phoneColumns, digits);
  return { OR: [textMatch, { id: { in: ids } }] };
}
