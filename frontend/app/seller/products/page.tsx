"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useSellerProducts } from "@/features/products/hooks/useSellerProducts";
import type { ProductStatus } from "@/features/products/types/product.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";

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

export default function SellerProductsPage() {
  const router = useRouter();
  const { products, loading, error, refresh, archive, publish } =
    useSellerProducts();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      await publish(id);
      toast({ title: "Produit publié", variant: "success" });
    } catch (err) {
      toast({
        title: "Publication impossible",
        description: getUserFacingErrorMessage(
          err,
          "Impossible de publier ce produit pour le moment."
        ),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setBusyId(id);
    try {
      await archive(id);
      toast({ title: "Produit archivé", variant: "success" });
    } catch (err) {
      toast({
        title: "Archivage impossible",
        description: getUserFacingErrorMessage(
          err,
          "Impossible d'archiver ce produit pour le moment."
        ),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Mes produits</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Gérez votre catalogue de produits.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/seller/products/new">
            <Plus className="h-4 w-4" />
            Nouveau produit
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="Aucun produit pour le moment"
          description="Ajoutez votre premier produit pour commencer à vendre."
          actionLabel="Ajouter un produit"
          onAction={() => router.push("/seller/products/new")}
        />
      )}

      {!loading && !error && products.length > 0 && (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-body-sm font-medium text-text-secondary">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-body-sm font-medium text-text-secondary">
                    Prix
                  </th>
                  <th className="px-4 py-3 text-body-sm font-medium text-text-secondary">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-body-sm font-medium text-text-secondary">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-body-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/seller/products/${product.id}`}
                        className="font-medium text-text-primary hover:text-primary"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-body-sm">
                      {formatPrice(Number(product.price))}
                    </td>
                    <td className="px-4 py-3 text-body-sm">{product.stock}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[product.status]}>
                        {STATUS_LABELS[product.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(product.status === "DRAFT" ||
                          product.status === "OUT_OF_STOCK") && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={busyId === product.id}
                            onClick={() => void handlePublish(product.id)}
                          >
                            Publier
                          </Button>
                        )}
                        {product.status !== "ARCHIVED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === product.id}
                            onClick={() => void handleArchive(product.id)}
                          >
                            Archiver
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/seller/products/${product.id}`}
                      className="font-medium text-text-primary hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    <Badge variant={STATUS_VARIANTS[product.status]}>
                      {STATUS_LABELS[product.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-body-sm text-text-secondary">
                    <span>{formatPrice(Number(product.price))}</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(product.status === "DRAFT" ||
                      product.status === "OUT_OF_STOCK") && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busyId === product.id}
                        onClick={() => void handlePublish(product.id)}
                      >
                        Publier
                      </Button>
                    )}
                    {product.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busyId === product.id}
                        onClick={() => void handleArchive(product.id)}
                      >
                        Archiver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
