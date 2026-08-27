"use client";

import {
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import {
  DashboardQuickLink,
  DashboardSection,
  DashboardStat,
  DashboardWelcome,
} from "@/features/dashboard/components/DashboardHome";
import { clientNav } from "@/features/dashboard/nav";
import { useMyOrders } from "@/features/orders/hooks/useMyOrders";
import { getOrderPayment } from "@/features/payments/services/payments.service";
import { getMyServiceRequests } from "@/features/pro-services/api/service-requests.api";
import type { ServiceRequest } from "@/features/pro-services/types/service-request.types";
import { formatPrice } from "@/lib/utils";
import { useOptionalCart } from "@/providers/cart-provider";

function ClientDashboardHome() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { orders, loading, error, refresh } = useMyOrders();
  const cart = useOptionalCart();
  const [awaitingPayment, setAwaitingPayment] = useState(0);
  const [paymentScanDone, setPaymentScanDone] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [srLoading, setSrLoading] = useState(true);

  useEffect(() => {
    if (loading || error) return;
    let cancelled = false;
    void (async () => {
      const recent = orders.slice(0, 10);
      const results = await Promise.all(
        recent.map((o) =>
          getOrderPayment(o.id)
            .then((p) => p)
            .catch(() => null)
        )
      );
      if (cancelled) return;
      const needsAction = results.filter(
        (p) =>
          p &&
          (p.status === "PENDING" ||
            p.status === "REJECTED" ||
            p.status === "PROOF_SUBMITTED")
      ).length;
      const withoutPayment = recent.filter((_, i) => !results[i]).length;
      setAwaitingPayment(needsAction + withoutPayment);
      setPaymentScanDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [orders, loading, error]);

  useEffect(() => {
    let cancelled = false;
    void getMyServiceRequests()
      .then((data) => {
        if (!cancelled) setServiceRequests(data.results);
      })
      .catch(() => {
        if (!cancelled) setServiceRequests([]);
      })
      .finally(() => {
        if (!cancelled) setSrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingSr = serviceRequests.filter((r) => r.status === "PENDING").length;
  const acceptedSr = serviceRequests.filter(
    (r) => r.status === "ACCEPTED"
  ).length;
  const completedSr = serviceRequests.filter(
    (r) => r.status === "COMPLETED"
  ).length;

  const shellTitle = user?.role === "SELLER" ? "Mes achats" : "Client";

  return (
    <DashboardShell title={shellTitle} items={clientNav}>
      <div className="space-y-8">
        <DashboardWelcome
          eyebrow="Espace client"
          title={`Bonjour ${user?.first_name || "client"}`}
          description={
            <>
              Commandes, panier, paiements et demandes de services.
              {user?.role === "SELLER" ? (
                <>
                  {" "}
                  <Link
                    href="/seller"
                    className="font-medium text-primary hover:underline"
                  >
                    Retour à l&apos;espace professionnel
                  </Link>
                </>
              ) : null}
            </>
          }
          actions={
            <>
              <Button asChild variant="primary" size="sm" className="rounded-full">
                <Link href="/products">Continuer mes achats</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/services">Services</Link>
              </Button>
            </>
          }
        />

        {loading && (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[18px]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <DashboardStat
                label="Commandes"
                value={orders.length}
                href="/dashboard/orders"
                icon={ShoppingBag}
              />
              <DashboardStat
                label="Paiements à suivre"
                value={paymentScanDone ? awaitingPayment : "…"}
                href="/dashboard/orders"
                icon={CreditCard}
              />
              <DashboardStat
                label="Panier"
                value={cart?.itemsCount ?? 0}
                href="/cart"
                icon={Package}
              />
            </div>

            <DashboardSection
              title="Mes demandes de services"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/service-requests">
                    Voir mes demandes
                  </Link>
                </Button>
              }
            >
              {srLoading ? (
                <Skeleton className="h-20 w-full rounded-[18px]" />
              ) : serviceRequests.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Vous n'avez encore aucune demande de service"
                  description="Parcourez les services et demandez une intervention."
                  actionLabel="Voir les services"
                  onAction={() => router.push("/services")}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <DashboardStat
                    label="En attente"
                    value={pendingSr}
                    href="/dashboard/service-requests"
                    icon={ClipboardList}
                  />
                  <DashboardStat
                    label="Acceptées"
                    value={acceptedSr}
                    href="/dashboard/service-requests"
                  />
                  <DashboardStat
                    label="Terminées"
                    value={completedSr}
                    href="/dashboard/service-requests"
                  />
                </div>
              )}
            </DashboardSection>

            <DashboardSection
              title="Commandes récentes"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/orders">Tout voir</Link>
                </Button>
              }
            >
              {orders.length === 0 ? (
                <EmptyState
                  title="Aucune commande pour le moment"
                  description="Parcourez la marketplace pour passer votre première commande."
                  actionLabel="Voir les produits"
                  onAction={() => router.push("/products")}
                />
              ) : (
                <ul className="divide-y divide-cr2 overflow-hidden rounded-[18px] border border-cr2 bg-white dark:divide-border dark:border-border dark:bg-surface">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {order.store_name_snapshot || order.store?.name}
                          </p>
                          <p className="text-caption text-text-muted">
                            {new Date(order.created_at).toLocaleDateString(
                              "fr-FR"
                            )}{" "}
                            · {order.id.slice(0, 8)}…
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{order.status}</Badge>
                          <span className="text-body-sm font-semibold">
                            {formatPrice(Number(order.total_amount))}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardQuickLink
                href="/products"
                label="Continuer mes achats"
                icon={Package}
              />
              <DashboardQuickLink
                href="/services"
                label="Voir les services"
                icon={Wrench}
              />
              <DashboardQuickLink
                href="/dashboard/profile"
                label="Mon profil"
                icon={User}
              />
              <DashboardQuickLink
                href="/dashboard/orders"
                label="Mes commandes"
                icon={ShoppingBag}
              />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ClientDashboardPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <ClientDashboardHome />
    </RequireAuth>
  );
}
