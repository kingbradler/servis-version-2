"use client";

import { CreditCard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminPayment } from "@/features/admin/types/admin.types";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentInstructions";
import { isApiError } from "@/lib/api/errors";
import { formatPrice, unwrapList } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminPayments();
      setPayments(unwrapList(data));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminService
      .getAdminPayments()
      .then((data) => {
        if (!cancelled) setPayments(unwrapList(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Paiements</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Vue lecture seule des paiements. La confirmation/rejet est réservée
          aux vendeurs.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && payments.length === 0 && (
        <EmptyState icon={CreditCard} title="Aucun paiement" />
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {payment.order_id
                      ? `Commande #${payment.order_id.slice(0, 8)}`
                      : payment.service_request_id
                        ? `Demande #${payment.service_request_id.slice(0, 8)}`
                        : `Paiement #${payment.id.slice(0, 8)}`}
                  </p>
                  <p className="text-caption text-text-muted">
                    {payment.payment_method?.label} ·{" "}
                    {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={payment.status} />
                  <span className="text-body-sm font-semibold">
                    {formatPrice(Number(payment.amount))}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
