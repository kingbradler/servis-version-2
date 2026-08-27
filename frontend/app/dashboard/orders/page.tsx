"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import { useMyOrders } from "@/features/orders/hooks/useMyOrders";
import { formatPrice } from "@/lib/utils";

function OrdersContent() {
  const router = useRouter();
  const { orders, loading, error, refresh } = useMyOrders();

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-6">
        <h2 className="text-heading-l font-bold tracking-tight">
          Mes commandes
        </h2>

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
            title="Aucune commande pour le moment"
            description="Vos commandes apparaîtront ici après un checkout."
            actionLabel="Voir les produits"
            onAction={() => router.push("/products")}
          />
        )}

        {!loading && !error && orders.length > 0 && (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {order.store_name_snapshot || order.store?.name}
                    </p>
                    <p className="text-caption text-text-muted">
                      {new Date(order.created_at).toLocaleString("fr-FR")} · #
                      {order.id.slice(0, 8)}
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-body font-semibold">
                      {formatPrice(Number(order.total_amount))}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/orders/${order.id}`}>
                        Détail
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <OrdersContent />
    </RequireAuth>
  );
}
