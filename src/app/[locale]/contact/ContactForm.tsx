"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FsaButton } from "@/components/website/buttons/FsaButton";

const EMPTY = {
  firstName: "", lastName: "", email: "", phone: "", subject: "", enquiryType: "general",
  message: "", privacyConsent: false, marketingConsent: false, website: "",
};

/** Values are the API contract and stay in English; only the labels translate. */
const ENQUIRY_TYPES = ["general", "programmes", "squads", "safeguarding", "other"] as const;

export function ContactForm() {
  const t = useTranslations("contact.form");
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
      const res = await fetch("/api/public/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        // The API's own `message` is English prose; it is not surfaced. The
        // status code is all the client needs to pick a translated string.
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
        <h3 className="mt-4 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">{t("sentTitle")}</h3>
        <p className="mt-2 max-w-md text-fsa-text-muted">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-fsa-md border border-fsa-border bg-white p-6 sm:p-8">
      <input type="text" value={form.website} onChange={(e) => set({ website: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-fsa-navy-900">
          {t("firstName")} <span className="text-fsa-error">*</span>
          <Input required value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          {t("lastName")} <span className="text-fsa-error">*</span>
          <Input required value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          {t("email")} <span className="text-fsa-error">*</span>
          <Input type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          {t("phone")}
          <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          {t("enquiryType")}
          <select value={form.enquiryType} onChange={(e) => set({ enquiryType: e.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-fsa-border bg-white px-3 text-sm">
            {ENQUIRY_TYPES.map((value) => <option key={value} value={value}>{t(`types.${value}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          {t("subject")} <span className="text-fsa-error">*</span>
          <Input required value={form.subject} onChange={(e) => set({ subject: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          {t("message")} <span className="text-fsa-error">*</span>
          <Textarea required rows={5} value={form.message} onChange={(e) => set({ message: e.target.value })} className="mt-1.5" />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" required checked={form.privacyConsent} onChange={(e) => set({ privacyConsent: e.target.checked })} className="mt-0.5" />
          {t("privacyConsent")} *
        </label>
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" checked={form.marketingConsent} onChange={(e) => set({ marketingConsent: e.target.checked })} className="mt-0.5" />
          {t("marketingConsent")}
        </label>
      </div>

      {errorMsg && <p className="mt-4 rounded-lg bg-fsa-error/10 px-4 py-2 text-sm text-fsa-error" role="alert">{errorMsg}</p>}

      <FsaButton type="submit" variant="sky" size="lg" className="mt-6" disabled={status === "loading"} loading={status === "loading"} icon={status !== "loading"}>
        {status === "loading" ? t("sending") : t("send")}
      </FsaButton>
    </form>
  );
}
