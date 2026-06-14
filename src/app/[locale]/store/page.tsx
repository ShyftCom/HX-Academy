"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShoppingCart, Star, Filter, X, SlidersHorizontal, ChevronDown, Search } from "lucide-react";

interface Product {
  id: string; name: string; slug: string | null; price: number; discountPrice: number | null;
  stock: number; images: string; category: { id: string; name: string } | null;
  variants: Array<{ price: number | null; stock: number }>;
}

interface CartItem { productId: string; name: string; price: number; quantity: number; image?: string }

function useCart() {
  const getCart = (): CartItem[] => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("hx_cart") ?? "[]"); } catch { return []; }
  };
  const addItem = (item: CartItem) => {
    const cart = getCart();
    const existing = cart.find((c) => c.productId === item.productId);
    if (existing) existing.quantity += item.quantity;
    else cart.push(item);
    localStorage.setItem("hx_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdate"));
  };
  return { addItem, getCart };
}

function parseImages(images: string): string[] {
  try { const arr = JSON.parse(images); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function getVariantPriceRange(product: Product): string | null {
  if (!product.variants?.length) return null;
  const prices = product.variants.filter((v) => v.stock > 0 && v.price).map((v) => Number(v.price));
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min.toLocaleString("fr-DZ")} DA`;
  return `${min.toLocaleString("fr-DZ")} DA – ${max.toLocaleString("fr-DZ")} DA`;
}

function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  if (stock === 0) return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Rupture</span>;
  if (stock <= threshold) return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">Stock limité</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">En stock</span>;
}

export default function StorePage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations("store");
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fetchProducts = async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), sort });
    if (search) p.set("q", search);
    if (selectedCats.length === 1) p.set("categoryId", selectedCats[0]);
    if (inStockOnly) p.set("inStock", "true");
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    const data = await fetch(`/api/public/products?${p}`).then((r) => r.json());
    setProducts(data.data ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setCategories(data.categories ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [page, sort, inStockOnly]);

  const isRtl = locale === "ar";

  const handleAddToCart = (product: Product) => {
    const imgs = parseImages(product.images);
    addItem({ productId: product.id, name: product.name, price: Number(product.discountPrice ?? product.price), quantity: 1, image: imgs[0] });
    setAddedIds((prev) => new Set([...prev, product.id]));
    setTimeout(() => setAddedIds((prev) => { const s = new Set(prev); s.delete(product.id); return s; }), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero */}
      <div className="bg-gray-900 py-12 text-center text-white">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-400">{total} {t("products")}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar filters */}
        <aside className={`w-64 flex-shrink-0 hidden md:block`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5 sticky top-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500">{t("filters")}</h3>

            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent"
                  placeholder={t("allProducts")}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">{t("categories")}</p>
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.id)}
                    onChange={(e) => {
                      setSelectedCats((prev) => e.target.checked ? [...prev, cat.id] : prev.filter((c) => c !== cat.id));
                      setPage(1);
                    }}
                    className="rounded"
                  />
                  {cat.name}
                </label>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">{t("priceRange")}</p>
              <div className="flex gap-2">
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" className="w-1/2 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent" />
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" className="w-1/2 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }} className="rounded" />
              {t("inStockOnly")}
            </label>

            <button onClick={() => { setSelectedCats([]); setMinPrice(""); setMaxPrice(""); setInStockOnly(false); setSearch(""); setPage(1); fetchProducts(); }} className="text-sm text-blue-500 hover:underline">
              {t("clearFilters")}
            </button>
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">{total} produits</p>
            <div className="flex items-center gap-2">
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
                <option value="newest">{t("newest")}</option>
                <option value="price_asc">{t("priceAsc")}</option>
                <option value="price_desc">{t("priceDesc")}</option>
              </select>
              <button className="md:hidden flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5" onClick={() => setFilterOpen(!filterOpen)}>
                <SlidersHorizontal className="w-4 h-4" /> {t("filters")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-2">🛒</p>
              <p className="text-gray-500">{t("noProducts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                const imgs = parseImages(product.images);
                const displayPrice = product.discountPrice ?? product.price;
                const variantRange = getVariantPriceRange(product);
                const slug = product.slug ?? product.id;
                const hasVariants = product.variants?.length > 0;
                const totalStock = hasVariants
                  ? product.variants.reduce((a, v) => a + v.stock, 0)
                  : product.stock;

                return (
                  <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group hover:shadow-md transition-shadow">
                    <Link href={`/${locale}/store/${slug}`}>
                      <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {imgs[0] ? (
                          <img src={imgs[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingCart className="w-12 h-12" />
                          </div>
                        )}
                        {imgs[1] && (
                          <img src={imgs[1]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <Link href={`/${locale}/store/${slug}`}>
                        <h3 className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors mb-1">{product.name}</h3>
                      </Link>
                      <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                        {variantRange ?? `${Number(displayPrice).toLocaleString("fr-DZ")} DA`}
                        {product.discountPrice && !variantRange && (
                          <span className="text-xs line-through text-gray-400 ml-1">{Number(product.price).toLocaleString("fr-DZ")} DA</span>
                        )}
                      </p>
                      <div className="flex items-center justify-between">
                        <StockBadge stock={totalStock} />
                        {!hasVariants && totalStock > 0 && (
                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${addedIds.has(product.id) ? "bg-green-500 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"}`}
                          >
                            {addedIds.has(product.id) ? "✓" : "+"}
                          </button>
                        )}
                        {hasVariants && totalStock > 0 && (
                          <Link href={`/${locale}/store/${slug}`} className="text-xs px-2 py-1 rounded-lg font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100">
                            Voir
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
