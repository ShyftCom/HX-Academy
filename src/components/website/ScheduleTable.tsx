import { FsaButton } from "./buttons/FsaButton";

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

function fmtDob(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-fsa-success/15 text-fsa-success" },
  waitlist: { label: "Waitlist", className: "bg-amber-100 text-amber-700" },
  full: { label: "Full", className: "bg-fsa-error/15 text-fsa-error" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-500" },
};

export function ScheduleTable({ rows, bookingUrl }: { rows: ScheduleRow[]; bookingUrl?: string }) {
  if (rows.length === 0) return null;

  return (
    <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        <h2 className="mb-10 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">Programme Schedule</h2>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-fsa-md lg:block">
          <table className="w-full border-separate border-spacing-0 text-start">
            <tbody>
              {rows.map((row, i) => {
                const status = STATUS_LABEL[row.registrationStatus] ?? STATUS_LABEL.open;
                return (
                  <tr key={row.id}>
                    <td className={`bg-fsa-sky px-5 py-4 font-fsa-display text-lg font-bold uppercase text-fsa-navy-900 ${i === 0 ? "rounded-tl-fsa-md" : ""} ${i === rows.length - 1 ? "rounded-bl-fsa-md" : ""}`}>
                      {row.ageGroup}
                      {(row.dobStart || row.dobEnd) && <div className="text-xs font-normal normal-case opacity-80">{fmtDob(row.dobStart)} – {fmtDob(row.dobEnd)}</div>}
                    </td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">{row.sessionName ?? row.sessionType ?? "—"}</td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">
                      {row.day && <span className="font-semibold text-white">{row.day}</span>}
                      {row.startTime && <span> {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</span>}
                    </td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm text-white/90">{row.venue?.name ?? "—"}</td>
                    <td className="bg-fsa-navy-900 px-5 py-4 text-sm font-semibold text-white">{row.price != null ? `${row.price}` : "—"}</td>
                    <td className={`bg-fsa-navy-900 px-5 py-4 ${i === 0 ? "rounded-tr-fsa-md" : ""} ${i === rows.length - 1 ? "rounded-br-fsa-md" : ""}`}>
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
            const status = STATUS_LABEL[row.registrationStatus] ?? STATUS_LABEL.open;
            return (
              <div key={row.id} className="overflow-hidden rounded-fsa-md border border-fsa-border bg-white">
                <div className="flex items-center justify-between bg-fsa-sky px-4 py-3">
                  <span className="font-fsa-display text-base font-bold uppercase text-fsa-navy-900">{row.ageGroup}</span>
                  <span className={`rounded-fsa-pill px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 px-4 py-3 text-sm">
                  {(row.dobStart || row.dobEnd) && (
                    <>
                      <dt className="text-fsa-text-muted">Date of birth</dt>
                      <dd className="text-end text-fsa-navy-900">{fmtDob(row.dobStart)} – {fmtDob(row.dobEnd)}</dd>
                    </>
                  )}
                  <dt className="text-fsa-text-muted">Session</dt>
                  <dd className="text-end text-fsa-navy-900">{row.sessionName ?? row.sessionType ?? "—"}</dd>
                  <dt className="text-fsa-text-muted">Day &amp; time</dt>
                  <dd className="text-end text-fsa-navy-900">{row.day} {row.startTime}{row.endTime ? `–${row.endTime}` : ""}</dd>
                  <dt className="text-fsa-text-muted">Venue</dt>
                  <dd className="text-end text-fsa-navy-900">{row.venue?.name ?? "—"}</dd>
                  {row.price != null && (
                    <>
                      <dt className="text-fsa-text-muted">Price</dt>
                      <dd className="text-end font-semibold text-fsa-navy-900">{row.price}</dd>
                    </>
                  )}
                </dl>
              </div>
            );
          })}
        </div>

        {bookingUrl && (
          <div className="mt-8 flex justify-center">
            <FsaButton href={bookingUrl} variant="navy" size="lg">Book Now</FsaButton>
          </div>
        )}
      </div>
    </section>
  );
}
