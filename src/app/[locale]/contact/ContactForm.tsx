"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FsaButton } from "@/components/website/buttons/FsaButton";

const EMPTY = {
  firstName: "", lastName: "", email: "", phone: "", subject: "", enquiryType: "general",
  message: "", privacyConsent: false, marketingConsent: false, website: "",
};

const ENQUIRY_TYPES = [
  { value: "general", label: "General enquiry" },
  { value: "programmes", label: "Programmes" },
  { value: "squads", label: "Development Squads" },
  { value: "safeguarding", label: "Safeguarding" },
  { value: "other", label: "Other" },
];

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.privacyConsent) { setErrorMsg("Please accept the privacy policy to continue."); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); setErrorMsg(data.message || "Something went wrong. Please try again."); return; }
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center rounded-fsa-md border border-fsa-border bg-white p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-fsa-success" />
        <h3 className="mt-4 font-fsa-display text-2xl font-bold uppercase text-fsa-navy-900">Message Sent</h3>
        <p className="mt-2 max-w-md text-fsa-text-muted">Thanks for getting in touch — we will reply as soon as possible.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-fsa-md border border-fsa-border bg-white p-6 sm:p-8">
      <input type="text" value={form.website} onChange={(e) => set({ website: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-fsa-navy-900">
          First name <span className="text-fsa-error">*</span>
          <Input required value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          Last name <span className="text-fsa-error">*</span>
          <Input required value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          Email <span className="text-fsa-error">*</span>
          <Input type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900">
          Phone
          <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          Enquiry type
          <select value={form.enquiryType} onChange={(e) => set({ enquiryType: e.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-fsa-border bg-white px-3 text-sm">
            {ENQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          Subject <span className="text-fsa-error">*</span>
          <Input required value={form.subject} onChange={(e) => set({ subject: e.target.value })} className="mt-1.5" />
        </label>
        <label className="block text-sm font-medium text-fsa-navy-900 sm:col-span-2">
          Message <span className="text-fsa-error">*</span>
          <Textarea required rows={5} value={form.message} onChange={(e) => set({ message: e.target.value })} className="mt-1.5" />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" required checked={form.privacyConsent} onChange={(e) => set({ privacyConsent: e.target.checked })} className="mt-0.5" />
          I agree to the privacy policy. *
        </label>
        <label className="flex items-start gap-2 text-sm text-fsa-text">
          <input type="checkbox" checked={form.marketingConsent} onChange={(e) => set({ marketingConsent: e.target.checked })} className="mt-0.5" />
          I would like to receive news and updates from Football Skills Academy.
        </label>
      </div>

      {errorMsg && <p className="mt-4 rounded-lg bg-fsa-error/10 px-4 py-2 text-sm text-fsa-error" role="alert">{errorMsg}</p>}

      <FsaButton type="submit" variant="sky" size="lg" className="mt-6" disabled={status === "loading"} loading={status === "loading"} icon={status !== "loading"}>
        {status === "loading" ? "Sending…" : "Send Message"}
      </FsaButton>
    </form>
  );
}
