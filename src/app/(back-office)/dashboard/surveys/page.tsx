"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { Plus, Edit, Trash2, FileText, X, ClipboardList, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { APPLICATION_SURVEY_SETTING } from "@/lib/setting-keys";

const QTYPES = ["text", "number", "select", "radio", "checkbox", "textarea"];

/** Sentinel for "no survey" — Radix Select cannot hold an empty string as a value. */
const NO_SURVEY = "__none__";

export default function SurveysPage() {
  const { t } = useTranslation("surveys");
  const qc = useQueryClient();
  const [surveyModal, setSurveyModal] = useState(false);
  const [editSurvey, setEditSurvey] = useState<any>(null);
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);
  const [surveyForm, setSurveyForm] = useState({ title: "", description: "", isActive: true });
  const [qModal, setQModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [qForm, setQForm] = useState({ question: "", questionType: "text", isRequired: false, options: [] as string[] });
  const [newOption, setNewOption] = useState("");
  /** Only set once the admin touches the select; otherwise the saved setting shows through. */
  const [pickedSurveyId, setPickedSurveyId] = useState<string | undefined>(undefined);

  const { data: surveys, isLoading } = useQuery({ queryKey: ["surveys"], queryFn: () => fetch("/api/surveys").then((r) => r.json()) });
  const { data: surveyDetail } = useQuery({ queryKey: ["survey", selectedSurvey?.id], queryFn: () => fetch(`/api/surveys/${selectedSurvey.id}`).then((r) => r.json()), enabled: !!selectedSurvey?.id });

  // Which survey the public application form asks. Stored as a setting rather
  // than a column, because "in use on the form" is a property of the form, not
  // of the survey — only one can hold it at a time.
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["settings"], queryFn: () => fetch("/api/settings").then((r) => r.json()) });
  const savedSurveyId = settings?.[APPLICATION_SURVEY_SETTING] ?? "";

  // Derived rather than copied into state by an effect: the select shows the
  // admin's pick if they have made one, otherwise whatever is saved, and
  // undefined until the settings land so it never flashes "No survey" first.
  const formSurveyId = pickedSurveyId ?? (settings ? savedSurveyId || NO_SURVEY : undefined);

  const saveFormSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [APPLICATION_SURVEY_SETTING]: id === NO_SURVEY ? "" : id }),
      });
      const json = await res.json();
      // settings:edit is a separate permission from survey editing, so surface
      // what the server said rather than a generic failure.
      if (!res.ok) throw new Error(json.error ?? t("common:toast.save_failed"));
      return json;
    },
    onSuccess: () => { toast.success(t("form_survey.saved")); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const chosenSurvey = surveys?.find((s: any) => s.id === formSurveyId);
  const chosenIsInactive = Boolean(chosenSurvey && !chosenSurvey.isActive);
  const chosenHasNoQuestions = Boolean(chosenSurvey && (chosenSurvey._count?.questions ?? 0) === 0);

  const saveSurveyMutation = useMutation({
    mutationFn: async () => {
      const url = editSurvey ? `/api/surveys/${editSurvey.id}` : "/api/surveys";
      const res = await fetch(url, { method: editSurvey ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(surveyForm) });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["surveys"] }); setSurveyModal(false); setEditSurvey(null); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/surveys/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["surveys"] }); setDeleteSurveyId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const saveQMutation = useMutation({
    mutationFn: async () => {
      const body = { ...qForm, options: qForm.options.length ? qForm.options : undefined };
      if (editQ) {
        const res = await fetch(`/api/surveys/questions/${editQ.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("Failed"); return res.json();
      }
      const res = await fetch(`/api/surveys/${selectedSurvey.id}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => { toast.success(t("question_saved")); qc.invalidateQueries({ queryKey: ["survey", selectedSurvey?.id] }); setQModal(false); setEditQ(null); setQForm({ question: "", questionType: "text", isRequired: false, options: [] }); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteQMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/surveys/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("question_deleted")); qc.invalidateQueries({ queryKey: ["survey", selectedSurvey?.id] }); setDeleteQId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const openAddSurvey = () => { setEditSurvey(null); setSurveyForm({ title: "", description: "", isActive: true }); setSurveyModal(true); };
  const openEditSurvey = (s: any) => { setEditSurvey(s); setSurveyForm({ title: s.title, description: s.description ?? "", isActive: s.isActive }); setSurveyModal(true); };
  const openAddQ = () => { setEditQ(null); setQForm({ question: "", questionType: "text", isRequired: false, options: [] }); setQModal(true); };
  const openEditQ = (q: any) => { setEditQ(q); setQForm({ question: q.question, questionType: q.questionType, isRequired: q.isRequired, options: q.options ? JSON.parse(q.options) : [] }); setQModal(true); };

  const needsOptions = ["select", "radio", "checkbox"].includes(qForm.questionType);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")}>
        <Button onClick={openAddSurvey}><Plus className="me-2 h-4 w-4" />{t("new")}</Button>
      </PageHeader>

      {/* Which survey the public application form asks, if any. */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <h3 className="font-semibold">{t("form_survey.heading")}</h3>
              <p className="text-sm text-gray-500">{t("form_survey.body")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Select value={formSurveyId} onValueChange={setPickedSurveyId} disabled={!settings}>
                <SelectTrigger><SelectValue placeholder={t("form_survey.placeholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SURVEY}>{t("form_survey.none")}</SelectItem>
                  {surveys?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} — {s._count?.questions ?? 0} {t("form_survey.questions_suffix")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => formSurveyId && saveFormSurveyMutation.mutate(formSurveyId)}
              loading={saveFormSurveyMutation.isPending}
              disabled={!formSurveyId || formSurveyId === (savedSurveyId || NO_SURVEY)}
            >
              {t("form_survey.save")}
            </Button>
          </div>
          {/* Two ways the chosen survey still would not appear on the form. */}
          {chosenIsInactive && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t("form_survey.inactive_warning")}
            </p>
          )}
          {chosenHasNoQuestions && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t("form_survey.empty_warning")}
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
        : surveys?.length === 0 ? <EmptyState icon={FileText} title={t("empty")} description={t("empty_body")} action={{ label: t("new"), onClick: openAddSurvey }} />
        : (
          <div className="space-y-3">
            {surveys?.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{s.title}</h3>
                        <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                        {s.id === savedSurveyId && <Badge variant="outline">{t("form_survey.in_use")}</Badge>}
                      </div>
                      {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{s._count?.questions ?? 0} questions · {s._count?.answers ?? 0} responses</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSurvey(selectedSurvey?.id === s.id ? null : s)}><FileText className="me-1.5 h-3.5 w-3.5" />{selectedSurvey?.id === s.id ? "Hide" : "Questions"}</Button>
                      <Button variant="outline" size="sm" onClick={() => openEditSurvey(s)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteSurveyId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {selectedSurvey?.id === s.id && (
                    <div className="mt-4 border-t pt-4 dark:border-gray-700">
                      <div className="flex justify-between mb-3">
                        <p className="text-sm font-medium">Questions ({surveyDetail?.questions?.length ?? 0})</p>
                        <Button size="sm" onClick={openAddQ}><Plus className="me-1.5 h-3.5 w-3.5" />{t("add_question")}</Button>
                      </div>
                      <div className="space-y-2">
                        {surveyDetail?.questions?.map((q: any, i: number) => (
                          <div key={q.id} className="flex items-start justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">{q.questionType}</Badge>
                                {q.isRequired && <Badge variant="destructive" className="text-[10px]">{t("required")}</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => openEditQ(q)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon-sm" className="text-red-500" onClick={() => setDeleteQId(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      {/* Survey Modal */}
      <Dialog open={surveyModal} onOpenChange={setSurveyModal}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editSurvey ? "Edit Survey" : "New Survey"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label={t("title_req")} value={surveyForm.title} onChange={(e) => setSurveyForm({ ...surveyForm, title: e.target.value })} placeholder={t("title_ph")} />
            <Textarea label={t("common:ui.description")} value={surveyForm.description} onChange={(e) => setSurveyForm({ ...surveyForm, description: e.target.value })} placeholder={t("description_ph")} rows={2} />
            <div className="flex items-center gap-3"><Switch checked={surveyForm.isActive} onCheckedChange={(v) => setSurveyForm({ ...surveyForm, isActive: v })} /><span className="text-sm">{t("common:ui.active")}</span></div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyModal(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => saveSurveyMutation.mutate()} loading={saveSurveyMutation.isPending} disabled={!surveyForm.title}>{editSurvey ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={qModal} onOpenChange={setQModal}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editQ ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label={t("question_req")} value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} placeholder={t("question_ph")} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("type")}</label>
              <Select value={qForm.questionType} onValueChange={(v) => setQForm({ ...qForm, questionType: v, options: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QTYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {needsOptions && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("options")}</label>
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700">{opt}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => setQForm({ ...qForm, options: qForm.options.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder={t("add_option")} />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (newOption.trim()) { setQForm({ ...qForm, options: [...qForm.options, newOption.trim()] }); setNewOption(""); } }}>{t("common:ui.add")}</Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3"><Checkbox checked={qForm.isRequired} onCheckedChange={(v) => setQForm({ ...qForm, isRequired: !!v })} /><span className="text-sm">{t("required")}</span></div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQModal(false)}>{t("common:ui.cancel")}</Button>
            <Button onClick={() => saveQMutation.mutate()} loading={saveQMutation.isPending} disabled={!qForm.question}>{editQ ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteSurveyId} onOpenChange={(o) => !o && setDeleteSurveyId(null)} title={t("delete_survey")} description={t("delete_survey_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteSurveyId && deleteSurveyMutation.mutate(deleteSurveyId)} loading={deleteSurveyMutation.isPending} />
      <ConfirmDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)} title={t("delete_question")} description={t("delete_question_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteQId && deleteQMutation.mutate(deleteQId)} loading={deleteQMutation.isPending} />
    </div>
  );
}
