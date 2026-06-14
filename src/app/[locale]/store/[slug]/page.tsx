"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShoppingCart, Star, ChevronLeft, Share2, Check, Minus, Plus, MessageCircle } from "lucide-react";

interface Attribute { id: string; name: string; value: string; group: { id: string; name: string } }
interface Variant { id: string; price: number | null; stock: number; imageUrl: string | null; variantAttributes: Array<{ attribute: Attribute }> }
interface Review { id: string; reviewerName: string; rating: number; title: string | null; content: string; isVerified: boolean; adminReply: string | null; createdAt: string }

interface ProductDetail {
  id: string; name: string; slug: string | null; description: string | null;
  images: string; price: number; discountPrice: number | null; stock: number;
  category: { name: string } | null; variants: Variant[];
}

function parseImages(s: string): string[] {
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
}

function useCart() {
  const addItem = (item: { productId: string; name: string; price: number; quantity: number; variantId?: string; variantInfo?: string; image?: string }) => {
    if (typeof window === "undefined") return;
    const cart: Array<typeof item & { quantity: number }> = [];
    try { cart.push(...JSON.parse(localStorage.getItem("hx_cart") ?? "[]")); } catch {}
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = cart.find((c) => `${c.productId}:${c.variantId ?? ""}` === key);
    if (existing) (existing as any).quantity += item.quantity;
    else cart.push(item);
    localStorage.setItem("hx_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdate"));
  };
  return { addItem };
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
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProductDetailPage() {
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const router = useRouter();
  const t = useTranslations("store");
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [added, setAdded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/products/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.product) { setProduct(d.product); setReviews(d.reviews ?? []); setAvgRating(d.avgRating ?? 0); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product?.variants?.length) { setSelectedVariant(null); return; }
    const match = product.variants.find((v) =>
      v.variantAttributes.every((va) => selectedAttrs[va.attribute.group.id] === va.attribute.id)
    );
    setSelectedVariant(match ?? null);
  }, [selectedAttrs, product]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4 text-gray-500">
      <p className="text-xl">Product not found</p>
      <Link href={`/${locale}/store`} className="text-blue-500 hover:underline flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to store
      </Link>
    </div>
  );

  const imgs = parseImages(product.images);
  const hasVariants = product.variants?.length > 0;
  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.discountPrice ?? product.price);
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

  const attrGroups: Record<string, Array<Attribute>> = {};
  product.variants?.forEach((v) => {
    v.variantAttributes.forEach((va) => {
      const gid = va.attribute.group.id;
      const gname = va.attribute.group.name;
      if (!attrGroups[gid]) attrGroups[gid] = [];
      if (!attrGroups[gid].find((a) => a.id === va.attribute.id)) attrGroups[gid].push(va.attribute);
    });
  });

  const variantFullySelected = !hasVariants || Object.keys(attrGroups).every((gid) => selectedAttrs[gid]);
  const canAdd = currentStock > 0 && (!hasVariants || variantFullySelected);

  const handleAddToCart = (redirectToCheckout = false) => {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      quantity,
      variantId: selectedVariant?.id,
      variantInfo: selectedVariant ? Object.values(selectedAttrs).join(", ") : undefined,
      image: imgs[0],
    });
    if (redirectToCheckout) router.push(`/${locale}/store/checkout`);
    else { setAdded(true); setTimeout(() => setAdded(false), 2000); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const isRtl = locale === "ar";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href={`/${locale}/store`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft className="w-4 h-4" /> {t("backToStore")}
        </Link>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Image gallery */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden aspect-square mb-3">
              {imgs[mainImage] ? (
                <img src={imgs[mainImage]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ShoppingCart className="w-16 h-16" />
                </div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${i === mainImage ? "border-gray-900 dark:border-white" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            {product.category && (
              <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category.name}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>

            {avgRating > 0 && (
              <div className="flex items-center gap-2">
                <StarDisplay rating={Math.round(avgRating)} />
                <span className="text-sm text-gray-500">({reviews.length} avis)</span>
              </div>
            )}

            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentPrice.toLocaleString("fr-DZ")} DA
              </p>
              {product.discountPrice && !hasVariants && (
                <p className="text-sm line-through text-gray-400">{Number(product.price).toLocaleString("fr-DZ")} DA</p>
              )}
            </div>

            <div>
              {currentStock === 0
                ? <span className="inline-block px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 font-medium">{t("outOfStock")}</span>
                : currentStock <= 5
                ? <span className="inline-block px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-700 font-medium">{t("lowStock")} ({currentStock})</span>
                : <span className="inline-block px-3 py-1 text-sm rounded-full bg-green-100 text-green-700 font-medium">{t("inStock")}</span>
              }
            </div>

            {/* Variant picker */}
            {Object.entries(attrGroups).map(([gid, attrs]) => (
              <div key={gid}>
                <p className="text-sm font-semibold mb-2">{attrs[0]?.group?.name}</p>
                <div className="flex flex-wrap gap-2">
                  {attrs.map((attr) => {
                    const isSelected = selectedAttrs[gid] === attr.id;
                    return (
                      <button
                        key={attr.id}
                        onClick={() => setSelectedAttrs((p) => ({ ...p, [gid]: attr.id }))}
                        className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-colors ${isSelected ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-300 dark:border-gray-600 hover:border-gray-400"}`}
                      >
                        {attr.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            {currentStock > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{t("quantity")}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))} className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={!canAdd}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${canAdd ? (added ? "bg-green-500 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700") : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"}`}
              >
                {added ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Ajouté!</span> : (
                  <span className="flex items-center justify-center gap-2"><ShoppingCart className="w-4 h-4" /> {t("addToCart")}</span>
                )}
              </button>
              <button
                onClick={() => handleAddToCart(true)}
                disabled={!canAdd}
                className={`px-5 py-3 rounded-xl font-semibold text-sm border-2 border-gray-900 dark:border-white transition-colors ${canAdd ? "hover:bg-gray-100 dark:hover:bg-gray-700" : "opacity-40 cursor-not-allowed"}`}
              >
                {t("buyNow")}
              </button>
            </div>

            {/* Share */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500">{t("shareProduct")}:</span>
              <a href={`https://wa.me/?text=${encodeURIComponent(product.name + " — " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors">
                <Share2 className="w-4 h-4" />
              </a>
              <button onClick={copyLink} className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {linkCopied ? t("linkCopied") : t("copyLink")}
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
                <StarDisplay rating={Math.round(avgRating)} />
                <p className="text-sm text-gray-500 mt-1">{reviews.length} avis</p>
              </div>
            </div>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{r.reviewerName}</span>
                    {r.isVerified && <span className="text-xs text-blue-500">✓ Vérifié</span>}
                    <StarDisplay rating={r.rating} />
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                  <p className={`text-sm text-gray-600 dark:text-gray-300 ${expandedReview !== r.id ? "line-clamp-3" : ""}`}>{r.content}</p>
                  {r.content.length > 200 && (
                    <button onClick={() => setExpandedReview(expandedReview === r.id ? null : r.id)} className="text-xs text-blue-500 hover:underline mt-1">
                      {expandedReview === r.id ? t("collapse") : t("readMore")}
                    </button>
                  )}
                  {r.adminReply && (
                    <div className="mt-3 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Réponse de l'académie:</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.adminReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
