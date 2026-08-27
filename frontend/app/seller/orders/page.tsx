"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSellerOrders } from "@/features/orders/hooks/useSellerOrders";
import type { OrderStatus } from "@/features/orders/types/order.types";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PROCESSING: "En traitement",
  READY: "Prête",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

const STATUS_VARIANTS: Record<
  OrderStatus,
  "warning" | "secondary" | "success" | "error" | "default"
> = {
  PENDING: "warning",
  CONFIRMED: "secondary",
  PROCESSING: "secondary",
  READY: "success",
  COMPLETED: "success",
  CANCELLED: "error",
};

export default function SellerOrdersPage() {
  const { orders, loading, error, refresh } = useSellerOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Commandes</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Commandes passées auprès de votre boutique.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande pour le moment"
          description="Les commandes de vos clients apparaîtront ici."
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/seller/orders/${order.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      Commande #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-caption text-text-muted">
                      {new Date(order.created_at).toLocaleDateString("fr-FR")} ·{" "}
                      {order.items.length} article(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANTS[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="text-body-sm font-semibold">
                      {formatPrice(Number(order.total_amount))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
