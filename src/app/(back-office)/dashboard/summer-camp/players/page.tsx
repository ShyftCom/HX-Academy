"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Eye, Trash2, CheckCircle, XCircle, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { useStation } from "@/context/StationContext";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

interface CampPlayer {
  id: string; fullName: string; age: number | null; gender: string | null;
  guardianName: string | null; guardianPhone: string | null; guardianEmail: string | null;
  status: string; paymentStatus: string; paidAmount: number | null;
  session: { id: string; name: string; startDate: string; endDate: string } | null;
  station: { id: string; name: string } | null;
  _count: { documents: number };
  createdAt: string;
}

interface DetailPlayer extends CampPlayer {
  healthNotes: string | null; notes: string | null; dateOfBirth: string | null; guardianRelation: string | null;
  documents: { id: string; fileName: string; fileUrl: string; mimeType: string | null; requirement: { title: string } | null }[];
  lead: { id: string } | null;
}

export default function SummerCampPlayersPage() {
  const qc = useQueryClient();
  const { activeStationId } = useStation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [detail, setDetail] = useState<DetailPlayer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sc-players", page, search, statusFilter, sessionFilter, activeStationId],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) p.set("q", search);
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (sessionFilter !== "all") p.set("sessionId", sessionFilter);
      if (activeStationId) p.set("stationId", activeStationId);
      return fetch(`/api/summer-camp/players?${p}`).then((r) => r.json());
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sc-sessions-filter", activeStationId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (activeStationId) p.set("stationId", activeStationId);
      return fetch(`/api/summer-camp/sessions?${p}`).then((r) => r.json());
    },
  });

  const openDetail = async (id: string) => {
    const d = await fetch(`/api/summer-camp/players/${id}`).then((r) => r.json());
    setDetail(d);
  };

  const { mutate: updatePlayer } = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      fetch(`/api/summer-camp/players/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => r.json()),
    onSuccess: (updated) => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["sc-players"] });
      if (detail?.id === updated.id) setDetail((d) => d ? { ...d, ...updated } : d);
    },
    onError: () => toast.error("Failed"),
  });

  const { mutate: deletePlayer, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/summer-camp/players/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["sc-players"] }); setDeleteId(null); },
    onError: () => toast.error("Failed"),
  });

  const players: CampPlayer[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Summer Camp Participants" description="All enrolled summer camp participants." />

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search participants..." className="w-64" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {Array.isArray(sessions) && sessions.length > 0 && (
          <Select value={sessionFilter} onValueChange={(v) => { setSessionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Sessions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s: { id: string; name: string }) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : players.length === 0 ? (
        <EmptyState icon={Users} title="No participants yet" description="Summer camp participants converted from leads will appear here." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Participant", "Guardian", "Session", "Payment", "Status", "Docs", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.fullName}</p>
                      <p className="text-xs text-gray-500">{p.age ? `${p.age} yrs` : ""}{p.gender ? ` · ${p.gender}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{p.guardianName}</p>
                      <p className="text-xs text-gray-500">{p.guardianPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.session?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[p.paymentStatus] ?? ""}`}>{p.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p._count.documents}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(p.id)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} perPage={20} onPageChange={setPage} />
        </>
      )}

      {/* Detail Dialog */}
      {detail && (
        <Dialog open onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{detail.fullName}</DialogTitle></DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Participant</p>
                  <p className="font-medium">{detail.fullName}</p>
                  {detail.dateOfBirth && <p className="text-gray-600">DOB: {new Date(detail.dateOfBirth).toLocaleDateString()}</p>}
                  {detail.age && <p className="text-gray-600">Age: {detail.age}</p>}
                  {detail.gender && <p className="text-gray-600">Gender: {detail.gender === "M" ? "Male" : "Female"}</p>}
                  {detail.healthNotes && <p className="text-gray-600 mt-1 text-xs">Health: {detail.healthNotes}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Guardian</p>
                  <p className="font-medium">{detail.guardianName ?? "—"}</p>
                  {detail.guardianPhone && <p className="text-gray-600">{detail.guardianPhone}</p>}
                  {detail.guardianEmail && <p className="text-gray-600">{detail.guardianEmail}</p>}
                  {detail.guardianRelation && <p className="text-xs text-gray-400">{detail.guardianRelation}</p>}
                </div>
              </div>

              {detail.session && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-orange-700 dark:text-orange-400">{detail.session.name}</p>
                  <p className="text-orange-600 dark:text-orange-300 text-xs">{new Date(detail.session.startDate).toLocaleDateString()} – {new Date(detail.session.endDate).toLocaleDateString()}</p>
                </div>
              )}

              <div className="flex gap-3 items-center text-sm">
                <span className="text-gray-500">Status:</span>
                <Select value={detail.status} onValueChange={(v) => updatePlayer({ id: detail.id, status: v })}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-gray-500">Payment:</span>
                <Select value={detail.paymentStatus} onValueChange={(v) => updatePlayer({ id: detail.id, paymentStatus: v })}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {detail.documents?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-gray-600">Documents ({detail.documents.length})</p>
                  <div className="space-y-1.5">
                    {detail.documents.map((doc) => (
                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{doc.requirement?.title ?? doc.fileName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">View</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detail.notes && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                  {detail.notes}
                </div>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Participant" description="This will permanently delete the participant record." onConfirm={() => deleteId && deletePlayer(deleteId)} loading={deleting} variant="destructive" />
    </div>
  );
}
