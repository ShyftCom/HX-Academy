"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ExternalLink, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SortableList } from "@/components/website/admin/SortableList";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface StationRow {
  id: string; name: string; wilaya: string; slug: string | null; isPubliclyListed: boolean; displayOrder: number;
}

export default function WebsiteVenuesPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const { data: stations = [] } = useQuery<StationRow[]>({ queryKey: ["admin-stations-venues"], queryFn: () => fetch("/api/stations").then((r) => r.json()) });
  const [rows, setRows] = useState<StationRow[] | null>(null);

  useEffect(() => {
    if (stations.length > 0) setRows([...stations].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
  }, [stations]);

  const { mutate: updateStation } = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<StationRow>) => fetch(`/api/stations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-stations-venues"] }),
  });

  function handleReorder(next: StationRow[]) {
    setRows(next);
    next.forEach((s, i) => updateStation({ id: s.id, displayOrder: i }));
  }

  const list = rows ?? stations;

  return (
    <div className="space-y-6">
      <PageHeader title={t("venues.title")} description={t("venues.subtitle")} />

      {list.length === 0 ? (
        <div className="py-12 text-center text-gray-500">{t("venues.empty")}</div>
      ) : (
        <SortableList
          items={list}
          onReorder={handleReorder}
          renderItem={(s, dragHandle) => (
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              {dragHandle}
              <div className="flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-400">{s.wilaya} {s.slug ? `— /venues/${s.slug}` : "— no public slug set yet"}</p>
              </div>
              <button
                onClick={() => updateStation({ id: s.id, isPubliclyListed: !s.isPubliclyListed })}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${s.isPubliclyListed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
              >
                {s.isPubliclyListed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {s.isPubliclyListed ? "Public" : "Hidden"}
              </button>
              <Link href={`/dashboard/stations/${s.id}`} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" title={t("venues.edit")}>
                <Settings2 className="h-4 w-4" />
              </Link>
              {s.slug && (
                <a href={`/fr/venues/${s.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
