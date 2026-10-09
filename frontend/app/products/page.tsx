"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { PageHero } from "@/components/brand/PageHero";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useCities } from "@/features/cities/hooks/useCities";
import { CategoryPills } from "@/features/marketplace/components/CategoryPills";
import { ProductFiltersPanel } from "@/features/products/components/ProductFilters";
import { ProductGrid } from "@/features/products/components/ProductGrid";
import { usePublicProducts } from "@/features/products/hooks/usePublicProducts";
import type { PublicProductFilters } from "@/features/products/types/product.types";
import { usePublicStores } from "@/features/stores/hooks/usePublicStores";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  buildProductsHref,
  parseProductFilters,
} from "@/lib/marketplace/product-filters";

function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseProductFilters(new URLSearchParams(searchParams.toString())),
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
    const updated: PublicProductFilters = {
      ...filters,
      search: next,
      page: 1,
    };
    router.replace(buildProductsHref(updated), { scroll: false });
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

  const { products, count, loading, error, refresh } =
    usePublicProducts(queryFilters);
  const { categories } = useCategories();
  const { cities } = useCities();
  const { stores } = usePublicStores();

  const applyFilters = useCallback(
    (next: PublicProductFilters) => {
      router.push(buildProductsHref(next));
    },
    [router]
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setPrevUrlSearch("");
    router.push("/products");
  }, [router]);

  const page = queryFilters.page ?? 1;
  const pageSize = queryFilters.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <MarketplaceShell>
      <div className="mx-auto w-full min-w-0 max-w-[1200px] overflow-x-clip px-3 py-5 sm:px-6 sm:py-10 lg:px-12">
        <PageHero
          tone="dark"
          eyebrow="Marketplace"
          title="Catalogue produits"
          description="Filtrez par catégorie, ville, boutique ou prix — résultats synchronisés avec l'URL."
        >
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un produit…"
              className="h-12 w-full rounded-xl border-[1.5px] border-white/11 bg-white/8 pl-10 pr-4 text-body-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary"
              aria-label="Rechercher"
            />
          </div>
        </PageHero>

        <div className="mb-6 min-w-0 max-w-full">
          <CategoryPills
            categories={categories}
            activeSlug={queryFilters.category}
            onSelect={(slug) =>
              applyFilters({ ...queryFilters, category: slug, page: 1 })
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
          <ProductFiltersPanel
            filters={queryFilters}
            categories={categories}
            cities={cities}
            stores={stores}
            onChange={applyFilters}
            onReset={resetFilters}
          />

          <div className="min-w-0 flex-1">
            {loading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {!loading && error && (
              <ErrorState message={error} onRetry={() => void refresh()} />
            )}

            {!loading && !error && products.length === 0 && (
              <EmptyState
                title={
                  queryFilters.search ||
                  queryFilters.category ||
                  queryFilters.city ||
                  queryFilters.store
                    ? "Aucun produit trouvé"
                    : "Pas encore de produits"
                }
                description={
                  queryFilters.search ||
                  queryFilters.category ||
                  queryFilters.city ||
                  queryFilters.store
                    ? "Élargissez vos filtres ou modifiez la recherche."
                    : "Soyez le premier à vendre sur SERVIS : inscription en quelques minutes."
                }
                actionLabel={
                  queryFilters.search ||
                  queryFilters.category ||
                  queryFilters.city ||
                  queryFilters.store
                    ? "Réinitialiser"
                    : "Vendre sur SERVIS"
                }
                onAction={
                  queryFilters.search ||
                  queryFilters.category ||
                  queryFilters.city ||
                  queryFilters.store
                    ? resetFilters
                    : () => router.push("/register")
                }
              />
            )}

            {!loading && !error && products.length > 0 && (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display text-[19px] font-extrabold text-text-primary">
                    {queryFilters.category
                      ? "Dans cette catégorie"
                      : "Tendances du moment"}
                  </h2>
                  <span className="text-[13px] text-text-muted">
                    {count} produit{count > 1 ? "s" : ""}
                  </span>
                </div>
                <ProductGrid products={products} />

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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <div className="mx-auto max-w-[1200px] px-4 py-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </MarketplaceShell>
      }
    >
      <ProductsCatalog />
    </Suspense>
  );
}
