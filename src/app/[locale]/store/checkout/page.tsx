"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/public-format";
import { ShoppingCart, MapPin } from "lucide-react";

interface CartItem {
  productId: string; name: string; price: number; quantity: number;
  variantId?: string; variantInfo?: string; image?: string;
}

interface Wilaya { id: string; code: number; nameFr: string; nameAr: string }


export default function CheckoutPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const t = useTranslations("store");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const currency = tc("currency");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingFee, setShippingFee] = useState(500);
  const [freeThreshold, setFreeThreshold] = useState(5000);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [wilayaOpen, setWilayaOpen] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [wilayasLoaded, setWilayasLoaded] = useState(false);

  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    wilaya: "", city: "", address: "", deliveryNotes: "",
  });

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("hx_cart") ?? "[]")); } catch {}
    fetch("/api/website/store").then((r) => r.json()).then((d) => {
      setShippingFee(parseFloat(d.store_shipping_fee ?? "500"));
      setFreeThreshold(parseFloat(d.store_free_shipping_threshold ?? "5000"));
    }).catch(() => {});

    // The 58 wilayas used to be a hardcoded French-only array in this file, so
    // the Arabic checkout listed every province in French. They come from the
    // Wilaya table instead, which has carried nameFr and nameAr all along (the
    // admin's station form already reads it the same way). The rows are seeded
    // unconditionally as system reference data, not behind SEED_DEMO_CONTENT.
    fetch("/api/wilayas")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setWilayas(d); })
      .catch(() => {})
      .finally(() => setWilayasLoaded(true));
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const effectiveShipping = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shippingFee;
  const total = subtotal + effectiveShipping;

  /** What the visitor reads. Falls back to French if a row has no Arabic. */
  const wilayaLabel = (w: Wilaya) => (locale === "ar" ? w.nameAr || w.nameFr : w.nameFr);

  const wilayaQuery = wilayaSearch.trim().toLowerCase();
  const filteredWilayas = wilayas.filter((w) =>
    !wilayaQuery ||
    w.nameFr.toLowerCase().includes(wilayaQuery) ||
    w.nameAr.includes(wilayaSearch.trim()) ||
    String(w.code).includes(wilayaQuery)
  );

  // `form.wilaya` holds the French name in both locales, on purpose: it is what
  // gets written to WebsiteOrder.wilaya, and the back-office order list has to
  // show one consistent value per province regardless of the language the
  // customer happened to order in. Only the label shown here is localised.
  const selectedWilaya = wilayas.find((w) => w.nameFr === form.wilaya) ?? null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = t("requiredField");
    if (!form.customerPhone.trim()) e.customerPhone = t("requiredField");
    if (!form.wilaya) e.wilaya = t("requiredField");
    if (!form.address.trim()) e.address = t("requiredField");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/website/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: cart.map((c) => ({ productId: c.productId, variantId: c.variantId, variantInfo: c.variantInfo, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.removeItem("hx_cart");
      window.dispatchEvent(new Event("cartUpdate"));
      router.push(`/${locale}/store/order/${data.order.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErr("orderFailed");
      setErrors({ _global: message });
    } finally {
      setSubmitting(false);
    }
  };

  const isRtl = locale === "ar";

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <ShoppingCart className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">{t("cartEmpty")}</p>
        <Link href={`/${locale}/store`} className="text-blue-500 hover:underline">{t("backToStore")}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">{t("checkout")}</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-[1fr_380px] gap-8">
            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              {errors._global && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">{errors._global}</div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("fullName")} <span className="text-red-500">*</span></label>
                  <input
                    value={form.customerName}
                    onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-transparent ${errors.customerName ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  />
                  {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("phone")} <span className="text-red-500">*</span></label>
                  <input
                    value={form.customerPhone}
                    onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
                    type="tel"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-transparent ${errors.customerPhone ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  />
                  {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email (optionnel)</label>
                <input
                  value={form.customerEmail}
                  onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                  type="email"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">{t("wilaya")} <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setWilayaOpen(!wilayaOpen)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-transparent text-start flex items-center justify-between ${errors.wilaya ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                  >
                    <span>{selectedWilaya ? wilayaLabel(selectedWilaya) : t("selectWilaya")}</span>
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </button>
                  {wilayaOpen && (
                    <div className="absolute z-50 top-full mt-1 inset-x-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                          value={wilayaSearch}
                          onChange={(e) => setWilayaSearch(e.target.value)}
                          placeholder={t("searchWilaya")}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        {!wilayasLoaded ? (
                          <p className="px-3 py-3 text-sm text-gray-400">{tc("loading")}</p>
                        ) : filteredWilayas.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-gray-400">{t("noWilayaMatch")}</p>
                        ) : (
                          filteredWilayas.map((w) => (
                            <button
                              key={w.code}
                              type="button"
                              onClick={() => { setForm((p) => ({ ...p, wilaya: w.nameFr })); setWilayaOpen(false); setWilayaSearch(""); }}
                              className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="text-gray-400 me-2 tabular-nums">{String(w.code).padStart(2, "0")}</span>
                              {wilayaLabel(w)}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {errors.wilaya && <p className="text-xs text-red-500 mt-1">{errors.wilaya}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("city")}</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("address")} <span className="text-red-500">*</span></label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-transparent resize-none ${errors.address ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("deliveryNotes")}</label>
                <textarea
                  value={form.deliveryNotes}
                  onChange={(e) => setForm((p) => ({ ...p, deliveryNotes: e.target.value }))}
                  rows={2}
                  placeholder={t("deliveryNotesPlaceholder")}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent resize-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                🛡️ {t("codNotice")}
              </div>
            </div>

            {/* Order summary */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold mb-4">{t("orderSummary")}</h2>
                <div className="space-y-2 text-sm mb-4">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-gray-600 line-clamp-1 flex-1">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                      <span className="font-medium flex-shrink-0">{formatPrice(item.price * item.quantity, locale, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("subtotal")}</span>
                    <span>{formatPrice(subtotal, locale, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("shippingFee")}</span>
                    <span>{effectiveShipping === 0 ? <span className="text-green-600">{t("freeShipping")}</span> : formatPrice(effectiveShipping, locale, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100 dark:border-gray-700">
                    <span>{t("total")}</span>
                    <span>{formatPrice(total, locale, currency)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {submitting ? t("placingOrder") : t("placeOrder")}
              </button>

              <Link href={`/${locale}/store/cart`} className="block text-center text-sm text-gray-500 hover:text-gray-700">
                <span className="ob-flip-rtl" aria-hidden="true">←</span> {t("cart")}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
