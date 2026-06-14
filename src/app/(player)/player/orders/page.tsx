"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, parseJsonSafe } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import { FullPageLoader } from "@/components/shared/loading-spinner";

export default function PlayerOrdersPage() {
  const { data: session } = useSession();
  const playerId = (session?.user as any)?.playerId;

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-profile", playerId],
    queryFn: () => fetch(`/api/players/${playerId}`).then((r) => r.json()),
    enabled: !!playerId,
  });

  if (isLoading || !playerId) return <FullPageLoader />;

  const orders = player?.orders ?? [];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
                    {order.status && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1" style={{ backgroundColor: (order.status.color ?? "#6B7280") + "20", color: order.status.color ?? "#6B7280" }}>
                        {order.status.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{item.product?.name} ×{item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
