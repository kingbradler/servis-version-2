"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { AddToCartButton } from "@/features/products/components/AddToCartButton";
import { ProductGallery } from "@/features/products/components/ProductGallery";
import { ProductVideoModal } from "@/features/products/components/ProductVideoModal";
import { usePublicProduct } from "@/features/products/hooks/usePublicProduct";
import {
  getProductReviewSummary,
  type ProductReviewSummary,
} from "@/features/reviews/api/reviews.api";
import { ProductReviewsSection } from "@/features/reviews/components/ProductReviewsSection";
import { StarRating } from "@/features/reviews/components/StarRating";
import { formatPrice } from "@/lib/utils";

export function ProductDetailView({
  storeSlug,
  productSlug,
}: {
  storeSlug: string;
  productSlug: string;
}) {
  const router = useRouter();
  const [videoOpen, setVideoOpen] = useState(false);
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const { product, loading, error, refresh } = usePublicProduct(
    storeSlug,
    productSlug
  );

  useEffect(() => {
    let cancelled = false;
    void getProductReviewSummary(storeSlug, productSlug)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeSlug, productSlug]);

  const available =
    product &&
    product.stock > 0 &&
    product.status !== "OUT_OF_STOCK" &&
    product.status !== "ARCHIVED";

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {loading && <LoadingState message="Chargement du produit…" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && !product && (
          <EmptyState
            title="Produit introuvable"
            description="Ce produit n'existe pas ou n'est plus disponible."
            actionLabel="Retour aux produits"
            onAction={() => router.push("/products")}
          />
        )}

        {!loading && !error && product && (
          <>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
              <ProductGallery
                images={product.images}
                productName={product.name}
              />

              <div className="space-y-5 lg:sticky lg:top-[88px]">
                <div>
                  <Link
                    href={`/stores/${product.store.slug}`}
                    className="text-caption font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
                  >
                    {product.store.name}
                  </Link>
                  <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                    {product.name}
                  </h1>
                  {summary &&
                    summary.ratings_count > 0 &&
                    summary.average_rating != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <StarRating value={summary.average_rating} size="sm" />
                        <span className="text-body-sm font-semibold text-text-primary">
                          {summary.average_rating.toFixed(1)}
                        </span>
                        <span className="text-caption text-text-muted">
                          ({summary.ratings_count} avis)
                        </span>
                      </div>
                    )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.category && (
                      <Link href={`/products?category=${product.category.slug}`}>
                        <Badge variant="secondary">
                          {product.category.name}
                        </Badge>
                      </Link>
                    )}
                    {product.is_featured && (
                      <Badge variant="primary">À la une</Badge>
                    )}
                    <Badge variant={available ? "success" : "warning"}>
                      {available ? "Disponible" : "Indisponible"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[28px] font-extrabold text-text-primary">
                    {formatPrice(Number(product.price))}
                  </span>
                  {product.compare_price &&
                    Number(product.compare_price) > Number(product.price) && (
                      <span className="text-body text-text-muted line-through">
                        {formatPrice(Number(product.compare_price))}
                      </span>
                    )}
                </div>

                {product.description && (
                  <p className="whitespace-pre-wrap text-body leading-relaxed text-text-secondary">
                    {product.description}
                  </p>
                )}

                {available && product.stock <= 10 && (
                  <p className="text-body-sm text-warning">
                    Plus que {product.stock} en stock
                  </p>
                )}
                {available && product.stock > 10 && (
                  <p className="text-body-sm text-text-muted">
                    En stock ({product.stock})
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <AddToCartButton
                    productId={product.id}
                    disabled={!available}
                    className="w-full rounded-xl sm:w-auto"
                  />
                  {product.video_url?.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl sm:w-auto"
                      onClick={() => setVideoOpen(true)}
                    >
                      <Play className="h-4 w-4" />
                      Voir la vidéo
                    </Button>
                  )}
                </div>

                {product.video_url?.trim() && (
                  <ProductVideoModal
                    open={videoOpen}
                    onOpenChange={setVideoOpen}
                    videoUrl={product.video_url}
                    productName={product.name}
                  />
                )}

                <div className="flex flex-wrap gap-4 border-t border-cr2 pt-4 text-body-sm dark:border-border">
                  <Link
                    href={`/stores/${product.store.slug}/products`}
                    className="font-medium text-primary hover:underline"
                  >
                    Autres produits de la boutique
                  </Link>
                  <Link
                    href="/products"
                    className="text-text-secondary transition-colors hover:text-primary"
                  >
                    ← Catalogue
                  </Link>
                </div>
              </div>
            </div>

            <ProductReviewsSection
              storeSlug={storeSlug}
              productSlug={productSlug}
            />
          </>
        )}
      </div>
    </MarketplaceShell>
  );
}
