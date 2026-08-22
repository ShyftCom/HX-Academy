"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, parseJsonSafe } from "@/lib/utils";
import { Plus, MoreHorizontal, Edit, Trash2, Upload, Package, X, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permission-names";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price required"),
  discountPrice: z.string().optional(),
  stock: z.string(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string(),
  isFeatured: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const { t } = useTranslation("store");

  // Mirrors the gates the store routes now enforce. The store nav needs
  // store:view, so a role granted only that would otherwise be shown controls
  // that can answer nothing but 403.
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.STORE_CREATE);
  const canEdit = can(PERMISSIONS.STORE_EDIT);
  const canDelete = can(PERMISSIONS.STORE_DELETE);

  const qc = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, catFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      if (catFilter && catFilter !== "all") p.set("categoryId", catFilter);
      return fetch(`/api/products?${p}`).then((r) => r.json());
    },
  });

  const { data: categories } = useQuery({ queryKey: ["product-categories"], queryFn: () => fetch("/api/products/categories").then((r) => r.json()) });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "active", isFeatured: false, stock: "0" },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const body = { ...values, price: parseFloat(values.price), discountPrice: values.discountPrice ? parseFloat(values.discountPrice) : null, stock: parseInt(values.stock), images };
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const res = await fetch(url, { method: editProduct ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast.success(editProduct ? "Product updated" : "Product created"); qc.invalidateQueries({ queryKey: ["products"] }); setModalOpen(false); reset(); setImages([]); setEditProduct(null); },
    onError: () => toast.error(t("common:toast.save_failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("products.deleted")); qc.invalidateQueries({ queryKey: ["products"] }); setDeleteId(null); },
    onError: () => toast.error(t("common:toast.delete_failed")),
  });

  const openAdd = () => { setEditProduct(null); setImages([]); reset({ name: "", description: "", price: "", discountPrice: "", stock: "0", sku: "", categoryId: "", status: "active", isFeatured: false }); setModalOpen(true); };
  const openEdit = (p: any) => { setEditProduct(p); setImages(parseJsonSafe<string[]>(p.images, [])); reset({ name: p.name, description: p.description ?? "", price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : "", stock: String(p.stock), sku: p.sku ?? "", categoryId: p.categoryId ?? "", status: p.status, isFeatured: p.isFeatured }); setModalOpen(true); };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImg(true);
    const fd = new FormData(); fd.append("file", file); fd.append("folder", "products");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) { setImages([...images, d.url]); toast.success(t("products.image_uploaded")); }
    else toast.error(t("common:toast.upload_failed"));
    setUploadingImg(false);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">{t("products.out_of_stock")}</Badge>;
    if (stock < 5) return <Badge variant="warning">{stock} left</Badge>;
    return <Badge variant="success">{stock}</Badge>;
  };

  const columns = [
    { key: "name", header: "Product", cell: (r: any) => {
      const imgs = parseJsonSafe<string[]>(r.images, []);
      return (
        <div className="flex items-center gap-3">
          {imgs[0] ? <img src={imgs[0]} alt={r.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"><Package className="h-5 w-5 text-gray-400" /></div>}
          <div><p className="font-medium text-sm">{r.name}</p>{r.sku && <p className="text-xs text-gray-400">SKU: {r.sku}</p>}</div>
        </div>
      );
    }},
    { key: "category", header: "Category", cell: (r: any) => r.category?.name ?? "—" },
    { key: "price", header: "Price", cell: (r: any) => (
      <div>
        {r.discountPrice ? <><p className="font-medium text-sm">{formatCurrency(r.discountPrice)}</p><p className="text-xs line-through text-gray-400">{formatCurrency(r.price)}</p></> : <p className="font-medium text-sm">{formatCurrency(r.price)}</p>}
      </div>
    )},
    { key: "stock", header: "Stock", cell: (r: any) => getStockBadge(r.stock) },
    { key: "status", header: "Status", cell: (r: any) => <Badge variant={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge> },
    { key: "featured", header: "Featured", cell: (r: any) => r.isFeatured ? <Badge variant="default">{t("products.featured")}</Badge> : null },
    { key: "actions", header: "", cell: (r: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="me-2 h-4 w-4" />{t("common:ui.edit")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => router.push(`/dashboard/store/products/${r.id}/variants`)}><Layers className="me-2 h-4 w-4" />{t("products.manage_variants")}</DropdownMenuItem>
          {canDelete && <DropdownMenuItem onClick={() => setDeleteId(r.id)} destructive><Trash2 className="me-2 h-4 w-4" />{t("common:ui.delete")}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("products.title")} description={t("products.subtitle")}>
        {canCreate && <Button onClick={openAdd}><Plus className="me-2 h-4 w-4" />{t("products.add")}</Button>}
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t("products.search")} className="w-64" />
        <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("common:ui.all_categories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common:ui.all_categories")}</SelectItem>
            {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage={t("products.empty")} emptyIcon={<Package className="h-8 w-8" />} />
      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={20} onPageChange={setPage} />}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="2xl">
          <DialogHeader><DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
            <DialogBody className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <Input {...register("name")} label={t("products.name")} placeholder={t("products.name_ph")} error={errors.name?.message} className="col-span-2" />
              <Textarea {...register("description")} label={t("common:ui.description")} placeholder={t("products.description_ph")} className="col-span-2" rows={2} />
              <Input {...register("price")} label={t("products.price")} type="number" min="0" placeholder="2500" error={errors.price?.message} />
              <Input {...register("discountPrice")} label={t("products.discount_price")} type="number" min="0" placeholder={t("products.optional")} />
              <Input {...register("stock")} label={t("products.stock")} type="number" min="0" placeholder="0" />
              <Input {...register("sku")} label={t("common:ui.sku")} placeholder={t("products.sku_ph")} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("common:ui.category")}</label>
                <Select onValueChange={(v) => setValue("categoryId", v)} defaultValue={editProduct?.categoryId ?? ""}>
                  <SelectTrigger><SelectValue placeholder={t("products.select_category")} /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("common:ui.status")}</label>
                <Select onValueChange={(v) => setValue("status", v)} defaultValue={editProduct?.status ?? "active"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">{t("common:ui.active")}</SelectItem><SelectItem value="inactive">{t("products.inactive")}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={watch("isFeatured")} onCheckedChange={(v) => setValue("isFeatured", v)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t("products.featured_toggle")}</span>
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("products.images")}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative"><img src={img} className="h-16 w-16 rounded-lg object-cover border" /><button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"><X className="h-2.5 w-2.5" /></button></div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 dark:border-gray-600">
                    <input type="file" className="hidden" accept="image/*" onChange={uploadImage} />
                    {uploadingImg ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /> : <Upload className="h-5 w-5 text-gray-400" />}
                  </label>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t("common:ui.cancel")}</Button>
              <Button type="submit" loading={saveMutation.isPending}>{editProduct ? "Save Changes" : "Add Product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title={t("products.delete_title")} description={t("products.delete_body")} confirmLabel={t("common:ui.delete")} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
