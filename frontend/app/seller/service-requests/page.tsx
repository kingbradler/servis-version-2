"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSellerServiceRequests } from "@/features/pro-services/hooks/useServiceRequests";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_VARIANTS,
} from "@/features/pro-services/types/service-request.types";

export default function SellerServiceRequestsPage() {
  const { requests, loading, error, refresh } = useSellerServiceRequests();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">
          Demandes de services
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Demandes reçues sur vos services. Aucun paiement dans cette version.
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
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Aucune demande pour le moment"
          description="Les demandes clients apparaîtront ici."
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {requests.map((req) => (
              <li key={req.id}>
                <Link
                  href={`/seller/service-requests/${req.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{req.service.name}</p>
                    <p className="text-caption text-text-muted">
                      {req.client.first_name} {req.client.last_name} ·{" "}
                      {req.requested_date || "Date libre"}
                      {req.requested_time
                        ? ` · ${String(req.requested_time).slice(0, 5)}`
                        : ""}{" "}
                      · {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant={SERVICE_REQUEST_STATUS_VARIANTS[req.status]}>
                    {SERVICE_REQUEST_STATUS_LABELS[req.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
