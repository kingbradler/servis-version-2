"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ProductGrid } from "@/features/products/components/ProductGrid";
import { usePublicProducts } from "@/features/products/hooks/usePublicProducts";
import { usePublicStore } from "@/features/stores/hooks/usePublicStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function StoreProductsPage({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const { store, loading: storeLoading, error: storeError, refresh } =
    usePublicStore(storeSlug);

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const queryKey = `${debouncedSearch}|${ordering}`;
  const [activeKey, setActiveKey] = useState(queryKey);
  if (queryKey !== activeKey) {
    setActiveKey(queryKey);
    setPage(1);
  }

  const filters = useMemo(
    () => ({
      store: storeSlug,
      search: debouncedSearch.trim() || undefined,
      ordering,
      page,
      page_size: 20,
    }),
    [storeSlug, debouncedSearch, ordering, page]
  );

  const { products, count, loading, error, refresh: refreshProducts } =
    usePublicProducts(filters);

  const totalPages = Math.max(1, Math.ceil(count / 20));

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {storeLoading && <SkeletonCard />}
        {!storeLoading && storeError && (
          <ErrorState message={storeError} onRetry={() => void refresh()} />
        )}

        {!storeLoading && store && (
          <>
            <header className="mb-6">
              <Link
                href={`/stores/${store.slug}`}
                className="text-caption font-medium text-primary hover:underline"
              >
                ← {store.name}
              </Link>
              <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                Produits — {store.name}
              </h1>
            </header>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans cette boutique…"
                  className="h-11 w-full rounded-xl border-[1.5px] border-cr2 bg-white pl-10 pr-4 text-body-sm outline-none transition-colors focus:border-primary dark:border-border dark:bg-surface"
                />
              </div>
              <Select
                label="Tri"
                className="sm:w-52"
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                options={[
                  { value: "-created_at", label: "Plus récents" },
                  { value: "price", label: "Prix croissant" },
                  { value: "-price", label: "Prix décroissant" },
                  { value: "name", label: "Nom A→Z" },
                ]}
              />
            </div>

            {loading && (
              <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {!loading && error && (
              <ErrorState
                message={error}
                onRetry={() => void refreshProducts()}
              />
            )}

            {!loading && !error && products.length === 0 && (
              <EmptyState
                title="Cette boutique ne propose actuellement aucun produit"
                description="Aucun résultat pour vos critères."
                actionLabel="Voir la boutique"
                onAction={() => router.push(`/stores/${store.slug}`)}
              />
            )}

            {!loading && !error && products.length > 0 && (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display text-[19px] font-extrabold text-text-primary">
                    Catalogue
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
                      onClick={() => setPage((p) => p - 1)}
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
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MarketplaceShell>
  );
}
