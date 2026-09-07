"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ProductGrid } from "@/features/products/components/ProductGrid";
import { usePublicProducts } from "@/features/products/hooks/usePublicProducts";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { usePublicStore } from "@/features/stores/hooks/usePublicStore";

export function StoreDetailPage({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const { store, loading, error, refresh } = usePublicStore(storeSlug);
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refresh: refreshProducts,
  } = usePublicProducts({
    store: storeSlug,
    ordering: "-created_at",
    page_size: 8,
  });

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {loading && (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-[26px] bg-surface-secondary" />
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && !store && (
          <EmptyState
            title="Boutique introuvable"
            description="Cette boutique n'existe pas ou n'est plus visible."
            actionLabel="Voir les boutiques"
            onAction={() => router.push("/stores")}
          />
        )}

        {!loading && store && (
          <>
            <section className="overflow-hidden rounded-[26px] border border-cr2 bg-white dark:border-border dark:bg-surface">
              <div className="relative h-44 bg-dk sm:h-56">
                {store.banner ? (
                  <Image
                    src={resolveMediaUrl(store.banner)!}
                    alt={`Bannière ${store.name}`}
                    fill
                    className="object-cover opacity-90"
                    sizes="100vw"
                    priority
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-dk via-dk2 to-primary/30" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(232,66,8,0.35),transparent_55%)]" />
              </div>
              <div className="relative px-5 pb-6 sm:px-8">
                <div className="-mt-12 mb-4 flex flex-wrap items-end gap-4 sm:-mt-14">
                  <Avatar
                    size="xl"
                    className="border-4 border-white shadow-lg dark:border-surface"
                  >
                    {store.logo && (
                      <AvatarImage
                        src={resolveMediaUrl(store.logo)}
                        alt={store.name}
                      />
                    )}
                    <AvatarFallback>
                      {store.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-heading-l tracking-tight text-text-primary">
                        {store.name}
                      </h1>
                      <Badge variant="success">Active</Badge>
                    </div>
                    {store.city?.name && (
                      <p className="mt-1 text-body-sm text-text-secondary">
                        {store.city.name}
                        {store.city.region ? ` · ${store.city.region}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {store.description?.trim() ? (
                  <div className="max-w-3xl rounded-2xl bg-surface-secondary/70 px-4 py-4 dark:bg-white/5">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
                      À propos de la boutique
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-body leading-relaxed text-text-primary">
                      {store.description.trim()}
                    </p>
                  </div>
                ) : (
                  <p className="text-body-sm text-text-muted">
                    Cette boutique n’a pas encore ajouté de description.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild variant="primary" size="lg" className="rounded-xl">
                    <Link href={`/stores/${store.slug}/products`}>
                      Voir les produits
                    </Link>
                  </Button>
                  {store.whatsapp && (
                    <Button asChild variant="outline" size="lg" className="rounded-xl">
                      <a
                        href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  {store.phone && (
                    <Button asChild variant="ghost" size="lg" className="rounded-xl">
                      <a href={`tel:${store.phone}`}>
                        <Phone className="h-4 w-4" />
                        {store.phone}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-10">
              <div className="mb-5 flex items-end justify-between gap-3">
                <h2 className="font-display text-[19px] font-extrabold text-text-primary">
                  Produits de la boutique
                </h2>
                <Link
                  href={`/stores/${store.slug}/products`}
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  Tout voir →
                </Link>
              </div>

              {productsLoading && (
                <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}
              {!productsLoading && productsError && (
                <ErrorState
                  message={productsError}
                  onRetry={() => void refreshProducts()}
                />
              )}
              {!productsLoading && !productsError && products.length === 0 && (
                <EmptyState
                  title="Cette boutique ne propose actuellement aucun produit"
                  description="Revenez bientôt pour découvrir leurs offres."
                />
              )}
              {!productsLoading && !productsError && products.length > 0 && (
                <ProductGrid products={products} />
              )}
            </section>
          </>
        )}
      </div>
    </MarketplaceShell>
  );
}
