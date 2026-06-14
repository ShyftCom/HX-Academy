"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/shared/search-input";
import { formatCurrency, parseJsonSafe } from "@/lib/utils";
import { ShoppingBag, Plus, Minus, ShoppingCart, Package, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CartItem { product: any; quantity: number; }

export default function PlayerStorePage() {
  const { data: session } = useSession();
  const playerId = (session?.user as any)?.playerId;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [codForm, setCodForm] = useState<Record<string, string>>({});

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-public", search],
    queryFn: () => {
      const p = new URLSearchParams({ perPage: "50", public: "true" });
      if (search) p.set("q", search);
      return fetch(`/api/products?${p}`).then((r) => r.json());
    },
  });

  const { data: formFields } = useQuery({
    queryKey: ["form-fields"],
    queryFn: () => fetch("/api/form-fields").then((r) => r.json()),
  });

  const addToCart = (product: any) => {
    setCart((c) => {
      const existing = c.find((i) => i.product.id === product.id);
      if (existing) return c.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((c) => c.map((i) => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  };

  const totalAmount = cart.reduce((sum, i) => sum + (i.product.discountPrice ?? i.product.price) * i.quantity, 0);

  const orderMutation = useMutation({
    mutationFn: () => fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        codData: codForm,
      }),
    }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Failed"); } return r.json(); }),
    onSuccess: () => {
      toast.success("Order placed successfully!");
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setCodForm({});
    },
    onError: (e: any) => toast.error(e.message ?? "Order failed"),
  });

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Store</h1>
        {cart.length > 0 && (
          <Button onClick={() => setCartOpen(true)} className="relative">
            <ShoppingCart className="me-2 h-4 w-4" />Cart
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : products?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16"><ShoppingBag className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-400">No products available</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products?.data?.map((p: any) => {
            const imgs = parseJsonSafe<string[]>(p.images, []);
            const cartItem = cart.find((i) => i.product.id === p.id);
            return (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-900">
                <div className="relative h-32 bg-gray-50 dark:bg-gray-800">
                  {imgs[0] ? <img src={imgs[0]} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-gray-300" /></div>}
                  {p.discountPrice && <span className="absolute top-1 left-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">SALE</span>}
                  {p.stock === 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-white text-sm font-medium">Out of Stock</span></div>}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {p.discountPrice ? <><span className="font-bold text-sm">{formatCurrency(p.discountPrice)}</span><span className="text-xs line-through text-gray-400">{formatCurrency(p.price)}</span></> : <span className="font-bold text-sm">{formatCurrency(p.price)}</span>}
                  </div>
                  {cartItem ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="icon-sm" variant="outline" onClick={() => updateQty(p.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm font-medium w-6 text-center">{cartItem.quantity}</span>
                      <Button size="icon-sm" variant="outline" onClick={() => updateQty(p.id, 1)} disabled={p.stock <= cartItem.quantity}><Plus className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" className="mt-2 w-full" onClick={() => addToCart(p)} disabled={p.stock === 0}><Plus className="me-1 h-3.5 w-3.5" />Add</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Your Cart ({cart.length} items)</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            {cart.map((i) => (
              <div key={i.product.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.product.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(i.product.discountPrice ?? i.product.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon-sm" variant="outline" onClick={() => updateQty(i.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm">{i.quantity}</span>
                  <Button size="icon-sm" variant="outline" onClick={() => updateQty(i.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                </div>
                <p className="text-sm font-medium w-20 text-end">{formatCurrency((i.product.discountPrice ?? i.product.price) * i.quantity)}</p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)}>Continue Shopping</Button>
            <Button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Complete Order</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-sm font-semibold mb-2">Order Summary</p>
              {cart.map((i) => <div key={i.product.id} className="flex justify-between text-sm"><span>{i.product.name} ×{i.quantity}</span><span>{formatCurrency((i.product.discountPrice ?? i.product.price) * i.quantity)}</span></div>)}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>
            <p className="text-sm font-semibold">Delivery Information</p>
            {formFields?.map((field: any) => (
              <Input key={field.id} label={`${field.label}${field.isRequired ? " *" : ""}`} placeholder={field.placeholder ?? ""} value={codForm[field.fieldName] ?? ""} onChange={(e) => setCodForm({ ...codForm, [field.fieldName]: e.target.value })} required={field.isRequired} />
            ))}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Back</Button>
            <Button onClick={() => orderMutation.mutate()} loading={orderMutation.isPending}>Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
