"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { PageHero } from "@/components/brand/PageHero";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { AroundMeButton } from "@/features/map/components/AroundMeButton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useCities } from "@/features/cities/hooks/useCities";
import { CategoryPills } from "@/features/marketplace/components/CategoryPills";
import { ServiceCard } from "@/features/pro-services/components/ServiceCard";
import { ServiceFiltersPanel } from "@/features/pro-services/components/ServiceFilters";
import { usePublicServices } from "@/features/pro-services/hooks/usePublicServices";
import type { PublicServiceFilters } from "@/features/pro-services/types/service.types";
import type { Category } from "@/features/categories/types/category.types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  buildServicesHref,
  parseServiceFilters,
} from "@/lib/marketplace/service-filters";

function flattenServiceCategories(categories: Category[]): Category[] {
  const flat: Category[] = [];
  for (const root of categories) {
    if (root.children?.length) {
      for (const child of root.children) {
        flat.push({
          ...child,
          parent: root.id,
          children: [],
        });
      }
    } else {
      flat.push(root);
    }
  }
  return flat;
}

function ServicesCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseServiceFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const urlSearch = filters.search ?? "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    const current = filters.search || undefined;
    if (next === current) return;
    const updated: PublicServiceFilters = {
      ...filters,
      search: next,
      page: 1,
    };
    router.replace(buildServicesHref(updated), { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryFilters = useMemo(
    () => ({
      ...filters,
      ordering: filters.ordering ?? "-created_at",
      page_size: filters.page_size ?? 20,
      page: filters.page ?? 1,
    }),
    [filters]
  );

  const { services, count, loading, error, refresh } =
    usePublicServices(queryFilters);
  const { categories } = useCategories(undefined, { for: "service" });
  const { cities } = useCities();
  const pillCategories = useMemo(
    () => flattenServiceCategories(categories),
    [categories]
  );

  const applyFilters = useCallback(
    (next: PublicServiceFilters) => {
      router.push(buildServicesHref(next));
    },
    [router]
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setPrevUrlSearch("");
    router.push("/services");
  }, [router]);

  const page = queryFilters.page ?? 1;
  const pageSize = queryFilters.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        <PageHero
          tone="dark"
          eyebrow="Services"
          title="Trouver un service"
          description="Recherchez par métier, filtrez par ville ou prix — résultats synchronisés avec l'URL."
        >
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un service ou un professionnel…"
              aria-label="Rechercher un service ou un professionnel"
              className="h-12 w-full rounded-xl border-[1.5px] border-white/11 bg-white/8 pl-10 pr-4 text-body-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AroundMeButton
              className="[&_button]:rounded-xl [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/15 [&_button]:hover:text-white [&_p]:text-red-300"
              onLocated={(coords, radiusKm) =>
                applyFilters({
                  ...queryFilters,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  radius: radiusKm,
                  ordering: "distance",
                  page: 1,
                })
              }
            />
            <Link
              href={
                filters.category || filters.city || filters.search
                  ? `/explore?type=services&search=${encodeURIComponent(filters.search ?? "")}`
                  : "/explore?type=services"
              }
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-white/70 transition-colors hover:text-primary"
            >
              <MapPin className="h-4 w-4" />
              Voir sur la carte
            </Link>
          </div>
        </PageHero>

        <div className="mb-6">
          <CategoryPills
            categories={pillCategories}
            activeSlug={queryFilters.category}
            allLabel="Tous les services"
            onSelect={(slug) =>
              applyFilters({ ...queryFilters, category: slug, page: 1 })
            }
          />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <ServiceFiltersPanel
            filters={queryFilters}
            categories={categories}
            cities={cities}
            onChange={applyFilters}
            onReset={resetFilters}
          />

          <div className="min-w-0 flex-1">
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

            {!loading && !error && services.length === 0 && (
              <EmptyState
                title="Aucun service trouvé"
                description="Essayez d'élargir vos filtres ou de modifier la recherche."
                actionLabel="Réinitialiser"
                onAction={resetFilters}
              />
            )}

            {!loading && !error && services.length > 0 && (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display text-[19px] font-extrabold text-text-primary">
                    {queryFilters.category
                      ? "Dans cette catégorie"
                      : "Services disponibles"}
                  </h2>
                  <span className="text-[13px] text-text-muted">
                    {count} service{count > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service, i) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      index={i}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={page <= 1}
                      onClick={() =>
                        applyFilters({ ...queryFilters, page: page - 1 })
                      }
                    >
                      Précédent
                    </Button>
                    <span className="text-body-sm text-text-secondary">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={page >= totalPages}
                      onClick={() =>
                        applyFilters({ ...queryFilters, page: page + 1 })
                      }
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}

export default function PublicServicesPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <div className="mx-auto max-w-[1200px] px-4 py-10">
            <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </MarketplaceShell>
      }
    >
      <ServicesCatalog />
    </Suspense>
  );
}
