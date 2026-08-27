"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import {
  listEligibleProductReviewItems,
  listEligibleReviewRequests,
  listMyProductReviews,
  listMyReviews,
  type EligibleProductReviewItem,
  type EligibleReviewRequest,
  type ProductReview,
  type Review,
} from "@/features/reviews/api/reviews.api";
import { LeaveProductReviewForm } from "@/features/reviews/components/LeaveProductReviewForm";
import { LeaveReviewForm } from "@/features/reviews/components/LeaveReviewForm";
import { StarRating } from "@/features/reviews/components/StarRating";
import { isApiError } from "@/lib/api/errors";

function Content() {
  const [eligibleServices, setEligibleServices] = useState<
    EligibleReviewRequest[]
  >([]);
  const [eligibleProducts, setEligibleProducts] = useState<
    EligibleProductReviewItem[]
  >([]);
  const [mineServices, setMineServices] = useState<Review[]>([]);
  const [mineProducts, setMineProducts] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eligS, eligP, reviewsS, reviewsP] = await Promise.all([
        listEligibleReviewRequests(),
        listEligibleProductReviewItems(),
        listMyReviews(),
        listMyProductReviews(),
      ]);
      setEligibleServices(eligS.results);
      setEligibleProducts(eligP.results);
      setMineServices(reviewsS.results);
      setMineProducts(reviewsP.results);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleCount = eligibleServices.length + eligibleProducts.length;
  const mineCount = mineServices.length + mineProducts.length;

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-8">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Avis</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Notez un professionnel ou un produit après une prestation / commande
            terminée.
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}

        {!loading && !error && (
          <>
            <section className="space-y-4">
              <h3 className="font-semibold text-text-primary">
                À noter ({eligibleCount})
              </h3>
              {eligibleCount === 0 ? (
                <EmptyState
                  icon={Star}
                  title="Rien à noter pour le moment"
                  description="Dès qu'une demande ou une commande est terminée, vous pourrez laisser un avis ici."
                />
              ) : (
                <ul className="space-y-4">
                  {eligibleServices.map((item) => (
                    <li
                      key={`s-${item.id}`}
                      className="rounded-xl border border-border bg-surface p-5"
                    >
                      <p className="text-caption font-medium uppercase tracking-wide text-text-muted">
                        Service
                      </p>
                      <p className="font-semibold">{item.service_name}</p>
                      <p className="text-caption text-text-muted">
                        {item.professional.display_name} · terminée le{" "}
                        {new Date(item.completed_at).toLocaleDateString("fr-FR")}
                      </p>
                      <div className="mt-4 border-t border-border pt-4">
                        <LeaveReviewForm
                          serviceRequestId={item.id}
                          professionalName={item.professional.display_name}
                          onSuccess={() => void load()}
                        />
                      </div>
                    </li>
                  ))}
                  {eligibleProducts.map((item) => (
                    <li
                      key={`p-${item.id}`}
                      className="rounded-xl border border-border bg-surface p-5"
                    >
                      <p className="text-caption font-medium uppercase tracking-wide text-text-muted">
                        Produit
                      </p>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-caption text-text-muted">
                        {item.store_name} · commande terminée le{" "}
                        {new Date(item.completed_at).toLocaleDateString("fr-FR")}
                      </p>
                      {item.product_slug ? (
                        <Link
                          href={`/stores/${item.store_slug}/products/${item.product_slug}`}
                          className="mt-1 inline-block text-caption text-primary hover:underline"
                        >
                          Voir le produit
                        </Link>
                      ) : null}
                      <div className="mt-4 border-t border-border pt-4">
                        <LeaveProductReviewForm
                          orderItemId={item.id}
                          productName={item.product_name}
                          onSuccess={() => void load()}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="font-semibold text-text-primary">
                Mes avis ({mineCount})
              </h3>
              {mineCount === 0 ? (
                <p className="text-body-sm text-text-muted">
                  Vous n&apos;avez pas encore publié d&apos;avis.
                </p>
              ) : (
                <ul className="space-y-3">
                  {mineServices.map((review) => (
                    <li
                      key={`ms-${review.id}`}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-caption text-text-muted">Service</p>
                          <p className="font-semibold">
                            {review.professional.display_name}
                          </p>
                        </div>
                        <StarRating value={review.rating} size="sm" />
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-body-sm text-text-secondary">
                          {review.comment}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {mineProducts.map((review) => (
                    <li
                      key={`mp-${review.id}`}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-caption text-text-muted">Produit</p>
                          <p className="font-semibold">
                            {review.product_name_snapshot || review.product.name}
                          </p>
                        </div>
                        <StarRating value={review.rating} size="sm" />
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-body-sm text-text-secondary">
                          {review.comment}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ClientReviewsPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
