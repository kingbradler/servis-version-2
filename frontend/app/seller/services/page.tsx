"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatServicePrice } from "@/features/pro-services/api/services.api";
import { useSellerServices } from "@/features/pro-services/hooks/useSellerServices";
import { useSellerProfessional } from "@/features/professionals/hooks/useSellerProfessional";
import type { ServiceStatus } from "@/features/pro-services/types/service.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

const STATUS_LABELS: Record<ServiceStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  ARCHIVED: "Archivé",
};

const STATUS_VARIANTS: Record<
  ServiceStatus,
  "secondary" | "success" | "error"
> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  ARCHIVED: "error",
};

export default function SellerServicesPage() {
  const router = useRouter();
  const { services, loading, error, refresh, archive, publish } =
    useSellerServices();
  const { profile, loading: profileLoading, missing } = useSellerProfessional();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      await publish(id);
      toast({ title: "Service publié", variant: "success" });
    } catch (err) {
      toast({
        title: "Publication impossible",
        description: getUserFacingErrorMessage(
          err,
          "Impossible de publier ce service pour le moment."
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
      toast({ title: "Service archivé", variant: "success" });
    } catch (err) {
      toast({
        title: "Archivage impossible",
        description: getUserFacingErrorMessage(
          err,
          "Impossible d'archiver ce service pour le moment."
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
          <h2 className="text-heading-l font-bold tracking-tight">Mes services</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Gérez vos prestations professionnelles.
          </p>
        </div>
        <Button asChild variant="primary" disabled={missing || !profile}>
          <Link href="/seller/services/new">
            <Plus className="h-4 w-4" />
            Nouveau service
          </Link>
        </Button>
      </div>

      {!profileLoading && missing && (
        <EmptyState
          icon={Wrench}
          title="Vous ne proposez encore aucun service"
          description="Créez d'abord un profil professionnel pour publier des prestations."
          actionLabel="Créer mon profil professionnel"
          onAction={() => router.push("/seller/professional")}
        />
      )}

      {(profileLoading || loading) && !missing && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !profileLoading && !missing && error && (
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && !profileLoading && !missing && !error && services.length === 0 && (
        <EmptyState
          title="Vous ne proposez encore aucun service"
          description="Créez votre première prestation pour apparaître dans la marketplace des services."
          actionLabel="Créer un service"
          onAction={() => router.push("/seller/services/new")}
        />
      )}

      {!loading && !missing && !error && services.length > 0 && (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary-light p-2 text-primary">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/seller/services/${service.id}`}
                      className="font-semibold text-text-primary hover:text-primary"
                    >
                      {service.name}
                    </Link>
                    <p className="mt-0.5 text-caption text-text-muted">
                      {formatServicePrice(service.price, service.price_type)}
                      {service.duration ? ` · ${service.duration}` : ""}
                    </p>
                    <div className="mt-2">
                      <Badge variant={STATUS_VARIANTS[service.status]}>
                        {STATUS_LABELS[service.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/seller/services/${service.id}`)}
                  >
                    Modifier
                  </Button>
                  {service.status === "DRAFT" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busyId === service.id}
                      onClick={() => void handlePublish(service.id)}
                    >
                      Publier
                    </Button>
                  )}
                  {service.status !== "ARCHIVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === service.id}
                      onClick={() => void handleArchive(service.id)}
                    >
                      Archiver
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
