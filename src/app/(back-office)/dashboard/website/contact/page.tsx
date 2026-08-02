"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "react-i18next";

interface LeadStatus { id: string; name: string }
interface ContactLead {
  id: string; fullName: string; phone: string | null; email: string | null;
  categoryInterest: string | null; notes: string | null; extraData: string | null;
  status: LeadStatus | null; createdAt: string;
}

function parseExtra(raw: string | null): Record<string, unknown> {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default function ContactSubmissionsPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: ContactLead[] }>({
    queryKey: ["admin-contact-leads"],
    queryFn: () => fetch("/api/applications?leadType=contact&perPage=100").then((r) => r.json()),
  });
  const { data: statuses = [] } = useQuery<LeadStatus[]>({ queryKey: ["admin-lead-statuses"], queryFn: () => fetch("/api/lead-statuses").then((r) => r.json()) });

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      fetch(`/api/leads/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status_id: statusId }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contact-leads"] }),
  });

  const leads = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("contact.title")} description={t("contact.subtitle")} />

      {isLoading ? (
        <div className="py-12 text-center text-gray-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
      ) : leads.length === 0 ? (
        <EmptyState icon={Mail} title={t("contact.empty")} description={t("contact.empty_body")} />
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const extra = parseExtra(lead.extraData);
            const expanded = expandedId === lead.id;
            return (
              <div key={lead.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <button onClick={() => setExpandedId(expanded ? null : lead.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <div>
                    <p className="font-medium">{lead.fullName} <span className="ms-2 text-xs font-normal text-gray-400">{(extra.subject as string) ?? lead.categoryInterest}</span></p>
                    <p className="text-xs text-gray-400">{lead.email} · {new Date(lead.createdAt).toLocaleDateString()}</p>
                  </div>
                  <select
                    value={lead.status?.id ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus({ id: lead.id, statusId: e.target.value })}
                    disabled={updating}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  >
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </button>
                {expanded && (
                  <div className="space-y-2 border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
                    <div><span className="text-gray-400">{t("contact.phone")}</span> {lead.phone ?? "—"}</div>
                    <div><span className="text-gray-400">{t("contact.enquiry")}</span> {lead.categoryInterest ?? "—"}</div>
                    <div><span className="text-gray-400">{t("contact.message")}</span> {lead.notes}</div>
                    <div className="text-xs text-gray-400">Marketing consent: {extra.marketingConsent ? "Yes" : "No"}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
