"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";

import { PageHero } from "@/components/brand/PageHero";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StoreCard } from "@/components/ui/store-card";
import { AroundMeButton } from "@/features/map/components/AroundMeButton";
import { usePublicStores } from "@/features/stores/hooks/usePublicStores";
import type { PublicStoreFilters } from "@/features/stores/types/store.types";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function StoresListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [geo, setGeo] = useState<Pick<
    PublicStoreFilters,
    "latitude" | "longitude" | "radius" | "ordering"
  > | null>(null);
  const debounced = useDebouncedValue(search, 350);
  const { stores, loading, error, refresh } = usePublicStores({
    search: debounced.trim() || undefined,
    ordering: geo?.ordering ?? "name",
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    radius: geo?.radius,
  });

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        <PageHero
          tone="dark"
          eyebrow="Boutiques"
          title="Toutes les boutiques"
          description="Découvrez les vendeurs actifs sur SERVIS près de chez vous."
        >
          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une boutique…"
              className="h-12 w-full rounded-xl border-[1.5px] border-white/11 bg-white/8 pl-10 pr-4 text-body-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AroundMeButton
              className="[&_button]:rounded-xl [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/15 [&_button]:hover:text-white [&_p]:text-red-300"
              onLocated={(coords, radiusKm) =>
                setGeo({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  radius: radiusKm,
                  ordering: "distance",
                })
              }
            />
            <Link
              href="/explore?type=stores"
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-white/70 transition-colors hover:text-primary"
            >
              <MapPin className="h-4 w-4" />
              Explorer sur la carte
            </Link>
          </div>
        </PageHero>

        {!loading && !error && stores.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-[19px] font-extrabold text-text-primary">
              Boutiques actives
            </h2>
            <span className="text-[13px] text-text-muted">
              {stores.length} résultat{stores.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {loading && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && stores.length === 0 && (
          <EmptyState
            title="Aucune boutique trouvée"
            description="Essayez une autre recherche."
            actionLabel="Voir les produits"
            onAction={() => router.push("/products")}
          />
        )}

        {!loading && !error && stores.length > 0 && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store, i) => (
              <StoreCard
                key={store.id}
                index={i}
                name={store.name}
                slug={store.slug}
                description={store.description}
                city={store.location?.city || store.city?.name}
                logoUrl={resolveMediaUrl(store.logo)}
                bannerUrl={resolveMediaUrl(store.banner)}
              />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-caption text-text-muted">
          <Link href="/products" className="text-primary hover:underline">
            Voir tous les produits
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}
