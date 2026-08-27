"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import { useMyServiceRequests } from "@/features/pro-services/hooks/useServiceRequests";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_VARIANTS,
} from "@/features/pro-services/types/service-request.types";

function Content() {
  const router = useRouter();
  const { requests, loading, error, refresh } = useMyServiceRequests();

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-6">
        <h2 className="text-heading-l font-bold tracking-tight">
          Mes demandes de services
        </h2>
        <p className="text-body-sm text-text-secondary">
          Suivez vos demandes auprès des professionnels. Aucun paiement à cette
          étape.
        </p>

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

        {!loading && !error && requests.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="Vous n'avez encore aucune demande de service"
            description="Demandez un service depuis une fiche publique."
            actionLabel="Voir les services"
            onAction={() => router.push("/services")}
          />
        )}

        {!loading && !error && requests.length > 0 && (
          <ul className="space-y-3">
            {requests.map((req) => (
              <li
                key={req.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{req.service.name}</p>
                    <p className="text-caption text-text-muted">
                      {req.professional.display_name} ·{" "}
                      {new Date(req.created_at).toLocaleString("fr-FR")}
                    </p>
                    <div className="mt-2">
                      <Badge
                        variant={SERVICE_REQUEST_STATUS_VARIANTS[req.status]}
                      >
                        {SERVICE_REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/service-requests/${req.id}`}>
                      Détail
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ClientServiceRequestsPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
