"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle, Package, ShoppingBag } from "lucide-react";

interface OrderItem { id: string; quantity: number; price: number; product: { name: string; images: string } }

interface WebsiteOrder {
  id: string; orderNumber: string; customerName: string; subtotal: number;
  shippingFee: number; total: number; status: string; createdAt: string;
  items: OrderItem[];
}

export default function OrderConfirmPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const t = useTranslations("store");
  const [order, setOrder] = useState<WebsiteOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/website/store/orders/${id}`)
      .then((r) => r.json())
      .then((d) => { setOrder(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const isRtl = locale === "ar";

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4 text-gray-500">
      <p>Order not found</p>
      <Link href={`/${locale}/store`} className="text-blue-500 hover:underline">{t("backToStore")}</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-16" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("orderConfirmed")}</h1>
          <p className="text-gray-500 text-sm mb-1">{t("orderNumber")}</p>
          <p className="text-xl font-mono font-bold mb-4">{order.orderNumber}</p>
          <p className="text-gray-500 text-sm mb-8">{t("orderConfirmMsg")}</p>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left mb-6">
            <h2 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4" /> {t("orderItems")}
            </h2>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{item.product?.name} ×{item.quantity}</span>
                  <span className="font-medium">{(Number(item.price) * item.quantity).toLocaleString("fr-DZ")} DA</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{t("subtotal")}</span>
                <span>{Number(order.subtotal).toLocaleString("fr-DZ")} DA</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{t("shippingFee")}</span>
                <span>{Number(order.shippingFee) === 0 ? t("freeShipping") : `${Number(order.shippingFee).toLocaleString("fr-DZ")} DA`}</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span>{t("total")}</span>
                <span>{Number(order.total).toLocaleString("fr-DZ")} DA</span>
              </div>
            </div>
          </div>

          <Link
            href={`/${locale}/store`}
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" /> {t("backToStore")}
          </Link>
        </div>
      </div>
    </div>
  );
}
