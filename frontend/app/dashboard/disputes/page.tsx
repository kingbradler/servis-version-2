"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Scale } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import {
  closeDispute,
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  listMyDisputes,
  type Dispute,
} from "@/features/disputes/api/disputes.api";
import { isApiError } from "@/lib/api/errors";

function Content() {
  const { toast } = useToast();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyDisputes();
      setItems(data.results);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onClose = async (id: string) => {
    setClosing(id);
    try {
      await closeDispute(id);
      toast({ title: "Litige fermé", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Impossible",
        variant: "error",
      });
    } finally {
      setClosing(null);
    }
  };

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-6">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Litiges</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Suivez les réclamations ouvertes sur vos commandes ou demandes.
          </p>
        </div>

        {loading && <Skeleton className="h-32 w-full rounded-xl" />}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={Scale}
            title="Aucun litige"
            description="Vous pouvez ouvrir un litige depuis le détail d'une commande ou d'une demande terminée."
          />
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="space-y-4">
            {items.map((d) => (
              <li
                key={d.id}
                className="space-y-3 rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.subject_label}</p>
                    <p className="text-caption text-text-muted">
                      {DISPUTE_REASON_LABELS[d.reason]} ·{" "}
                      {new Date(d.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {DISPUTE_STATUS_LABELS[d.status]}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-body-sm">{d.description}</p>
                {d.seller_reply ? (
                  <div className="rounded-lg bg-background p-3 text-body-sm">
                    <p className="font-medium">Réponse du professionnel</p>
                    <p className="mt-1 whitespace-pre-wrap text-text-secondary">
                      {d.seller_reply}
                    </p>
                  </div>
                ) : null}
                {(d.status === "OPEN" || d.status === "SELLER_REPLIED") && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={closing === d.id}
                    onClick={() => void onClose(d.id)}
                  >
                    Fermer le litige
                  </Button>
                )}
                {d.order_id && (
                  <Link
                    href={`/dashboard/orders/${d.order_id}`}
                    className="block text-caption text-primary hover:underline"
                  >
                    Voir la commande
                  </Link>
                )}
                {d.service_request_id && (
                  <Link
                    href={`/dashboard/service-requests/${d.service_request_id}`}
                    className="block text-caption text-primary hover:underline"
                  >
                    Voir la demande
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ClientDisputesPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
