"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import type { Order } from "@/features/orders/types/order.types";
import * as ordersService from "@/features/orders/services/orders.service";
import {
  PaymentInstructions,
  PaymentStatusBadge,
} from "@/features/payments/components/PaymentInstructions";
import { PaymentMethodCard } from "@/features/payments/components/PaymentMethodCard";
import { PaymentProofUpload } from "@/features/payments/components/PaymentProofUpload";
import { PaymentProofViewer } from "@/features/payments/components/PaymentProofViewer";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";
import { useOrderPayment } from "@/features/payments/hooks/useOrderPayment";
import { OpenDisputeForm } from "@/features/disputes/components/OpenDisputeForm";
import { formatPrice } from "@/lib/utils";
import { orderPaymentNotifySellerMessage } from "@/lib/whatsapp";

function OrderDetailContent({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const paymentApi = useOrderPayment(orderId);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await ordersService.getMyOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commande introuvable");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void ordersService
      .getMyOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Commande introuvable");
        setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const onCreatePayment = async () => {
    if (!selectedMethod) return;
    try {
      await paymentApi.create(selectedMethod);
      toast({
        title: "Paiement initié",
        description: "Suivez les instructions du vendeur.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible",
        variant: "error",
      });
    }
  };

  const onUpload = async (file: File) => {
    try {
      await paymentApi.uploadProof(file);
      toast({
        title: "Preuve envoyée",
        description: "Le vendeur va vérifier votre paiement.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Upload impossible",
        description: err instanceof Error ? err.message : "Erreur",
        variant: "error",
      });
      throw err;
    }
  };

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard/orders"
          className="text-caption text-primary hover:underline"
        >
          ← Mes commandes
        </Link>

        {loading && <LoadingState message="Chargement de la commande…" />}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}
        {!loading && !error && !order && (
          <EmptyState
            title="Commande introuvable"
            description="Cette commande n'existe pas ou ne vous appartient pas."
          />
        )}

        {!loading && order && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-l font-bold tracking-tight">
                  Commande #{order.id.slice(0, 8)}
                </h2>
                <p className="text-body-sm text-text-secondary">
                  {order.store_name_snapshot || order.store?.name} ·{" "}
                  {new Date(order.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <Badge variant="secondary">{order.status}</Badge>
            </div>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-heading-s font-semibold">Livraison</h3>
              {order.delivery_address ? (
                <dl className="space-y-2 text-body-sm">
                  <div>
                    <dt className="text-caption text-text-muted">Destinataire</dt>
                    <dd className="font-medium">
                      {order.delivery_name}
                      {order.delivery_phone ? ` · ${order.delivery_phone}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-muted">Adresse</dt>
                    <dd>
                      {order.delivery_address}
                      {order.delivery_city ? `, ${order.delivery_city}` : ""}
                    </dd>
                  </div>
                  {order.delivery_notes ? (
                    <div>
                      <dt className="text-caption text-text-muted">Notes</dt>
                      <dd className="text-text-secondary">{order.delivery_notes}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="text-body-sm text-text-muted">
                  Aucune adresse enregistrée pour cette commande.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-heading-s font-semibold">Articles</h3>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 py-3 text-body-sm"
                  >
                    <div>
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      <p className="text-caption text-text-muted">
                        {formatPrice(Number(item.unit_price))} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold">
                      {formatPrice(Number(item.subtotal))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="text-heading-s font-bold">
                  {formatPrice(Number(order.total_amount))}
                </span>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-heading-s font-semibold">Paiement</h3>

              {paymentApi.loading && (
                <LoadingState message="Chargement du paiement…" />
              )}
              {paymentApi.error && (
                <ErrorState
                  message={paymentApi.error}
                  onRetry={() => void paymentApi.refresh()}
                />
              )}

              {!paymentApi.loading && !paymentApi.payment && (
                <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                  <p className="text-body-sm text-text-secondary">
                    Montant :{" "}
                    <strong>
                      {formatPrice(Number(order.total_amount))}
                    </strong>{" "}
                    (calculé par le serveur)
                  </p>
                  <p className="text-body-sm font-medium">Moyen de paiement</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {paymentApi.methods.map((m) => (
                      <PaymentMethodCard
                        key={m.id}
                        method={m}
                        selected={selectedMethod === m.id}
                        onSelect={() => setSelectedMethod(m.id)}
                      />
                    ))}
                  </div>
                  {paymentApi.methods.length === 0 && (
                    <Alert variant="warning" title="Aucun moyen de paiement">
                      Le vendeur n&apos;a pas encore indiqué comment payer
                      (Orange Money, virement…). Ajoutez vos moyens dans{" "}
                      <Link
                        href="/seller/payments/methods"
                        className="font-medium underline"
                      >
                        Moyens de paiement
                      </Link>{" "}
                      si c&apos;est votre boutique, ou contactez le vendeur.
                    </Alert>
                  )}
                  <Button
                    variant="primary"
                    disabled={!selectedMethod}
                    onClick={() => void onCreatePayment()}
                  >
                    J&apos;ai choisi mon moyen de paiement
                  </Button>
                </div>
              )}

              {paymentApi.payment && (
                <div className="space-y-4">
                  <PaymentInstructions payment={paymentApi.payment} />
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm text-text-secondary">
                      Statut :
                    </span>
                    <PaymentStatusBadge status={paymentApi.payment.status} />
                  </div>

                  {paymentApi.payment.status === "REJECTED" && (
                    <Alert variant="error" title="Votre preuve a été rejetée">
                      {paymentApi.payment.seller_rejection_reason ||
                        "Vous pouvez envoyer une nouvelle preuve."}
                    </Alert>
                  )}

                  {(paymentApi.payment.status === "PENDING" ||
                    paymentApi.payment.status === "REJECTED") && (
                    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                      <p className="text-body-sm font-medium">
                        Envoyer ma preuve
                      </p>
                      <PaymentProofUpload onUpload={onUpload} />
                    </div>
                  )}

                  {paymentApi.payment.proof && (
                    <PaymentProofViewer payment={paymentApi.payment} />
                  )}

                  {(paymentApi.payment.status === "PROOF_SUBMITTED" ||
                    paymentApi.payment.status === "CONFIRMED" ||
                    Boolean(paymentApi.payment.proof)) && (
                    <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                      <p className="text-body-sm font-medium">
                        Prévenir le vendeur sur WhatsApp
                      </p>
                      <p className="text-caption text-text-secondary">
                        Même si vous ne lui avez jamais écrit : un message
                        prérempli l&apos;informe que vous avez payé.
                      </p>
                      <WhatsAppNotifyButton
                        phone={
                          order.store?.whatsapp || order.store?.phone || null
                        }
                        message={orderPaymentNotifySellerMessage({
                          orderId: order.id,
                          storeName:
                            order.store_name_snapshot ||
                            order.store?.name ||
                            "boutique",
                          amountLabel: formatPrice(Number(order.total_amount)),
                        })}
                        label="Informer le vendeur sur WhatsApp"
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            {order.status === "COMPLETED" && (
              <section className="rounded-xl border border-border bg-surface p-4">
                <p className="text-body-sm text-text-secondary">
                  Commande terminée — vous pouvez noter les produits achetés.
                </p>
                <Button asChild variant="primary" className="mt-3">
                  <Link href="/dashboard/reviews">Laisser un avis</Link>
                </Button>
              </section>
            )}

            {(order.status === "CONFIRMED" ||
              order.status === "PROCESSING" ||
              order.status === "READY" ||
              order.status === "COMPLETED") && (
              <section className="rounded-xl border border-border bg-surface p-4">
                <h3 className="mb-2 text-heading-s font-semibold">Litige</h3>
                <p className="mb-3 text-body-sm text-text-muted">
                  Un problème avec cette commande ? Décrivez-le ici — le vendeur
                  et SERVIS pourront intervenir.
                </p>
                <OpenDisputeForm orderId={order.id} />
                <Link
                  href="/dashboard/disputes"
                  className="mt-2 inline-block text-caption text-primary hover:underline"
                >
                  Voir mes litiges
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      {orderId ? (
        <OrderDetailContent orderId={orderId} />
      ) : (
        <LoadingState />
      )}
    </RequireAuth>
  );
}
