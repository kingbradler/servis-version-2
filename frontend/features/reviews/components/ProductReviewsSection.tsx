"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getProductReviewSummary,
  listProductReviews,
  type ProductReview,
  type ProductReviewSummary,
} from "@/features/reviews/api/reviews.api";
import { StarRating } from "@/features/reviews/components/StarRating";
import { isApiError } from "@/lib/api/errors";

function authorLabel(review: ProductReview): string {
  const first = review.author.first_name?.trim() || "";
  const last = review.author.last_name?.trim() || "";
  const name = `${first} ${last}`.trim();
  return name || "Client";
}

export function ProductReviewsSection({
  storeSlug,
  productSlug,
}: {
  storeSlug: string;
  productSlug: string;
}) {
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sum, list] = await Promise.all([
          getProductReviewSummary(storeSlug, productSlug),
          listProductReviews(storeSlug, productSlug, 1),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setReviews(Array.isArray(list) ? list : list.results ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            isApiError(err) ? err.message : "Impossible de charger les avis"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeSlug, productSlug]);

  if (loading) {
    return <LoadingState message="Chargement des avis…" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const count = summary?.ratings_count ?? 0;
  const avg = summary?.average_rating;

  return (
    <section className="mt-10 space-y-5 border-t border-cr2 pt-8 dark:border-border">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] font-extrabold text-text-primary">
            Avis clients
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Notes après achat (commande terminée).
          </p>
        </div>
        {count > 0 && avg != null ? (
          <div className="flex items-center gap-2">
            <StarRating value={avg} />
            <span className="text-body-sm font-semibold text-text-primary">
              {avg.toFixed(1)}
            </span>
            <span className="text-caption text-text-muted">({count} avis)</span>
          </div>
        ) : null}
      </div>

      {count === 0 ? (
        <EmptyState
          title="Pas encore d'avis"
          description="Les clients peuvent noter après un paiement confirmé."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-xl border border-cr2 bg-white p-4 dark:border-border dark:bg-surface"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-text-primary">
                  {authorLabel(review)}
                </p>
                <StarRating value={review.rating} size="sm" />
              </div>
              {review.comment ? (
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-text-secondary">
                  {review.comment}
                </p>
              ) : null}
              <p className="mt-2 text-caption text-text-muted">
                {new Date(review.created_at).toLocaleDateString("fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
