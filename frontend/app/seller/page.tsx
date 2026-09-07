"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Wrench,
  BarChart3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { productQuotaLabel } from "@/features/billing/components/BillingBadges";
import {
  DashboardQuickLink,
  DashboardSection,
  DashboardStat,
  DashboardWelcome,
} from "@/features/dashboard/components/DashboardHome";
import { useSellerProfessional } from "@/features/professionals/hooks/useSellerProfessional";
import { getSellerServiceRequests } from "@/features/pro-services/api/service-requests.api";
import { getSellerServices } from "@/features/pro-services/api/services.api";
import type { ServiceSeller } from "@/features/pro-services/types/service.types";
import { useSellerPaymentMethods } from "@/features/payments/hooks/useSellerPaymentMethods";
import * as storesService from "@/features/stores/services/stores.service";
import type { SellerStats, StoreStatus } from "@/features/stores/types/store.types";
import { isApiError } from "@/lib/api/errors";

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente d'approbation",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
};

const STORE_STATUS_VARIANTS: Record<
  StoreStatus,
  "warning" | "secondary" | "success" | "error"
> = {
  DRAFT: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "error",
};

const PRO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

function SubscriptionSummary() {
  const { entitlements, loading } = useEntitlements({ autoLoad: true });
  if (loading) return <Skeleton className="h-24 w-full rounded-[18px]" />;
  if (!entitlements) return null;
  const { store, services } = entitlements;
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-body-sm text-text-secondary">
            Abonnement boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-heading-s font-semibold">{store.plan_name}</p>
          <p className="text-body-sm">
            {productQuotaLabel(store.active_product_count, store.product_limit)}{" "}
            produits
          </p>
          {store.days_remaining != null && (
            <p className="text-caption text-text-muted">
              Expire dans {store.days_remaining} jours
            </p>
          )}
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/seller/subscription">Gérer mon abonnement</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-body-sm text-text-secondary">
            Abonnement services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-heading-s font-semibold">
            {services.has_active_subscription
              ? services.plan_name
              : "Aucun abonnement"}
          </p>
          {services.days_remaining != null && (
            <p className="text-caption text-text-muted">
              Expire dans {services.days_remaining} jours
            </p>
          )}
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/seller/subscription">Gérer</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function PaymentMethodsNudge() {
  const { methods, loading } = useSellerPaymentMethods();
  if (loading || methods.length > 0) return null;
  return (
    <Card className="border-primary/35 bg-primary-light/25">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-text-primary">
          Vos clients ne pourront pas payer tant que vous n&apos;avez pas
          ajouté un moyen (Orange Money, Inwi, RIB ou espèces).
        </p>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/seller/payments/methods">Ajouter un moyen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardPage() {
  const { user } = useCurrentUser();
  const {
    store,
    loading: storeLoading,
    refresh: refreshStore,
  } = useSellerStore({ autoLoad: true });
  const {
    profile,
    loading: profileLoading,
    missing: profileMissing,
    error: profileError,
    refresh: refreshProfile,
  } = useSellerProfessional({ autoLoad: true });

  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceSeller[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await storesService.getSellerStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          const status = isApiError(err) ? err.status : 0;
          if (status !== 404) {
            setStatsError(
              isApiError(err) ? err.message : "Erreur de chargement"
            );
          }
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [svcData, reqData] = await Promise.all([
          getSellerServices().catch(() => []),
          getSellerServiceRequests().catch(() => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
          })),
        ]);
        if (cancelled) return;
        const list = Array.isArray(svcData) ? svcData : svcData.results;
        setServices(list);
        setPendingRequests(
          reqData.results.filter((r) => r.status === "PENDING").length
        );
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeServices = services.filter((s) => s.status === "ACTIVE").length;
  const hasStore = Boolean(store) || Boolean(user?.has_store);
  const hasProfile =
    Boolean(profile) || Boolean(user?.has_professional_profile);

  return (
    <div className="space-y-8">
      <DashboardWelcome
        eyebrow="Espace professionnel"
        title={`Bonjour ${user?.first_name || "pro"}`}
        description={
          <>
            Boutique, services et demandes — vous pouvez aussi{" "}
            <Link
              href="/dashboard"
              className="font-medium text-primary hover:underline"
            >
              acheter comme client
            </Link>
            .
          </>
        }
        actions={
          <>
            <Button asChild variant="primary" size="sm" className="rounded-full">
              <Link href="/seller/products/new">Ajouter un produit</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/seller/orders">Commandes</Link>
            </Button>
          </>
        }
      />

      <PaymentMethodsNudge />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardQuickLink
          href="/seller/store"
          label="Boutique"
          icon={Store}
        />
        <DashboardQuickLink
          href="/seller/services"
          label="Services"
          icon={Wrench}
        />
        <DashboardQuickLink
          href="/seller/orders"
          label="Commandes"
          icon={ShoppingBag}
        />
        <DashboardQuickLink
          href="/seller/service-requests"
          label="Demandes"
          icon={ClipboardList}
        />
        <DashboardQuickLink
          href="/seller/payments"
          label="Paiements"
          icon={CreditCard}
        />
        <DashboardQuickLink
          href="/seller/stats"
          label="Statistiques"
          icon={BarChart3}
        />
        <DashboardQuickLink
          href="/seller/subscription"
          label="Abonnement"
          icon={Sparkles}
        />
      </div>

      <SubscriptionSummary />

      <DashboardSection title="Ma boutique">
        {storeLoading ? (
          <Skeleton className="h-24 w-full rounded-[18px]" />
        ) : !store ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Store className="h-6 w-6" />
              </span>
              <p className="text-body-sm text-text-secondary">
                Vous n&apos;avez pas encore de boutique.
              </p>
              <p className="text-caption text-text-muted">
                Optionnel — vous pouvez proposer uniquement des services.
              </p>
              <Button asChild variant="primary" size="sm">
                <Link href="/seller/store">Créer une boutique</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-body font-semibold">{store.name}</p>
                <p className="text-caption text-text-muted">
                  {store.city?.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={STORE_STATUS_VARIANTS[store.status]}>
                  {STORE_STATUS_LABELS[store.status]}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/seller/store">Gérer</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller/products">Produits</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller/orders">Commandes</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller/payments">Paiements</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardSection>

      <DashboardSection title="Mes services">
        {profileLoading ? (
          <Skeleton className="h-24 w-full rounded-[18px]" />
        ) : profileMissing || !profile ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Wrench className="h-6 w-6" />
              </span>
              <p className="text-body-sm text-text-secondary">
                Vous ne proposez pas encore de services.
              </p>
              <p className="text-caption text-text-muted">
                Créez un profil professionnel pour publier des prestations.
              </p>
              <Button asChild variant="primary" size="sm">
                <Link href="/seller/professional">
                  Créer mon profil professionnel
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-body font-semibold">{profile.display_name}</p>
                <p className="text-caption text-text-muted">{profile.headline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {PRO_STATUS_LABELS[profile.status] || profile.status}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/seller/professional">Profil</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller/services">Services</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/seller/service-requests">Demandes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {profileError && (
          <p className="mt-2 text-body-sm text-error">{profileError}</p>
        )}
      </DashboardSection>

      {statsError && hasStore && (
        <ErrorState
          message={statsError}
          onRetry={() => {
            void refreshStore();
            void refreshProfile();
            window.location.reload();
          }}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingStats || servicesLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
          </>
        ) : (
          <>
            {hasStore && (
              <>
                <DashboardStat
                  label="Produits"
                  value={stats?.products_count ?? 0}
                  icon={Package}
                  href="/seller/products"
                />
                <DashboardStat
                  label="Commandes boutique"
                  value={stats?.orders_count ?? 0}
                  icon={ShoppingBag}
                  href="/seller/orders"
                />
                <DashboardStat
                  label="Paiements en attente"
                  value={stats?.payments_proof_submitted ?? 0}
                  icon={CreditCard}
                  href="/seller/payments"
                />
              </>
            )}
            {hasProfile && (
              <>
                <DashboardStat
                  label="Services actifs"
                  value={activeServices}
                  icon={Wrench}
                  href="/seller/services"
                />
                <DashboardStat
                  label="Demandes en attente"
                  value={pendingRequests}
                  icon={ClipboardList}
                  href="/seller/service-requests"
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
