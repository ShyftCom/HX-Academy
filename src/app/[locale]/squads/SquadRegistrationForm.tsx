"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FsaButton } from "@/components/website/buttons/FsaButton";

interface Venue { id: string; name: string; wilaya: string }

const EMPTY = {
  parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "",
  playerFirstName: "", playerLastName: "", playerDateOfBirth: "", ageGroup: "", gender: "",
  preferredStationId: "", currentPlayingLevel: "", currentClub: "", medicalNotes: "", message: "",
  privacyConsent: false, marketingConsent: false, website: "",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fsa-navy-900" dir="auto">{label} {required && <span className="text-fsa-error">*</span>}
      </span>
      {children}
    </label>
  );
}

export function SquadRegistrationForm({ venues }: { venues: Venue[] }) {
  const t = useTranslations("squads.form");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.privacyConsent) { setErrorMsg(tErr("privacyRequired")); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/squad-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        // The API replies in English prose; map the status to a translated
        // string instead of showing the raw `message` to the visitor.
        setStatus("error");
        setErrorMsg(res.status === 429 ? tErr("tooManyRequests") : tErr("generic"));
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg(tErr("generic"));
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center rounded-fsa-md border border-fsa-border bg-white p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-fsa-success" />
        <h3 className="mt-4 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">{t("doneTitle")}</h3>
        <p className="mt-2 max-w-md text-fsa-text-muted">{t("doneBody")}</p>
      </div>
    );
  }

  const inputClass = "h-11 w-full rounded-lg border border-fsa-border bg-white px-3 text-sm text-fsa-text focus:border-fsa-heading-blue focus:outline-none focus:ring-1 focus:ring-fsa-heading-blue";

  return (
    <form onSubmit={onSubmit} className="rounded-fsa-md border border-fsa-border bg-white p-6 sm:p-10">
      {/* Honeypot */}
      <input type="text" value={form.website} onChange={(e) => set({ website: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <h3 className="mb-6 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">{t("heading")}</h3>

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-fsa-heading-blue">{t("parentLegend")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("firstName")} required><Input required value={form.parentFirstName} onChange={(e) => set({ parentFirstName: e.target.value })} className={inputClass} /></Field>
          <Field label={t("lastName")} required><Input required value={form.parentLastName} onChange={(e) => set({ parentLastName: e.target.value })} className={inputClass} /></Field>
          <Field label={t("email")} required><Input type="email" required value={form.parentEmail} onChange={(e) => set({ parentEmail: e.target.value })} className={inputClass} /></Field>
          <Field label={t("phone")} required><Input required value={form.parentPhone} onChange={(e) => set({ parentPhone: e.target.value })} className={inputClass} /></Field>
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-fsa-heading-blue">{t("playerLegend")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("firstName")} required><Input required value={form.playerFirstName} onChange={(e) => set({ playerFirstName: e.target.value })} className={inputClass} /></Field>
          <Field label={t("lastName")} required><Input required value={form.playerLastName} onChange={(e) => set({ playerLastName: e.target.value })} className={inputClass} /></Field>
          <Field label={t("dateOfBirth")}><Input type="date" value={form.playerDateOfBirth} onChange={(e) => set({ playerDateOfBirth: e.target.value })} className={inputClass} /></Field>
          <Field label={t("gender")}>
            <select value={form.gender} onChange={(e) => set({ gender: e.target.value })} className={inputClass}>
              <option value="">{tc("preferNotToSay")}</option>
              <option value="male">{tc("male")}</option>
              <option value="female">{tc("female")}</option>
            </select>
          </Field>
          <Field label={t("preferredLocation")}>
            <select value={form.preferredStationId} onChange={(e) => set({ preferredStationId: e.target.value })} className={inputClass}>
              <option value="">{tc("noPreference")}</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.wilaya}</option>)}
            </select>
          </Field>
          <Field label={t("currentPlayingLevel")}><Input value={form.currentPlayingLevel} onChange={(e) => set({ currentPlayingLevel: e.target.value })} className={inputClass} /></Field>
          <Field label={t("currentClub")}><Input value={form.currentClub} onChange={(e) => set({ currentClub: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="mt-4">
          <Field label={t("medicalNotes")}><Textarea value={form.medicalNotes} onChange={(e) => set({ medicalNotes: e.target.value })} rows={2} /></Field>
        </div>
      </fieldset>

      <div className="mb-6">
        <Field label={t("additionalMessage")}><Textarea value={form.message} onChange={(e) => set({ message: e.target.value })} rows={3} /></Field>
      </div>

      <div className="mb-6 space-y-3">
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" required checked={form.privacyConsent} onChange={(e) => set({ privacyConsent: e.target.checked })} className="mt-0.5" />
          {t("privacyConsent")} *
        </label>
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" checked={form.marketingConsent} onChange={(e) => set({ marketingConsent: e.target.checked })} className="mt-0.5" />
          {t("marketingConsent")}
        </label>
      </div>

      {errorMsg && <p className="mb-4 rounded-lg bg-fsa-error/10 px-4 py-2 text-sm text-fsa-error" role="alert">{errorMsg}</p>}

      <FsaButton type="submit" variant="sky" size="lg" disabled={status === "loading"} loading={status === "loading"} icon={status !== "loading"}>
        {status === "loading" ? t("submitting") : t("submit")}
      </FsaButton>
    </form>
  );
}
