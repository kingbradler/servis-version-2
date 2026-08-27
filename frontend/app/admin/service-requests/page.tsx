"use client";

import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminServiceRequests } from "@/features/pro-services/api/service-requests.api";
import type { ServiceRequest } from "@/features/pro-services/types/service-request.types";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_VARIANTS,
} from "@/features/pro-services/types/service-request.types";
import { isApiError } from "@/lib/api/errors";

export default function AdminServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminServiceRequests();
      setRequests(data.results);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAdminServiceRequests()
      .then((data) => {
        if (!cancelled) {
          setRequests(data.results);
          setError(null);
        }
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
        <h2 className="text-heading-l font-bold tracking-tight">
          Demandes de services
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Lecture seule — l&apos;admin ne confirme ni ne refuse à la place du
          professionnel.
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

      {!loading && !error && requests.length === 0 && (
        <EmptyState icon={ClipboardList} title="Aucune demande" />
      )}

      {!loading && !error && requests.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{req.service.name}</p>
                  <p className="text-caption text-text-muted">
                    Client : {req.client.email} · Pro :{" "}
                    {req.professional.display_name} ·{" "}
                    {req.requested_date || "—"} ·{" "}
                    {new Date(req.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge variant={SERVICE_REQUEST_STATUS_VARIANTS[req.status]}>
                  {SERVICE_REQUEST_STATUS_LABELS[req.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
