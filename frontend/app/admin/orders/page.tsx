"use client";

import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminOrder } from "@/features/admin/types/admin.types";
import type { OrderStatus } from "@/features/orders/types/order.types";
import { isApiError } from "@/lib/api/errors";
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminOrders();
      setOrders(data.results);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminService
      .getAdminOrders()
      .then((data) => {
        if (!cancelled) setOrders(data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Commandes</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Vue lecture seule de toutes les commandes de la marketplace.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState icon={ShoppingBag} title="Aucune commande" />
      )}

      {!loading && !error && orders.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    Commande #{order.id.slice(0, 8)} · {order.store.name}
                  </p>
                  <p className="text-caption text-text-muted">
                    {order.user_email} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
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
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
