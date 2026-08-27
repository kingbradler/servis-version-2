"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/features/billing/components/BillingBadges";
import * as billingService from "@/features/billing/services/billing.service";
import type { SubscriptionPayment } from "@/features/billing/types/billing.types";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";
import { isApiError } from "@/lib/api/errors";
import { formatPrice, unwrapList } from "@/lib/utils";
import { subscriptionPaymentConfirmedMessage } from "@/lib/whatsapp";

export default function AdminSubscriptionsPage() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PROOF_SUBMITTED");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [lastApproved, setLastApproved] = useState<SubscriptionPayment | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.getAdminSubscriptionPayments({
        status: filter || undefined,
      });
      setPayments(unwrapList(data));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await billingService.getAdminSubscriptionPayments({
          status: filter || undefined,
        });
        if (!cancelled) setPayments(unwrapList(data));
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function approve(id: string) {
    const current = payments.find((p) => p.id === id) ?? null;
    setBusyId(id);
    try {
      await billingService.approveSubscriptionPayment(id);
      if (current) {
        setLastApproved({ ...current, status: "APPROVED" });
      }
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Échec approbation");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = rejectReason[id]?.trim();
    if (!reason) {
      setError("Motif de refus requis");
      return;
    }
    setBusyId(id);
    try {
      await billingService.rejectSubscriptionPayment(id, reason);
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Échec refus");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">
          Abonnements — paiements
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Validation manuelle des preuves (montants issus du plan backend).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          "PROOF_SUBMITTED",
          "PENDING",
          "APPROVED",
          "REJECTED",
          "",
        ].map((s) => (
          <Button
            key={s || "all"}
            size="sm"
            variant={filter === s ? "primary" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s || "Tous"}
          </Button>
        ))}
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/platform-payments">Moyens SERVIS</Link>
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
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && payments.length === 0 && (
        <EmptyState title="Aucun paiement" />
      )}

      {lastApproved && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="font-medium">Paiement approuvé</p>
            <p className="text-body-sm text-text-secondary">
              {lastApproved.owner_email ?? "Professionnel"} —{" "}
              {lastApproved.plan_name ?? lastApproved.plan_code}
            </p>
            <WhatsAppNotifyButton
              phone={lastApproved.owner_phone}
              message={subscriptionPaymentConfirmedMessage({
                planName:
                  lastApproved.plan_name ??
                  lastApproved.plan_code ??
                  "abonnement",
              })}
              label="Envoyer la confirmation WhatsApp"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLastApproved(null)}
            >
              Fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {p.owner_email ?? "Professionnel"} —{" "}
                      {p.plan_name ?? p.plan_code}
                    </p>
                    <p className="text-body-sm text-text-secondary">
                      {formatPrice(Number(p.amount))} · {p.payment_method?.name} ·{" "}
                      {p.reference || "sans réf."}
                    </p>
                  </div>
                  <PaymentStatusBadge status={p.status} />
                </div>
                {p.proof_url && (
                  <a
                    href={p.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body-sm text-primary underline"
                  >
                    Voir la preuve
                  </a>
                )}
                {(p.status === "PROOF_SUBMITTED" || p.status === "PENDING") && (
                  <div className="flex flex-wrap items-end gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === p.id}
                      onClick={() => void approve(p.id)}
                    >
                      Approuver
                    </Button>
                    <input
                      className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-body-sm"
                      placeholder="Motif de refus"
                      value={rejectReason[p.id] ?? ""}
                      onChange={(e) =>
                        setRejectReason((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id}
                      onClick={() => void reject(p.id)}
                    >
                      Refuser
                    </Button>
                  </div>
                )}
                {p.rejection_reason && (
                  <p className="text-body-sm text-error">{p.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
