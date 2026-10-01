"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { FullPageLoader } from "@/components/shared/loading-spinner";
import { uploadFile } from "@/lib/upload-client";
import { useTranslation } from "react-i18next";

interface Requirement {
  id: string;
  title: string;
  description?: string | null;
  isRequired: boolean;
  allowedTypes: string;
  maxSizeMb: number;
}

interface PlayerDocument {
  id: string;
  requirementId?: string | null;
  fileName: string;
  fileUrl: string;
}

export default function PlayerDocumentsPage() {
  const { t } = useTranslation("common");
  const qc = useQueryClient();
  /** Per-requirement upload progress; absent means idle. */
  const [progress, setProgress] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery<{ requirements: Requirement[]; documents: PlayerDocument[] }>({
    queryKey: ["player-documents"],
    queryFn: () => fetch("/api/player/documents").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/player/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("portal.documents.toast_remove_failed"));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["player-documents"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(req: Requirement, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clearing the input lets the player re-pick the same file after a failure.
    e.target.value = "";
    if (!file) return;

    setProgress((p) => ({ ...p, [req.id]: 0 }));
    try {
      const blob = await uploadFile(file, {
        folder: "documents",
        maxSizeMb: req.maxSizeMb,
        onProgress: (percentage) => setProgress((p) => ({ ...p, [req.id]: percentage })),
      });

      const res = await fetch("/api/player/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirementId: req.id, ...blob }),
      });
      if (!res.ok) throw new Error(t("portal.documents.toast_save_failed"));

      toast.success(t("portal.documents.toast_uploaded", { title: req.title }));
      qc.invalidateQueries({ queryKey: ["player-documents"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("portal.common.upload_failed"));
    } finally {
      // In a finally block so a thrown error can never strand the spinner —
      // the bug the old upload box had.
      setProgress((p) => {
        const next = { ...p };
        delete next[req.id];
        return next;
      });
    }
  }

  if (isLoading) return <FullPageLoader />;

  const requirements = data?.requirements ?? [];
  const byRequirement = new Map((data?.documents ?? []).map((d) => [d.requirementId ?? "", d]));
  const required = requirements.filter((r) => r.isRequired);
  const doneCount = required.filter((r) => byRequirement.has(r.id)).length;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("portal.documents.title")}</h1>
        <p className="text-sm text-gray-500">{t("portal.documents.intro")}</p>
      </div>

      {required.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{t("portal.documents.progress", { done: doneCount, total: required.length })}</span>
              {doneCount === required.length && <span className="flex items-center gap-1 text-green-600"><Check className="h-4 w-4" />{t("portal.documents.all_done")}</span>}
            </div>
            <Progress value={(doneCount / required.length) * 100} />
          </CardContent>
        </Card>
      )}

      {requirements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-400">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            {t("portal.documents.none_requested")}
          </CardContent>
        </Card>
      ) : (
        requirements.map((req) => {
          const uploaded = byRequirement.get(req.id);
          const pct = progress[req.id];
          const busy = pct !== undefined;

          return (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{req.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${req.isRequired ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {req.isRequired ? t("portal.documents.required") : t("portal.documents.optional")}
                      </span>
                    </div>
                    {req.description && <p className="mt-0.5 text-sm text-gray-500">{req.description}</p>}
                    <p className="mt-1 text-xs text-gray-400">{t("portal.documents.accepted", { types: req.allowedTypes, size: req.maxSizeMb })}</p>
                  </div>
                  {uploaded && <Check className="h-5 w-5 shrink-0 text-green-500" />}
                </div>

                {busy ? (
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("portal.documents.uploading_pct", { pct: Math.round(pct) })}
                    </div>
                    <Progress value={pct} />
                  </div>
                ) : uploaded ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
                    <a
                      href={uploaded.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-green-700 hover:underline dark:text-green-400"
                    >
                      <span className="truncate">{uploaded.fileName}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <label className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
                      <input type="file" className="hidden" accept={req.allowedTypes} onChange={(e) => handleUpload(req, e)} />
                      {t("portal.documents.replace")}
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(uploaded.id)}
                      aria-label={t("portal.documents.remove", { title: req.title })}
                      className="text-gray-400 transition-colors hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input type="file" className="hidden" accept={req.allowedTypes} onChange={(e) => handleUpload(req, e)} />
                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:hover:border-blue-600 dark:hover:bg-blue-900/10">
                      <Upload className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-500">{t("portal.documents.click_to_upload")}</span>
                    </div>
                  </label>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
