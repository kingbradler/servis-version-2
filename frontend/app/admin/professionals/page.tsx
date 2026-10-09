"use client";

import { Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminProfessional } from "@/features/admin/types/admin.types";
import type { ProfessionalStatus } from "@/features/professionals/api/seller-professional.api";
import { isApiError } from "@/lib/api/errors";
import { unwrapList } from "@/lib/utils";

const STATUS_LABELS: Record<ProfessionalStatus, string> = {
    DRAFT: "Brouillon",
    PENDING: "En attente",
    ACTIVE: "Actif",
    SUSPENDED: "Suspendu",
};

const STATUS_VARIANTS: Record<
    ProfessionalStatus,
    "secondary" | "warning" | "success" | "error"
> = {
    DRAFT: "secondary",
    PENDING: "warning",
    ACTIVE: "success",
    SUSPENDED: "error",
};

export default function AdminProfessionalsPage() {
    const { toast } = useToast();
    const [items, setItems] = useState<AdminProfessional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getAdminProfessionals();
            setItems(unwrapList(data));
        } catch (err) {
            setError(isApiError(err) ? err.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const changeStatus = async (
        id: string,
        status: "ACTIVE" | "SUSPENDED",
        successMessage: string
    ) => {
        setBusyId(id);
        try {
            const updated = await adminService.setProfessionalStatus(id, status);
            setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
                <h2 className="text-heading-l font-bold tracking-tight">
                    Professionnels
                </h2>
                <p className="mt-1 text-body-sm text-text-secondary">
                    Validez, suspendez ou réactivez les profils de prestataires de
                    services.
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

            {!loading && !error && items.length === 0 && (
                <EmptyState icon={Wrench} title="Aucun professionnel" />
            )}

            {!loading && !error && items.length > 0 && (
                <div className="space-y-3">
                    {items.map((pro) => (
                        <Card key={pro.id}>
                            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="min-w-0 break-words font-medium">
                                            {pro.display_name}
                                        </p>
                                        <Badge variant={STATUS_VARIANTS[pro.status]}>
                                            {STATUS_LABELS[pro.status]}
                                        </Badge>
                                    </div>
                                    <p className="text-caption text-text-muted">
                                        {pro.owner_email}
                                        {pro.city?.name ? ` · ${pro.city.name}` : ""}
                                    </p>
                                    {pro.headline && (
                                        <p className="mt-1 text-body-sm text-text-secondary">
                                            {pro.headline}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {pro.status === "PENDING" && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            loading={busyId === pro.id}
                                            onClick={() =>
                                                void changeStatus(pro.id, "ACTIVE", "Profil validé")
                                            }
                                        >
                                            Valider
                                        </Button>
                                    )}
                                    {(pro.status === "ACTIVE" || pro.status === "PENDING") && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            loading={busyId === pro.id}
                                            onClick={() =>
                                                void changeStatus(
                                                    pro.id,
                                                    "SUSPENDED",
                                                    "Profil suspendu"
                                                )
                                            }
                                        >
                                            Suspendre
                                        </Button>
                                    )}
                                    {pro.status === "SUSPENDED" && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            loading={busyId === pro.id}
                                            onClick={() =>
                                                void changeStatus(pro.id, "ACTIVE", "Profil réactivé")
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