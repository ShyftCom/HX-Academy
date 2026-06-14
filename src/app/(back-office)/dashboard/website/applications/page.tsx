"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Search, Download, Eye, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import Link from "next/link";

interface App { id: string; fullName: string; phone?: string; email?: string; selectedPlan?: { name: string }; status?: { name: string; color?: string }; createdAt: string; isConverted: boolean; }

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  contacted: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  approved: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

function getStatusClass(name?: string) {
  if (!name) return "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
  return STATUS_COLORS[name.toLowerCase()] ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(limit), q: search });
      const r = await fetch(`/api/applications?${params}`);
      const d = await r.json();
      setApps(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    setExporting(true);
    try {
      const r = await fetch("/api/applications/export");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "applications.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch { toast.error("Export failed"); }
    setExporting(false);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{total} total applications from website</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by name, phone or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full ps-9 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <Filter className="w-8 h-8 mb-2 opacity-50" />
            <p>No applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Name", "Contact", "Plan", "Status", "Submitted", "Converted", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{app.fullName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      <div>{app.phone}</div>
                      {app.email && <div className="text-xs">{app.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{app.selectedPlan?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {app.status ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusClass(app.status.name)}`}>{app.status.name}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {app.isConverted
                        ? <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Yes</span>
                        : <span className="text-xs text-gray-400 dark:text-gray-500">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/website/applications/${app.id}`} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-xs">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-gray-400">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">{page} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
