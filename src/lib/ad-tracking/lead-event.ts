/**
 * The application-level "a lead was created" signal.
 *
 * Emitted by the apply flow only after POST /api/public/apply has returned a
 * created lead (not disqualified, not a duplicate, not an error). The ad
 * tracker (AdTrackingClient) listens for it; nothing here knows or cares which
 * platforms are enabled. It is independent of the Meta Pixel call that sits
 * next to it in the apply page — neither depends on the other.
 */
export const LEAD_REGISTRATION_COMPLETED = "hx:lead_registration_completed";

export interface LeadRegistrationCompletedDetail {
  /** The created lead's database id — the dedup key for every platform. */
  leadId: string;
}

/** Never throws: tracking must not be able to break the registration flow. */
export function emitLeadRegistrationCompleted(leadId: unknown): void {
  if (typeof leadId !== "string" || !leadId) return;
  try {
    window.dispatchEvent(
      new CustomEvent<LeadRegistrationCompletedDetail>(LEAD_REGISTRATION_COMPLETED, { detail: { leadId } }),
    );
  } catch {
    // ignore
  }
}
