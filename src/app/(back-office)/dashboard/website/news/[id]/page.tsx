"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocaleTextInput } from "@/components/website/admin/LocaleTextInput";
import { ImageUrlInput } from "@/components/website/admin/ImageUrlInput";

interface Category { id: string; name: string }
interface ArticleDetail {
  id: string; slug: string; title: string; isPublished: boolean; isFeatured: boolean; categoryId: string | null; authorName: string | null;
}

export default function NewsEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: article, isLoading } = useQuery<ArticleDetail>({ queryKey: ["admin-news-article", id], queryFn: () => fetch(`/api/news/${id}`).then((r) => r.json()) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["admin-news-categories"], queryFn: () => fetch("/api/news/categories").then((r) => r.json()) });

  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { if (article) setForm(article as unknown as Record<string, unknown>); }, [article]);
  const set = (patch: Record<string, unknown>) => setForm((f) => ({ ...f, ...patch }));

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => fetch(`/api/news/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-news-article", id] }); },
    onError: () => toast.error("Save failed"),
  });

  if (isLoading || !article) return <div className="py-12 text-center text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/website/news")} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{article.title}</h1>
            <p className="font-mono text-xs text-gray-400">/news/{article.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/fr/news/${article.slug}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> View</Button></a>
          <Button size="sm" onClick={() => save()} disabled={saving}><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <LocaleTextInput baseKey="title" values={form} onChange={set} label="Title" />
          </div>
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <LocaleTextInput baseKey="excerpt" values={form} onChange={set} label="Excerpt (used on cards)" multiline />
          </div>
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <LocaleTextInput baseKey="body" values={form} onChange={set} label="Body (HTML)" multiline />
          </div>
          <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <p className="text-sm font-semibold">SEO</p>
            <div><Label>SEO title</Label><Input value={(form.metaTitle as string) ?? ""} onChange={(e) => set({ metaTitle: e.target.value })} /></div>
            <div><Label>SEO description</Label><Textarea value={(form.metaDescription as string) ?? ""} onChange={(e) => set({ metaDescription: e.target.value })} /></div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <ImageUrlInput label="Cover image" value={(form.coverImageUrl as string) ?? ""} onChange={(url) => set({ coverImageUrl: url })} />
          </div>
          <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <div>
              <Label>Category</Label>
              <Select value={(form.categoryId as string) ?? "none"} onValueChange={(v) => set({ categoryId: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Author</Label><Input value={(form.authorName as string) ?? ""} onChange={(e) => set({ authorName: e.target.value })} /></div>
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={!!form.isPublished} onCheckedChange={(v) => set({ isPublished: v })} /></div>
            <div className="flex items-center justify-between"><Label>Featured</Label><Switch checked={!!form.isFeatured} onCheckedChange={(v) => set({ isFeatured: v })} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
