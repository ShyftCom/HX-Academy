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
import { Plus, Edit, Trash2, FileText, ChevronDown, ChevronUp, X } from "lucide-react";

const QTYPES = ["text", "number", "select", "radio", "checkbox", "textarea"];

export default function SurveysPage() {
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

  const { data: surveys, isLoading } = useQuery({ queryKey: ["surveys"], queryFn: () => fetch("/api/surveys").then((r) => r.json()) });
  const { data: surveyDetail } = useQuery({ queryKey: ["survey", selectedSurvey?.id], queryFn: () => fetch(`/api/surveys/${selectedSurvey.id}`).then((r) => r.json()), enabled: !!selectedSurvey?.id });

  const saveSurveyMutation = useMutation({
    mutationFn: async () => {
      const url = editSurvey ? `/api/surveys/${editSurvey.id}` : "/api/surveys";
      const res = await fetch(url, { method: editSurvey ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(surveyForm) });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => { toast.success("Survey saved"); qc.invalidateQueries({ queryKey: ["surveys"] }); setSurveyModal(false); setEditSurvey(null); },
    onError: () => toast.error("Save failed"),
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/surveys/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["surveys"] }); setDeleteSurveyId(null); },
    onError: () => toast.error("Delete failed"),
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
    onSuccess: () => { toast.success("Question saved"); qc.invalidateQueries({ queryKey: ["survey", selectedSurvey?.id] }); setQModal(false); setEditQ(null); setQForm({ question: "", questionType: "text", isRequired: false, options: [] }); },
    onError: () => toast.error("Save failed"),
  });

  const deleteQMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/surveys/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Question deleted"); qc.invalidateQueries({ queryKey: ["survey", selectedSurvey?.id] }); setDeleteQId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const openAddSurvey = () => { setEditSurvey(null); setSurveyForm({ title: "", description: "", isActive: true }); setSurveyModal(true); };
  const openEditSurvey = (s: any) => { setEditSurvey(s); setSurveyForm({ title: s.title, description: s.description ?? "", isActive: s.isActive }); setSurveyModal(true); };
  const openAddQ = () => { setEditQ(null); setQForm({ question: "", questionType: "text", isRequired: false, options: [] }); setQModal(true); };
  const openEditQ = (q: any) => { setEditQ(q); setQForm({ question: q.question, questionType: q.questionType, isRequired: q.isRequired, options: q.options ? JSON.parse(q.options) : [] }); setQModal(true); };

  const needsOptions = ["select", "radio", "checkbox"].includes(qForm.questionType);

  return (
    <div className="space-y-5">
      <PageHeader title="Survey Builder" description="Build surveys for lead registration">
        <Button onClick={openAddSurvey}><Plus className="me-2 h-4 w-4" />New Survey</Button>
      </PageHeader>

      {isLoading ? <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
        : surveys?.length === 0 ? <EmptyState icon={FileText} title="No surveys" description="Create a survey for your registration form" action={{ label: "New Survey", onClick: openAddSurvey }} />
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
                        <Button size="sm" onClick={openAddQ}><Plus className="me-1.5 h-3.5 w-3.5" />Add Question</Button>
                      </div>
                      <div className="space-y-2">
                        {surveyDetail?.questions?.map((q: any, i: number) => (
                          <div key={q.id} className="flex items-start justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">{q.questionType}</Badge>
                                {q.isRequired && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
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
            <Input label="Title *" value={surveyForm.title} onChange={(e) => setSurveyForm({ ...surveyForm, title: e.target.value })} placeholder="e.g. Registration Survey" />
            <Textarea label="Description" value={surveyForm.description} onChange={(e) => setSurveyForm({ ...surveyForm, description: e.target.value })} placeholder="Optional description" rows={2} />
            <div className="flex items-center gap-3"><Switch checked={surveyForm.isActive} onCheckedChange={(v) => setSurveyForm({ ...surveyForm, isActive: v })} /><span className="text-sm">Active</span></div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyModal(false)}>Cancel</Button>
            <Button onClick={() => saveSurveyMutation.mutate()} loading={saveSurveyMutation.isPending} disabled={!surveyForm.title}>{editSurvey ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={qModal} onOpenChange={setQModal}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editQ ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input label="Question *" value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} placeholder="Enter your question" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <Select value={qForm.questionType} onValueChange={(v) => setQForm({ ...qForm, questionType: v, options: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QTYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {needsOptions && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700">{opt}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => setQForm({ ...qForm, options: qForm.options.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add option" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (newOption.trim()) { setQForm({ ...qForm, options: [...qForm.options, newOption.trim()] }); setNewOption(""); } }}>Add</Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3"><Checkbox checked={qForm.isRequired} onCheckedChange={(v) => setQForm({ ...qForm, isRequired: !!v })} /><span className="text-sm">Required</span></div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQModal(false)}>Cancel</Button>
            <Button onClick={() => saveQMutation.mutate()} loading={saveQMutation.isPending} disabled={!qForm.question}>{editQ ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteSurveyId} onOpenChange={(o) => !o && setDeleteSurveyId(null)} title="Delete Survey" description="All questions and answers will be deleted." confirmLabel="Delete" onConfirm={() => deleteSurveyId && deleteSurveyMutation.mutate(deleteSurveyId)} loading={deleteSurveyMutation.isPending} />
      <ConfirmDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)} title="Delete Question" description="This question and all its answers will be deleted." confirmLabel="Delete" onConfirm={() => deleteQId && deleteQMutation.mutate(deleteQId)} loading={deleteQMutation.isPending} />
    </div>
  );
}
