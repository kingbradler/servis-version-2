"use client";

import { Store as StoreIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminStore } from "@/features/admin/types/admin.types";
import type { StoreStatus } from "@/features/stores/types/store.types";
import { isApiError } from "@/lib/api/errors";
import { unwrapList } from "@/lib/utils";

const STATUS_LABELS: Record<StoreStatus, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
};

const STATUS_VARIANTS: Record<
  StoreStatus,
  "secondary" | "warning" | "success" | "error"
> = {
  DRAFT: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "error",
};

export default function AdminStoresPage() {
  const { toast } = useToast();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminStores();
      setStores(unwrapList(data));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminService
      .getAdminStores()
      .then((data) => {
        if (!cancelled) setStores(unwrapList(data));
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

  const applyAction = async (
    id: string,
    action: (id: string) => Promise<AdminStore>,
    successMessage: string
  ) => {
    setBusyId(id);
    try {
      const updated = await action(id);
      setStores((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast({ title: successMessage, variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de l'action",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Boutiques</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Approuvez, suspendez ou réactivez les boutiques vendeurs.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && stores.length === 0 && (
        <EmptyState icon={StoreIcon} title="Aucune boutique" />
      )}

      {!loading && !error && stores.length > 0 && (
        <div className="space-y-3">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{store.name}</p>
                    <Badge variant={STATUS_VARIANTS[store.status]}>
                      {STATUS_LABELS[store.status]}
                    </Badge>
                  </div>
                  <p className="text-caption text-text-muted">
                    {store.owner_email} · {store.city?.name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {store.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busyId === store.id}
                      onClick={() =>
                        void applyAction(
                          store.id,
                          adminService.approveStore,
                          "Boutique approuvée"
                        )
                      }
                    >
                      Approuver
                    </Button>
                  )}
                  {(store.status === "ACTIVE" || store.status === "PENDING") && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === store.id}
                      onClick={() =>
                        void applyAction(
                          store.id,
                          adminService.suspendStore,
                          "Boutique suspendue"
                        )
                      }
                    >
                      Suspendre
                    </Button>
                  )}
                  {store.status === "SUSPENDED" && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busyId === store.id}
                      onClick={() =>
                        void applyAction(
                          store.id,
                          adminService.activateStore,
                          "Boutique réactivée"
                        )
                      }
                    >
                      Réactiver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
