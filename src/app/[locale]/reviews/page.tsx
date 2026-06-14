"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star, CheckCircle, ChevronDown } from "lucide-react";

interface Review {
  id: string; reviewerName: string; rating: number; title: string | null;
  content: string; isVerified: boolean; isFeatured: boolean;
  adminReply: string | null; adminReplyAt: string | null; createdAt: string;
  product: { name: string } | null;
}

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="focus:outline-none"
        >
          <Star className={`w-8 h-8 transition-colors ${i <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function ReviewsPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [breakdown, setBreakdown] = useState<Array<{ rating: number; _count: { rating: number } }>>([]);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    reviewerName: "", reviewerEmail: "", rating: 0, title: "", content: "",
  });

  const fetchReviews = async (s = sort) => {
    setLoading(true);
    const data = await fetch(`/api/public/reviews?limit=20&sort=${s}`).then((r) => r.json());
    setReviews(data.reviews ?? []);
    setTotal(data.total ?? 0);
    setAvgRating(data.avgRating ?? 0);
    setBreakdown(data.breakdown ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [sort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reviewerName.trim() || !form.content.trim() || form.rating === 0) {
      setFormError("Please fill in your name, rating, and review.");
      return;
    }
    if (form.content.length < 20) { setFormError("Review must be at least 20 characters."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: form.rating }),
      });
      if (!res.ok) throw new Error();
      setSubmitDone(true);
      setForm({ reviewerName: "", reviewerEmail: "", rating: 0, title: "", content: "" });
    } catch {
      setFormError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getBreakdownCount = (r: number) => breakdown.find((b) => b.rating === r)?._count?.rating ?? 0;

  const isRtl = locale === "ar";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-gray-900 py-16 text-center text-white">
        <h1 className="text-4xl font-bold mb-2">{t("reviewsTitle")}</h1>
        <p className="text-gray-400">{t("basedOn").replace("{count}", String(total))}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* Rating overview */}
        {total > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="text-center flex-shrink-0">
                <p className="text-6xl font-bold text-gray-900 dark:text-white">{avgRating.toFixed(1)}</p>
                <StarDisplay rating={Math.round(avgRating)} />
                <p className="text-sm text-gray-500 mt-1">{t("basedOn").replace("{count}", String(total))}</p>
              </div>
              <div className="flex-1 w-full space-y-2">
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = getBreakdownCount(r);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={r} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-right text-gray-500">{r}</span>
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-gray-500">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Sort by:</span>
          {[
            { value: "newest", label: t("mostRecent") },
            { value: "highest", label: t("highestRated") },
            { value: "lowest", label: t("lowestRated") },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${sort === opt.value ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Reviews list */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t("noReviews")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{review.reviewerName}</span>
                      {review.isVerified && (
                        <span className="flex items-center gap-0.5 text-xs text-blue-500">
                          <CheckCircle className="w-3 h-3" /> {t("verified")}
                        </span>
                      )}
                    </div>
                    {review.product && <p className="text-xs text-gray-400">{review.product.name}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
                </div>
                <StarDisplay rating={review.rating} />
                {review.title && <p className="font-medium text-sm mt-2">{review.title}</p>}
                <p className={`text-sm text-gray-600 dark:text-gray-300 mt-1 ${expandedId !== review.id ? "line-clamp-3" : ""}`}>
                  {review.content}
                </p>
                {review.content.length > 200 && (
                  <button onClick={() => setExpandedId(expandedId === review.id ? null : review.id)} className="text-xs text-blue-500 hover:underline mt-1">
                    {expandedId === review.id ? t("collapse") : t("readMore")}
                  </button>
                )}
                {review.adminReply && (
                  <div className="mt-3 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("adminReply")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{review.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Write a review form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-5">{t("writeReview")}</h2>
          {submitDone ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-gray-700 dark:text-gray-200 font-medium">{t("thankYou")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">{formError}</div>}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("yourName")} *</label>
                  <input value={form.reviewerName} onChange={(e) => setForm((p) => ({ ...p, reviewerName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("yourEmail")}</label>
                  <input type="email" value={form.reviewerEmail} onChange={(e) => setForm((p) => ({ ...p, reviewerEmail: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("rating")} *</label>
                <StarSelector value={form.rating} onChange={(r) => setForm((p) => ({ ...p, rating: r }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("reviewTitle")}</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("reviewContent")} *</label>
                <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  rows={4} maxLength={1000} minLength={20}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent resize-none" />
                <p className="text-xs text-gray-400 mt-1">{form.content.length}/1000</p>
              </div>

              <button type="submit" disabled={submitting}
                className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors disabled:opacity-60">
                {submitting ? t("submitting") : t("submitReview")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
