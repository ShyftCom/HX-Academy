"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, CheckCircle, EyeOff, Trash2, MessageSquare, Shield, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, timeAgo } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  hidden: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

interface Review {
  id: string; reviewerName: string; reviewerEmail: string | null; rating: number;
  title: string | null; content: string; status: string; isVerified: boolean; isFeatured: boolean;
  adminReply: string | null; createdAt: string; product: { name: string } | null;
}

export default function ReviewsPage() {
  const { t } = useTranslation("website");
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [replyModal, setReplyModal] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["reviews-admin", page, statusFilter, ratingFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), perPage: "20" });
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (ratingFilter !== "all") p.set("rating", ratingFilter);
      return fetch(`/api/website/reviews?${p}`).then((r) => r.json());
    },
  });

  const { mutate: updateReview } = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      fetch(`/api/website/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.updated")); qc.invalidateQueries({ queryKey: ["reviews-admin"] }); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const { mutate: deleteReview, isPending: deleting } = useMutation({
    mutationFn: (id: string) => fetch(`/api/website/reviews/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("common:toast.deleted")); qc.invalidateQueries({ queryKey: ["reviews-admin"] }); setDeleteId(null); },
    onError: () => toast.error(t("reviews.delete_failed")),
  });

  const { mutate: saveReply, isPending: savingReply } = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      fetch(`/api/website/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: reply }),
      }).then((r) => r.json()),
    onSuccess: () => { toast.success(t("reviews.reply_saved")); qc.invalidateQueries({ queryKey: ["reviews-admin"] }); setReplyModal(null); },
    onError: () => toast.error(t("common:toast.failed")),
  });

  const reviews: Review[] = data?.data ?? [];
  const stats = data?.stats ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title={t("reviews.title")} description={t("reviews.subtitle")} />

      <div className="grid grid-cols-4 gap-4">
        <StatCard title={t("reviews.total")} value={stats.total ?? 0} icon={Star} />
        <StatCard title={t("reviews.pending_approval")} value={stats.pending ?? 0} icon={Star} iconColor="text-yellow-600" iconBg="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard title={t("reviews.average")} value={`${(stats.avgRating ?? 0).toFixed(1)} ★`} icon={Star} iconColor="text-green-600" iconBg="bg-green-50 dark:bg-green-900/20" />
        <StatCard title={t("reviews.this_month")} value={stats.thisMonth ?? 0} icon={Star} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("common:ui.all_statuses_lc")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reviews.all_statuses")}</SelectItem>
            <SelectItem value="pending">{t("common:ui.pending")}</SelectItem>
            <SelectItem value="approved">{t("applications.approved")}</SelectItem>
            <SelectItem value="hidden">{t("reviews.hidden")}</SelectItem>
            <SelectItem value="rejected">{t("common:status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder={t("common:ui.all_ratings_lc")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reviews.all_ratings")}</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>{r} ★</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t("common:ui.loading")}</div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title={t("reviews.empty")} description={t("reviews.empty_body")} />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{review.reviewerName}</span>
                      {review.isVerified && (
                        <span className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400">
                          <CheckCircle className="w-3 h-3" /> {t("reviews.verified")}
                        </span>
                      )}
                      {review.isFeatured && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500">
                          <Bookmark className="w-3 h-3" /> {t("common:ui.featured")}
                        </span>
                      )}
                      <StarRating rating={review.rating} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[review.status] ?? ""}`}>
                        {review.status}
                      </span>
                      {review.product && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {review.product.name}
                        </span>
                      )}
                    </div>
                    {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{review.content}</p>
                    {review.adminReply && (
                      <div className="mt-2 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">{t("reviews.response")}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{review.adminReply}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(review.createdAt)}</p>
                  </div>

                  <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                    {review.status === "pending" && (
                      <Button size="sm" variant="ghost" className="text-green-600 text-xs h-7 px-2" onClick={() => updateReview({ id: review.id, status: "approved" })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> {t("common:ui.approve")}
                      </Button>
                    )}
                    {review.status === "approved" && (
                      <Button size="sm" variant="ghost" className="text-gray-500 text-xs h-7 px-2" onClick={() => updateReview({ id: review.id, status: "hidden" })}>
                        <EyeOff className="w-3 h-3 mr-1" /> {t("reviews.hide")}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-blue-500 text-xs h-7 px-2" onClick={() => { setReplyModal(review); setReplyText(review.adminReply ?? ""); }}>
                      <MessageSquare className="w-3 h-3 mr-1" /> {t("reviews.reply")}
                    </Button>
                    <Button size="sm" variant="ghost" className={`text-xs h-7 px-2 ${review.isFeatured ? "text-orange-500" : "text-gray-400"}`} onClick={() => updateReview({ id: review.id, isFeatured: !review.isFeatured })}>
                      <Bookmark className="w-3 h-3 mr-1" /> {review.isFeatured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button size="sm" variant="ghost" className={`text-xs h-7 px-2 ${review.isVerified ? "text-blue-500" : "text-gray-400"}`} onClick={() => updateReview({ id: review.id, isVerified: !review.isVerified })}>
                      <Shield className="w-3 h-3 mr-1" /> {review.isVerified ? "Unverify" : "Verify"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 text-xs h-7 px-2" onClick={() => setDeleteId(review.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} perPage={20} onPageChange={setPage} />
        </>
      )}

      {replyModal && (
        <Dialog open onOpenChange={() => setReplyModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("reviews.reply_title")}</DialogTitle></DialogHeader>
            <DialogBody className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{replyModal.reviewerName}</span>
                  <StarRating rating={replyModal.rating} />
                </div>
                <p className="text-gray-600 dark:text-gray-300">{replyModal.content}</p>
              </div>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("reviews.reply_ph")}
                rows={4}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyModal(null)}>{t("common:ui.cancel")}</Button>
              <Button onClick={() => saveReply({ id: replyModal.id, reply: replyText })} disabled={savingReply || !replyText.trim()}>
                {savingReply ? "Saving..." : "Save Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("reviews.delete")}
        description={t("reviews.delete_body")}
        onConfirm={() => deleteId && deleteReview(deleteId)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
