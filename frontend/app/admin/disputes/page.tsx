"use client";

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
import { adminNav } from "@/features/dashboard/nav";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  listAdminDisputes,
  resolveAdminDispute,
  type Dispute,
} from "@/features/disputes/api/disputes.api";
import { isApiError } from "@/lib/api/errors";

function Content() {
  const { toast } = useToast();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminDisputes();
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

  const resolve = async (
    id: string,
    status: "RESOLVED" | "REJECTED" | "CLOSED"
  ) => {
    setBusy(`${id}-${status}`);
    try {
      await resolveAdminDispute(id, {
        status,
        admin_note: notes[id] || "",
      });
      toast({ title: "Litige mis à jour", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Impossible",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardShell title="Admin" items={adminNav}>
      <div className="space-y-6">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Litiges</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Modération des réclamations marketplace.
          </p>
        </div>

        {loading && <Skeleton className="h-32 w-full rounded-xl" />}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon={Scale} title="Aucun litige" description="" />
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
                      {d.opened_by_email} · {DISPUTE_REASON_LABELS[d.reason]}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {DISPUTE_STATUS_LABELS[d.status]}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-body-sm">{d.description}</p>
                {d.seller_reply ? (
                  <p className="text-body-sm text-text-secondary">
                    Réponse vendeur : {d.seller_reply}
                  </p>
                ) : null}
                {(d.status === "OPEN" || d.status === "SELLER_REPLIED") && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <textarea
                      value={notes[d.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
                      placeholder="Note admin (optionnel)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={busy === `${d.id}-RESOLVED`}
                        onClick={() => void resolve(d.id, "RESOLVED")}
                      >
                        Résoudre
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={busy === `${d.id}-REJECTED`}
                        onClick={() => void resolve(d.id, "REJECTED")}
                      >
                        Rejeter
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === `${d.id}-CLOSED`}
                        onClick={() => void resolve(d.id, "CLOSED")}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}

export default function AdminDisputesPage() {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <Content />
    </RequireAuth>
  );
}
