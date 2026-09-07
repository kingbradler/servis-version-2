"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { sellerNav } from "@/features/dashboard/nav";
import {
  DashboardStat,
} from "@/features/dashboard/components/DashboardHome";
import * as storesService from "@/features/stores/services/stores.service";
import type {
  SellerAdvancedStats,
  SellerAdvancedStatsPeriod,
} from "@/features/stores/types/store.types";
import { isApiError } from "@/lib/api/errors";

const PERIODS: { value: SellerAdvancedStatsPeriod; label: string }[] = [
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "all", label: "Tout" },
];

function formatMad(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MAD`;
}

function Content() {
  const { entitlements, loading: entLoading } = useEntitlements({
    autoLoad: true,
  });
  const [period, setPeriod] = useState<SellerAdvancedStatsPeriod>("30d");
  const [stats, setStats] = useState<SellerAdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAccess =
    Boolean(entitlements?.store.advanced_stats) ||
    Boolean(entitlements?.services.advanced_stats);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      const data = await storesService.getSellerAdvancedStats(period);
      setStats(data);
    } catch (err) {
      setStats(null);
      if (isApiError(err) && err.status === 403) {
        const code =
          err.body &&
          typeof err.body === "object" &&
          "error_code" in err.body
            ? String((err.body as { error_code?: string }).error_code)
            : "";
        if (code === "advanced_stats_required" || !code) {
          setLocked(true);
          return;
        }
      }
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (entLoading) return;
    if (!hasAccess) {
      setLocked(true);
      setLoading(false);
      setStats(null);
      return;
    }
    void load();
  }, [entLoading, hasAccess, load]);

  return (
    <DashboardShell title="Pro" items={sellerNav}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-heading-l font-bold tracking-tight">
              Statistiques avancées
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              Revenus confirmés, panier moyen et activité sur la période
              choisie (offre Pro).
            </p>
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={period === p.value ? "primary" : "outline"}
                  className="rounded-full"
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {(entLoading || loading) && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
          </div>
        )}

        {!entLoading && !loading && locked && (
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <BarChart3 className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-heading-s font-semibold">
              Réservé aux abonnements Pro
            </h3>
            <p className="mt-2 max-w-lg text-body-sm text-text-secondary">
              Passez à Boutique Premium ou Services Premium pour débloquer le chiffre
              d&apos;affaires confirmé, le panier moyen et le détail d&apos;activité.
              Les compteurs simples restent gratuits sur votre tableau de bord.
            </p>
            <Button asChild className="mt-5 rounded-full" variant="primary">
              <Link href="/seller/subscription">
                <Sparkles className="mr-2 h-4 w-4" />
                Voir les offres Pro
              </Link>
            </Button>
          </div>
        )}

        {!entLoading && !loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}

        {!entLoading && !loading && !locked && !error && stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardStat
              label="Revenus confirmés"
              value={formatMad(stats.revenue_confirmed)}
              icon={Wallet}
            />
            <DashboardStat
              label="Commandes"
              value={stats.orders_count}
              icon={ShoppingBag}
              href="/seller/orders"
            />
            <DashboardStat
              label="Commandes terminées"
              value={stats.orders_completed}
              icon={ShoppingBag}
              href="/seller/orders"
            />
            <DashboardStat
              label="Panier moyen"
              value={formatMad(stats.avg_order_value)}
              icon={BarChart3}
            />
            <DashboardStat
              label="Preuves en attente"
              value={stats.payments_proof_submitted}
              icon={CreditCard}
              href="/seller/payments"
            />
            <DashboardStat
              label="Demandes de services"
              value={stats.service_requests_count}
              icon={ClipboardList}
              href="/seller/service-requests"
            />
            <DashboardStat
              label="Demandes terminées"
              value={stats.service_requests_completed}
              icon={ClipboardList}
              href="/seller/service-requests"
            />
            <DashboardStat
              label="Produits actifs"
              value={stats.products_active}
              icon={Package}
              href="/seller/products"
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function SellerStatsPage() {
  return (
    <RequireAuth roles={["SELLER", "ADMIN"]}>
      <Content />
    </RequireAuth>
  );
}
