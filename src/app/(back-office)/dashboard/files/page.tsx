"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { Upload, Trash2, Folder, FileText, Image } from "lucide-react";

const FOLDERS = ["general", "products", "payments", "players", "videos", "documents"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["files", page, folder],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "30" });
      if (folder && folder !== "all") p.set("folder", folder);
      return fetch(`/api/files?${p}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/files?id=${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("File deleted"); qc.invalidateQueries({ queryKey: ["files"] }); setDeleteId(null); },
    onError: () => toast.error("Delete failed"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("folder", folder || "general");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) { toast.success("File uploaded"); qc.invalidateQueries({ queryKey: ["files"] }); }
    else toast.error(d.error ?? "Upload failed");
    setUploading(false);
    e.target.value = "";
  };

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="space-y-5">
      <PageHeader title="File Manager" description="Manage uploaded files and media">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept="image/*,.pdf,.mp4,.webm"
        />
        <Button loading={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />Upload File
        </Button>
      </PageHeader>

      <div className="flex gap-3">
        <Select value={folder} onValueChange={(v) => { setFolder(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Folders" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={Folder} title="No files" description="Upload files to manage them here" action={{ label: "Upload File", onClick: () => document.querySelector<HTMLInputElement>("input[type=file]")?.click() }} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.data?.map((file: any) => (
            <div key={file.id} className="group relative flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-900">
              <div className="relative flex h-28 items-center justify-center bg-gray-50 dark:bg-gray-800">
                {isImage(file.mimeType) ? (
                  <img src={file.url} alt={file.originalName} className="h-full w-full object-cover" />
                ) : file.mimeType === "application/pdf" ? (
                  <FileText className="h-10 w-10 text-red-400" />
                ) : (
                  <Image className="h-10 w-10 text-gray-400" />
                )}
                <button onClick={() => setDeleteId(file.id)} className="absolute top-1 right-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300" title={file.originalName}>{file.originalName}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.size)} · {formatDate(file.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} total={data.total} perPage={30} onPageChange={setPage} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete File" description="This file will be permanently deleted." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
