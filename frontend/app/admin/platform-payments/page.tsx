"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import * as billingService from "@/features/billing/services/billing.service";
import type { PlatformPaymentMethod } from "@/features/billing/types/billing.types";
import { isApiError } from "@/lib/api/errors";

type MethodRow = PlatformPaymentMethod & {
  is_active: boolean;
  sort_order: number;
};

export default function AdminPlatformPaymentsPage() {
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMethods(await billingService.getAdminPlatformPaymentMethods());
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void billingService
      .getAdminPlatformPaymentMethods()
      .then((data) => {
        if (!cancelled) setMethods(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur");
        }
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
        <h2 className="text-heading-l font-bold tracking-tight">
          Moyens de paiement SERVIS
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Coordonnées affichées aux professionnels pour les abonnements. Édition
          complète via l&apos;admin Django si besoin.
        </p>
      </div>

      {loading && <Skeleton className="h-32 w-full" />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {!loading && !error && (
        <div className="space-y-3">
          {methods.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-1 pt-4 text-body-sm">
                <p className="font-medium">
                  {m.name}{" "}
                  {!m.is_active && (
                    <span className="text-text-muted">(inactif)</span>
                  )}
                </p>
                <p>
                  {m.account_name} — {m.account_number}
                </p>
                <p className="text-text-secondary">{m.instructions}</p>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => void load()}>
            Actualiser
          </Button>
        </div>
      )}
    </div>
  );
}
