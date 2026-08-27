"use client";

import { PageHero } from "@/components/brand/PageHero";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { CategoryCard } from "@/components/ui/category-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { resolveCategoryIcon } from "@/lib/marketplace/category-icons";

export default function CategoriesPage() {
  const { categories, loading, error, refresh } = useCategories();

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <PageHero
          eyebrow="Catégories"
          title="Explorer par catégorie"
          description="Choisissez une catégorie pour filtrer le catalogue."
        />

        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && categories.length === 0 && (
          <EmptyState
            title="Aucune catégorie"
            description="Les catégories apparaîtront bientôt."
          />
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                name={cat.name}
                slug={cat.slug}
                icon={resolveCategoryIcon(cat.icon)}
                href={`/products?category=${cat.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
