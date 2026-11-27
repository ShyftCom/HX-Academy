"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Receipt, Eye, Pencil } from "lucide-react";
import { useStation } from "@/context/StationContext";
import { useTranslation } from "react-i18next";
import { readJsonOrThrow, apiErrorMessage } from "@/lib/api-error";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";
import { PAYMENT_METHODS } from "@/lib/charge-fields";
import { chargeCategoryLabel } from "@/lib/charge-labels";
import { PeriodFilter, periodParams, useSeason, type Period } from "@/components/finance/period-filter";

function formatDA(n: number) { return Number(n).toLocaleString("fr-DZ") + " DA"; }
/** chargeDate is a calendar day stored as UTC midnight; format it in UTC or it shifts west of Greenwich. */
function formatChargeDay(d: string) { return new Date(d).toLocaleDateString("fr-DZ", { timeZone: "UTC" }); }

const selectCls = "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm";

/** Sentinel in the "Payé par" select for a payer who has no account. */
const OTHER_PAYER = "__other__";

interface ChargeRow {
  id: string;
  title: string;
  amount: string | number;
  chargeDate: string;
  notes: string | null;
  isSalary: boolean;
  paymentMethod: string | null;
  paidById: string | null;
  paidByName: string | null;
  categoryId: string | null;
  category: { id: string; name: string; color: string | null } | null;
  paidBy: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null } | null;
  staff: { fullName: string } | null;
  createdAt: string;
}

interface ChargeCategory { id: string; name: string; color: string | null; isGlobal: boolean }

interface ChargeForm {
  title: string;
  categoryId: string;
  amount: string;
  chargeDate: string;
  paymentMethod: string;
  /** A user id, OTHER_PAYER, or "" for not given. */
  payer: string;
  payerName: string;
  notes: string;
  isSalary: boolean;
}

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = (): ChargeForm => ({ title: "", categoryId: "", amount: "", chargeDate: today(), paymentMethod: "", payer: "", payerName: "", notes: "", isSalary: false });

function formFromCharge(c: ChargeRow): ChargeForm {
  return {
    title: c.title,
    categoryId: c.categoryId ?? "",
    amount: String(c.amount),
    chargeDate: c.chargeDate.slice(0, 10),
    paymentMethod: c.paymentMethod ?? "",
    payer: c.paidById ?? (c.paidByName ? OTHER_PAYER : ""),
    payerName: c.paidByName ?? "",
    notes: c.notes ?? "",
    isSalary: c.isSalary,
  };
}

function bodyFromForm(f: ChargeForm) {
  return {
    title: f.title.trim(),
    categoryId: f.categoryId,
    amount: Number(f.amount),
    chargeDate: f.chargeDate,
    paymentMethod: f.paymentMethod || null,
    paidById: f.payer && f.payer !== OTHER_PAYER ? f.payer : null,
    paidByName: f.payer === OTHER_PAYER ? f.payerName.trim() || null : null,
    notes: f.notes,
    isSalary: f.isSalary,
  };
}

/** The name of whoever paid, from an account or typed by hand. */
function payerName(c: ChargeRow) {
  return c.paidBy?.name ?? c.paidByName ?? null;
}

export default function ChargesPage() {
  const { t } = useTranslation("finance");
  const { activeStationId } = useStation();
  const qc = useQueryClient();
  // Mirrors the charge routes: recording is routine, rewriting history is not.
  // Hiding is presentation only — the routes enforce the same rules.
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.CHARGES_CREATE);
  const canEdit = can(PERMISSIONS.CHARGES_EDIT);
  const canManageCategories = canEdit;
  const canDelete = can(PERMISSIONS.CHARGES_DELETE);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6B7280");
  const [period, setPeriod] = useState<Period>({ preset: "this_month", customFrom: "", customTo: "" });
  const { data: season, isLoading: seasonLoading } = useSeason();
  const range = periodParams(period, season);

  const chargeParams = new URLSearchParams({ ...(range ?? {}), ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: charges = [] } = useQuery<ChargeRow[]>({
    queryKey: ["charges", activeStationId, range?.dateFrom ?? null, range?.dateTo ?? null],
    queryFn: () => fetch(`/api/charges?${chargeParams}`).then(readJsonOrThrow<ChargeRow[]>),
    enabled: range !== null && !(period.preset === "season" && seasonLoading),
  });
  const total = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const detail = charges.find((c) => c.id === detailId) ?? null;

  const catParams = new URLSearchParams({ ...(activeStationId ? { stationId: activeStationId } : {}) });
  const { data: categories = [] } = useQuery<ChargeCategory[]>({
    queryKey: ["charge-categories", activeStationId],
    queryFn: () => fetch(`/api/charges/categories?${catParams}`).then((r) => r.json()),
  });

  const deleteCharge = useMutation({
    mutationFn: (id: string) => fetch(`/api/charges/${id}`, { method: "DELETE" }).then(readJsonOrThrow),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charges"] }); toast.success(t("charges.deleted")); },
    onError: (e) => toast.error(apiErrorMessage(e, t, t("common:toast.delete_failed"))),
  });

  const createCategory = useMutation({
    mutationFn: (data: { name: string; color: string; stationId: string | null }) => fetch("/api/charges/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(readJsonOrThrow),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charge-categories"] }); toast.success(t("charges.category_created")); setCatName(""); setCatOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e, t, t("common:toast.save_failed"))),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => fetch(`/api/charges/categories/${id}`, { method: "DELETE" }).then(readJsonOrThrow),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charge-categories"] }),
    onError: (e) => toast.error(apiErrorMessage(e, t, t("common:toast.delete_failed"))),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t("charges.title")}</h1><p className="text-sm text-gray-500">{t("charges.subtitle")}</p></div>
        <div className="flex gap-2">
          {canManageCategories && <Button variant="outline" onClick={() => setCatOpen(!catOpen)}>{t("charges.manage_categories")}</Button>}
          {canCreate && <Button onClick={() => setAddOpen(true)}><Plus className="me-2 h-4 w-4" />{t("charges.add")}</Button>}
        </div>
      </div>

      {catOpen && canManageCategories && (
        <Card>
          <CardHeader><CardTitle>{t("charges.categories_title")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color ?? "#6B7280" }} />
                  {chargeCategoryLabel(c.name, t)}
                  {!c.isGlobal && (
                    <button onClick={() => deleteCategory.mutate(c.id)} className="ms-1 text-gray-400 hover:text-red-500" aria-label={t("common:ui.delete")}><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="h-9 w-9 rounded border p-1 cursor-pointer" />
              <Input placeholder={t("charges.category_ph")} value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1" />
              <Button size="sm" disabled={!catName || createCategory.isPending} onClick={() => createCategory.mutate({ name: catName, color: catColor, stationId: activeStationId })}>{t("common:ui.add")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{t("charges.list")}</CardTitle>
          <PeriodFilter value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500">
              <th className="text-start py-2 pe-4">{t("common:ui.date")}</th>
              <th className="text-start py-2 pe-4">{t("common:ui.title_field")}</th>
              <th className="text-start py-2 pe-4">{t("common:ui.category")}</th>
              <th className="text-start py-2 pe-4">{t("charges.payment_method")}</th>
              <th className="text-start py-2 pe-4">{t("charges.paid_by")}</th>
              <th className="text-end py-2 pe-4">{t("common:ui.amount")}</th>
              <th className="text-end py-2">{t("common:ui.actions")}</th>
            </tr></thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="py-3 pe-4 text-gray-500">{formatChargeDay(c.chargeDate)}</td>
                  <td className="py-3 pe-4 font-medium">
                    {c.title}
                    {c.isSalary && <Badge variant="secondary" className="ms-2">{t("charges.salary")}</Badge>}
                  </td>
                  <td className="py-3 pe-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-300">{c.paymentMethod ? t(`charges.payment_methods.${c.paymentMethod}`) : "—"}</td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-300">{payerName(c) ?? "—"}</td>
                  <td className="py-3 pe-4 text-end font-medium text-red-500 whitespace-nowrap">{formatDA(Number(c.amount))}</td>
                  <td className="py-3 text-end whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setDetailId(c.id)} title={t("charges.view_details")} aria-label={t("charges.view_details")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" aria-label={t("common:ui.delete")} onClick={() => { if (confirm(t("common:bo.finance.delete_charge_confirm"))) deleteCharge.mutate(c.id); }}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {charges.length > 0 && (
              <tfoot><tr className="border-t font-semibold">
                <td className="py-3 pe-4" colSpan={5}>{t("charges.period_total", { count: charges.length })}</td>
                <td className="py-3 pe-4 text-end text-red-500 whitespace-nowrap">{formatDA(total)}</td>
                <td />
              </tr></tfoot>
            )}
          </table>
          {!charges.length && <p className="py-8 text-center text-sm text-gray-400">{t("charges.empty")}</p>}
        </CardContent>
      </Card>

      {addOpen && (
        <ChargeFormDialog
          title={t("charges.add")}
          initial={emptyForm()}
          categories={categories}
          submitLabel={t("common:bo.finance.add_charge")}
          onClose={() => setAddOpen(false)}
          onSubmit={(body) => fetch("/api/charges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, stationId: activeStationId }) }).then(readJsonOrThrow)}
          successMessage={t("charges.added")}
          failMessage={t("charges.add_failed")}
        />
      )}

      {detail && (
        <ChargeDetailDialog charge={detail} canEdit={canEdit} categories={categories} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: ChargeRow["category"] }) {
  const { t } = useTranslation("finance");
  if (!category) return <span className="text-gray-400">—</span>;
  const color = category.color ?? "#6B7280";
  return <Badge style={{ background: color + "20", color, border: `1px solid ${color}40` }}>{chargeCategoryLabel(category.name, t)}</Badge>;
}

function useStaffPayers() {
  return useQuery<{ data: { id: string; name: string | null }[] }>({
    queryKey: ["users", "back-office-active"],
    queryFn: () => fetch("/api/users?backOffice=true&perPage=200").then(readJsonOrThrow<{ data: { id: string; name: string | null }[] }>),
    staleTime: 5 * 60_000,
  });
}

function ChargeFormDialog({ title, initial, categories, submitLabel, onClose, onSubmit, successMessage, failMessage }: {
  title: string;
  initial: ChargeForm;
  categories: { id: string; name: string }[];
  submitLabel: string;
  onClose: () => void;
  onSubmit: (body: ReturnType<typeof bodyFromForm>) => Promise<unknown>;
  successMessage: string;
  failMessage: string;
}) {
  const { t } = useTranslation("finance");
  const qc = useQueryClient();
  const [form, setForm] = useState<ChargeForm>(initial);
  const { data: payers } = useStaffPayers();
  const set = <K extends keyof ChargeForm>(k: K, v: ChargeForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => onSubmit(bodyFromForm(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["charges"] }); qc.invalidateQueries({ queryKey: ["finance-profit"] }); toast.success(successMessage); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t, failMessage)),
  });
  const payerMissing = form.payer === OTHER_PAYER && !form.payerName.trim();
  const valid = !!form.title.trim() && Number(form.amount) > 0 && !!form.chargeDate && !payerMissing;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1"><Label>{t("common:ui.title_field")} <span className="text-red-500">*</span></Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("common:ui.category")}</Label>
              <select className={selectCls} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">{t("charges.no_category")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{chargeCategoryLabel(c.name, t)}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>{t("charges.amount_da")} <span className="text-red-500">*</span></Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>{t("common:ui.date")} <span className="text-red-500">*</span></Label><Input type="date" value={form.chargeDate} onChange={(e) => set("chargeDate", e.target.value)} /></div>
            <div className="space-y-1">
              <Label>{t("charges.payment_method")}</Label>
              <select className={selectCls} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                <option value="">{t("charges.not_specified")}</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`charges.payment_methods.${m}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("charges.paid_by")}</Label>
            <select className={selectCls} value={form.payer} onChange={(e) => set("payer", e.target.value)}>
              <option value="">{t("charges.not_specified")}</option>
              {payers?.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              <option value={OTHER_PAYER}>{t("charges.paid_by_other")}</option>
            </select>
            {form.payer === OTHER_PAYER && (
              <Input className="mt-2" placeholder={t("charges.paid_by_other_ph")} value={form.payerName} onChange={(e) => set("payerName", e.target.value)} maxLength={120} />
            )}
          </div>
          <div className="space-y-1"><Label>{t("common:ui.notes")}</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isSalary} onChange={(e) => set("isSalary", e.target.checked)} />
            {t("common:bo.finance.is_salary")}
          </label>
          <Button className="w-full" disabled={!valid || save.isPending} loading={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? t("common:bo.adding") : submitLabel}
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Read-only for everyone; whoever holds charges:edit (Super Admin by default)
 * can switch it to the edit form.
 */
function ChargeDetailDialog({ charge, canEdit, categories, onClose }: {
  charge: ChargeRow;
  canEdit: boolean;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation("finance");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ChargeFormDialog
        title={t("charges.edit")}
        initial={formFromCharge(charge)}
        categories={categories}
        submitLabel={t("common:bo.save_changes")}
        onClose={() => setEditing(false)}
        onSubmit={(body) => fetch(`/api/charges/${charge.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(readJsonOrThrow)}
        successMessage={t("charges.updated")}
        failMessage={t("common:toast.save_failed")}
      />
    );
  }

  const rows: [string, React.ReactNode][] = [
    [t("common:ui.title_field"), charge.title],
    [t("common:ui.category"), <CategoryBadge key="c" category={charge.category} />],
    [t("common:ui.amount"), <span key="a" className="font-semibold text-red-500">{formatDA(Number(charge.amount))}</span>],
    [t("common:ui.date"), formatChargeDay(charge.chargeDate)],
    [t("charges.payment_method"), charge.paymentMethod ? t(`charges.payment_methods.${charge.paymentMethod}`) : "—"],
    [t("charges.paid_by"), payerName(charge) ?? "—"],
    [t("common:bo.finance.is_salary"), charge.isSalary ? (charge.staff?.fullName ?? t("charges.yes")) : t("charges.no")],
    [t("charges.recorded_by"), charge.createdBy?.name ? `${charge.createdBy.name} · ${new Date(charge.createdAt).toLocaleString("fr-DZ")}` : new Date(charge.createdAt).toLocaleString("fr-DZ")],
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("charges.details")}</DialogTitle></DialogHeader>
        <DialogBody>
        <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-3 py-2">
              <dt className="text-gray-500">{label}</dt>
              <dd className="col-span-2">{value}</dd>
            </div>
          ))}
          <div className="py-2">
            <dt className="mb-1 text-gray-500">{t("common:ui.notes")}</dt>
            <dd className="whitespace-pre-wrap break-words">{charge.notes || <span className="text-gray-400">{t("charges.no_notes")}</span>}</dd>
          </div>
        </dl>
        {canEdit && (
          <Button variant="outline" className="mt-3 w-full" onClick={() => setEditing(true)}>
            <Pencil className="me-2 h-4 w-4" />{t("charges.edit")}
          </Button>
        )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
