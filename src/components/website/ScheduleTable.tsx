import { getTranslations } from "next-intl/server";
import { FsaButton } from "./buttons/FsaButton";
import { formatDateShort, formatNumber } from "@/lib/public-format";
import { DAY_KEYS } from "@/lib/schedule";

export interface ScheduleRow {
  id: string;
  ageGroup: string;
  minAge: number | null;
  maxAge: number | null;
  dobStart: Date | string | null;
  dobEnd: Date | string | null;
  sessionName: string | null;
  sessionType: string | null;
  day: string | null;
  /** Set whenever `day` names exactly one weekday; drives the translated label. */
  dayOfWeek?: number | null;
  startTime: string | null;
  endTime: string | null;
  /** The location this slot belongs to. Every slot has one since schedules became
   *  location-scoped; it is optional here only so callers that already know the
   *  location (the venue page) need not select it. */
  station?: { name: string } | null;
  field?: string | null;
  price: number | null;
  registrationStatus: string;
}

/** Registration states carry a colour as well as a label; only the colour is
 *  fixed here — the label comes from schedule.status.* so it translates. */
const STATUS_CLASS: Record<string, string> = {
  open: "bg-fsa-success/15 text-fsa-success",
  waitlist: "bg-amber-100 text-amber-700",
  full: "bg-fsa-error/15 text-fsa-error",
  closed: "bg-gray-100 text-gray-500",
};
const STATUS_KEYS = ["open", "waitlist", "full", "closed"] as const;

/**
 * @param heading      Overrides the default "Programme schedule" title — the venue
 *                     page names the location instead.
 * @param showLocation Hides the location column where it would repeat the page it
 *                     is on. The column shows the pitch underneath it when one is set.
 * @param emptyState   Renders a message instead of nothing when there are no slots.
 *                     A location with an empty schedule is a normal state, not an
 *                     absent section, so the visitor is told rather than shown a gap.
 */
export async function ScheduleTable({
  rows,
  bookingUrl,
  locale,
  heading,
  showLocation = true,
  emptyState = false,
}: {
  rows: ScheduleRow[];
  bookingUrl?: string;
  locale: string;
  heading?: string;
  showLocation?: boolean;
  emptyState?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "schedule" });
  if (rows.length === 0 && !emptyState) return null;
  const fmtDob = (d: Date | string | null) => formatDateShort(d, locale);
  /** `day` is stored as free text and is historically English. Translate it via
   *  dayOfWeek where the value names one weekday; fall back to the raw string
   *  for ranges like "Monday-Friday", which no single day key can express. */
  const dayLabel = (row: ScheduleRow) => (row.dayOfWeek != null ? t(`days.${DAY_KEYS[row.dayOfWeek]}`) : row.day);
  const statusOf = (raw: string) => {
    const key = (STATUS_KEYS as readonly string[]).includes(raw) ? raw : "open";
    return { label: t(`status.${key}`), className: STATUS_CLASS[key] };
  };

  return (
    <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        <h2 className="mb-10 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading ?? t("heading")}</h2>

        {rows.length === 0 ? (
          <p className="rounded-fsa-md border border-fsa-border bg-white px-6 py-10 text-center text-fsa-text-muted">{t("empty")}</p>
        ) : (
          <>
        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-fsa-md lg:block">
          <table className="w-full border-separate border-spacing-0 text-start">
            <tbody>
              {rows.map((row, i) => {
                const status = statusOf(row.registrationStatus);
                return (
                  <tr key={row.id}>
                    <td className={`bg-fsa-sky px-5 py-4 font-fsa-display text-lg font-bold uppercase text-fsa-navy-900 ${i === 0 ? "rounded-ss-fsa-md" : ""} ${i === rows.length - 1 ? "rounded-es-fsa-md" : ""}`}>
                      {row.ageGroup}
                      {(row.dobStart || row.dobEnd) && <div className="text-xs font-normal normal-case opacity-80">{fmtDob(row.dobStart)} – {fmtDob(row.dobEnd)}</div>}
                    </td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">{row.sessionName ?? row.sessionType ?? "—"}</td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">
                      {row.day && <span className="font-semibold text-white">{dayLabel(row)}</span>}
                      {row.startTime && <span> {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</span>}
                    </td>
                    {showLocation && (
                      <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">
                        {row.station?.name ?? "—"}
                        {row.field ? <div className="text-xs opacity-70">{row.field}</div> : null}
                      </td>
                    )}
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm font-semibold text-white">{row.price != null ? formatNumber(row.price, locale) : "—"}</td>
                    <td className={`bg-fsa-navy-900 px-5 py-4 ${i === 0 ? "rounded-se-fsa-md" : ""} ${i === rows.length - 1 ? "rounded-ee-fsa-md" : ""}`}>
                      <span className={`rounded-fsa-pill px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 lg:hidden">
          {rows.map((row) => {
            const status = statusOf(row.registrationStatus);
            return (
              <div key={row.id} className="overflow-hidden rounded-fsa-md border border-fsa-border bg-white">
                <div className="flex items-center justify-between bg-fsa-sky px-4 py-3">
                  <span className="font-fsa-display text-base font-bold uppercase text-fsa-navy-900">{row.ageGroup}</span>
                  <span className={`rounded-fsa-pill px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 px-4 py-3 text-sm">
                  {(row.dobStart || row.dobEnd) && (
                    <>
                      <dt className="text-fsa-text-muted">{t("dateOfBirth")}</dt>
                      <dd className="text-end text-fsa-navy-900">{fmtDob(row.dobStart)} – {fmtDob(row.dobEnd)}</dd>
                    </>
                  )}
                  <dt className="text-fsa-text-muted">{t("session")}</dt>
                  <dd className="text-end text-fsa-navy-900">{row.sessionName ?? row.sessionType ?? "—"}</dd>
                  <dt className="text-fsa-text-muted">{t("dayTime")}</dt>
                  <dd className="text-end text-fsa-navy-900">{dayLabel(row)} {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</dd>
                  {showLocation && (
                    <>
                      <dt className="text-fsa-text-muted">{t("venue")}</dt>
                      <dd className="text-end text-fsa-navy-900">{row.station?.name ?? "—"}</dd>
                    </>
                  )}
                  {row.field ? (
                    <>
                      <dt className="text-fsa-text-muted">{t("field")}</dt>
                      <dd className="text-end text-fsa-navy-900">{row.field}</dd>
                    </>
                  ) : null}
                  {row.price != null && (
                    <>
                      <dt className="text-fsa-text-muted">{t("price")}</dt>
                      <dd className="text-end font-semibold text-fsa-navy-900">{formatNumber(row.price, locale)}</dd>
                    </>
                  )}
                </dl>
              </div>
            );
          })}
        </div>
          </>
        )}

        {bookingUrl && (
          <div className="mt-8 flex justify-center">
            <FsaButton href={bookingUrl} variant="navy" size="lg">{t("bookNow")}</FsaButton>
          </div>
        )}
      </div>
    </section>
  );
}
