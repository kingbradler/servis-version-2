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
import { sellerNav } from "@/features/dashboard/nav";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  listSellerDisputes,
  replySellerDispute,
  type Dispute,
} from "@/features/disputes/api/disputes.api";
import { isApiError } from "@/lib/api/errors";

function Content() {
  const { toast } = useToast();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSellerDisputes();
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

  const onReply = async (id: string) => {
    const reply = (replyDraft[id] || "").trim();
    if (reply.length < 5) return;
    setSaving(id);
    try {
      await replySellerDispute(id, reply);
      toast({ title: "Réponse envoyée", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Impossible",
        variant: "error",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <DashboardShell title="Pro" items={sellerNav}>
      <div className="space-y-6">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Litiges</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Répondez aux réclamations clients concernant vos ventes ou services.
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
            description="Les réclamations liées à vos commandes ou demandes apparaîtront ici."
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
                    Votre réponse : {d.seller_reply}
                  </p>
                ) : null}
                {(d.status === "OPEN" || d.status === "SELLER_REPLIED") && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <textarea
                      value={replyDraft[d.id] ?? d.seller_reply ?? ""}
                      onChange={(e) =>
                        setReplyDraft((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
                      placeholder="Votre réponse au client…"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={saving === d.id}
                      onClick={() => void onReply(d.id)}
                    >
                      Envoyer la réponse
                    </Button>
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

export default function SellerDisputesPage() {
  return (
    <RequireAuth roles={["SELLER"]}>
      <Content />
    </RequireAuth>
  );
}
