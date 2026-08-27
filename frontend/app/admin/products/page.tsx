"use client";

import { Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminProduct } from "@/features/admin/types/admin.types";
import type { ProductStatus } from "@/features/products/types/product.types";
import { isApiError } from "@/lib/api/errors";
import { formatPrice, unwrapList } from "@/lib/utils";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  OUT_OF_STOCK: "Rupture de stock",
  ARCHIVED: "Archivé",
};

const STATUS_VARIANTS: Record<
  ProductStatus,
  "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  OUT_OF_STOCK: "warning",
  ARCHIVED: "error",
};

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminProducts();
      setProducts(unwrapList(data));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminService
      .getAdminProducts()
      .then((data) => {
        if (!cancelled) setProducts(unwrapList(data));
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

  const handleArchive = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await adminService.archiveAdminProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast({ title: "Produit archivé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de l'archivage",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Produits</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Modération du catalogue produits de la marketplace.
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

      {!loading && !error && products.length === 0 && (
        <EmptyState icon={Package} title="Aucun produit" />
      )}

      {!loading && !error && products.length > 0 && (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{product.name}</p>
                    <Badge variant={STATUS_VARIANTS[product.status]}>
                      {STATUS_LABELS[product.status]}
                    </Badge>
                  </div>
                  <p className="text-caption text-text-muted">
                    {product.store.name} · {product.owner_email} ·{" "}
                    {formatPrice(Number(product.price))}
                  </p>
                </div>
                {product.status !== "ARCHIVED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busyId === product.id}
                    onClick={() => void handleArchive(product.id)}
                  >
                    Archiver
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
