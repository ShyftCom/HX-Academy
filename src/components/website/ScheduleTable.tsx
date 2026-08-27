import { getTranslations } from "next-intl/server";
import { FsaButton } from "./buttons/FsaButton";
import { formatDateShort, formatNumber } from "@/lib/public-format";

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
  startTime: string | null;
  endTime: string | null;
  venue: { name: string } | null;
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

export async function ScheduleTable({ rows, bookingUrl, locale }: { rows: ScheduleRow[]; bookingUrl?: string; locale: string }) {
  if (rows.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "schedule" });
  const fmtDob = (d: Date | string | null) => formatDateShort(d, locale);
  const statusOf = (raw: string) => {
    const key = (STATUS_KEYS as readonly string[]).includes(raw) ? raw : "open";
    return { label: t(`status.${key}`), className: STATUS_CLASS[key] };
  };

  return (
    <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        <h2 className="mb-10 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{t("heading")}</h2>

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
                      {row.day && <span className="font-semibold text-white">{row.day}</span>}
                      {row.startTime && <span> {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</span>}
                    </td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">{row.venue?.name ?? "—"}</td>
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
                  <dd className="text-end text-fsa-navy-900">{row.day} {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</dd>
                  <dt className="text-fsa-text-muted">{t("venue")}</dt>
                  <dd className="text-end text-fsa-navy-900">{row.venue?.name ?? "—"}</dd>
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

        {bookingUrl && (
          <div className="mt-8 flex justify-center">
            <FsaButton href={bookingUrl} variant="navy" size="lg">{t("bookNow")}</FsaButton>
          </div>
        )}
      </div>
    </section>
  );
}
