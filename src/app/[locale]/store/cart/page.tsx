"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";

interface CartItem {
  productId: string; name: string; price: number; quantity: number;
  variantId?: string; variantInfo?: string; image?: string;
}

export default function CartPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations("store");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingFee, setShippingFee] = useState(500);
  const [freeThreshold, setFreeThreshold] = useState(5000);

  useEffect(() => {
    const loadCart = () => {
      try { setCart(JSON.parse(localStorage.getItem("hx_cart") ?? "[]")); } catch { setCart([]); }
    };
    loadCart();
    window.addEventListener("cartUpdate", loadCart);
    return () => window.removeEventListener("cartUpdate", loadCart);
  }, []);

  useEffect(() => {
    fetch("/api/website/store")
      .then((r) => r.json())
      .then((d) => {
        setShippingFee(parseFloat(d.store_shipping_fee ?? "500"));
        setFreeThreshold(parseFloat(d.store_free_shipping_threshold ?? "5000"));
      }).catch(() => {});
  }, []);

  const updateQty = (idx: number, qty: number) => {
    const updated = cart.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, qty) } : item);
    setCart(updated);
    localStorage.setItem("hx_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdate"));
  };

  const removeItem = (idx: number) => {
    const updated = cart.filter((_, i) => i !== idx);
    setCart(updated);
    localStorage.setItem("hx_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdate"));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const effectiveShipping = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shippingFee;
  const total = subtotal + effectiveShipping;

  const isRtl = locale === "ar";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">{t("cart")}</h1>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-gray-500 mb-2">{t("cartEmpty")}</p>
            <p className="text-sm text-gray-400 mb-6">{t("cartEmptyDesc")}</p>
            <Link href={`/${locale}/store`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors">
              {t("continueShopping")}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_340px] gap-8">
            {/* Cart items */}
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div key={`${item.productId}-${item.variantId ?? ""}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-4 items-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                    {item.variantInfo && <p className="text-xs text-gray-500">{item.variantInfo}</p>}
                    <p className="text-sm font-semibold mt-1">{(item.price * item.quantity).toLocaleString("fr-DZ")} DA</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQty(idx, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(idx, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Link href={`/${locale}/store`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 pt-2">
                ← {t("continueShopping")}
              </Link>
            </div>

            {/* Order summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-4">
              <h2 className="font-semibold text-lg mb-4">{t("orderSummary")}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("subtotal")}</span>
                  <span>{subtotal.toLocaleString("fr-DZ")} DA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("shippingFee")}</span>
                  <span>{effectiveShipping === 0 ? <span className="text-green-600">{t("freeShipping")}</span> : `${effectiveShipping.toLocaleString("fr-DZ")} DA`}</span>
                </div>
                {freeThreshold > 0 && effectiveShipping > 0 && (
                  <p className="text-xs text-gray-400">Livraison gratuite à partir de {freeThreshold.toLocaleString("fr-DZ")} DA</p>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 flex justify-between font-semibold text-base">
                  <span>{t("total")}</span>
                  <span>{total.toLocaleString("fr-DZ")} DA</span>
                </div>
              </div>
              <Link href={`/${locale}/store/checkout`} className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors">
                {t("proceedToCheckout")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
