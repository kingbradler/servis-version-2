"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Image as ImageIcon,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminStats } from "@/features/admin/types/admin.types";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  DashboardQuickLink,
  DashboardStat,
  DashboardWelcome,
} from "@/features/dashboard/components/DashboardHome";
import { isApiError } from "@/lib/api/errors";

export default function AdminDashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await adminService.getAdminStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <DashboardWelcome
        eyebrow="Administration"
        title={`Bonjour ${user?.first_name || "admin"}`}
        description="Vue d'ensemble de la marketplace SERVIS — utilisateurs, boutiques, commandes et paiements."
        actions={
          <>
            <Button asChild variant="primary" size="sm" className="rounded-full">
              <Link href="/admin/payments">Preuves à revoir</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/admin/stores">Boutiques</Link>
            </Button>
          </>
        }
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[18px]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      )}

      {!loading && !error && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <DashboardStat
            label="Utilisateurs"
            value={stats.users_count}
            icon={Users}
            href="/admin/users"
          />
          <DashboardStat
            label="Boutiques"
            value={stats.stores_count}
            icon={Store}
            href="/admin/stores"
          />
          <DashboardStat
            label="Produits"
            value={stats.products_count}
            icon={Package}
            href="/admin/products"
          />
          <DashboardStat
            label="Commandes"
            value={stats.orders_count}
            icon={ShoppingBag}
            href="/admin/orders"
          />
          <DashboardStat
            label="Preuves à revoir"
            value={stats.payments_proof_submitted}
            icon={CreditCard}
            href="/admin/payments"
            hint="Priorité modération"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardQuickLink
          href="/admin/users"
          label="Utilisateurs"
          icon={Users}
        />
        <DashboardQuickLink
          href="/admin/stores"
          label="Boutiques"
          icon={Store}
        />
        <DashboardQuickLink
          href="/admin/payments"
          label="Paiements"
          icon={CreditCard}
        />
        <DashboardQuickLink
          href="/admin/hero"
          label="Photos d'accueil"
          icon={ImageIcon}
        />
      </div>
    </div>
  );
}
