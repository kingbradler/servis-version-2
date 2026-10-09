"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as ordersService from "@/features/orders/services/orders.service";
import type { Order, OrderStatus } from "@/features/orders/types/order.types";
import { PaymentProofViewer } from "@/features/payments/components/PaymentProofViewer";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentInstructions";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";
import { useSellerOrderPayment } from "@/features/payments/hooks/useSellerOrderPayment";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";
import { orderPaymentConfirmedMessage } from "@/lib/whatsapp";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PROCESSING: "En traitement",
  READY: "Prête",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export default function SellerOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    payment,
    loading: paymentLoading,
    confirm,
    reject,
  } = useSellerOrderPayment(orderId);

  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [etaHint, setEtaHint] = useState("");
  const [completing, setCompleting] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersService.getSellerOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void ordersService
      .getSellerOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
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
  }, [orderId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirm();
      setJustConfirmed(true);
      toast({ title: "Paiement confirmé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la confirmation",
        variant: "error",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const updated = await ordersService.completeSellerOrder(orderId);
      setOrder(updated);
      toast({ title: "Commande marquée comme livrée", variant: "success" });
    } catch (err) {
      toast({
        title: "Impossible de terminer",
        description: isApiError(err)
          ? err.message
          : "Confirmez d’abord le paiement.",
        variant: "error",
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await reject(rejectReason.trim());
      toast({ title: "Preuve rejetée", variant: "success" });
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec du rejet",
        variant: "error",
      });
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <ErrorState message={error ?? "Commande introuvable"} onRetry={() => void loadOrder()} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">
            Commande #{order.id.slice(0, 8)}
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {new Date(order.created_at).toLocaleString("fr-FR")}
          </p>
        </div>
        <Badge variant="secondary">{STATUS_LABELS[order.status]}</Badge>
      </div>

      {(order.status === "CONFIRMED" ||
        order.status === "PROCESSING" ||
        order.status === "READY") && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-text-secondary">
              Quand le client a reçu le produit, marquez la commande comme
              livrée. Il pourra aussi laisser un avis dès le paiement confirmé.
            </p>
            <Button
              variant="primary"
              loading={completing}
              onClick={() => void handleComplete()}
            >
              Marquer comme livrée
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-body-sm font-medium">
                  {item.product_name_snapshot}
                </p>
                <p className="text-caption text-text-muted">
                  {item.quantity} × {formatPrice(Number(item.unit_price))}
                </p>
              </div>
              <p className="text-body-sm font-semibold">
                {formatPrice(Number(item.subtotal))}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <p className="text-body font-semibold">Total</p>
            <p className="text-body font-bold">
              {formatPrice(Number(order.total_amount))}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Livraison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-body-sm">
          {order.delivery_address ? (
            <>
              <p>
                <span className="text-text-muted">Destinataire · </span>
                <span className="font-medium">
                  {order.delivery_name}
                  {order.delivery_phone ? ` · ${order.delivery_phone}` : ""}
                </span>
              </p>
              <p>
                <span className="text-text-muted">Adresse · </span>
                {order.delivery_address}
                {order.delivery_city ? `, ${order.delivery_city}` : ""}
              </p>
              {order.delivery_notes ? (
                <p>
                  <span className="text-text-muted">Notes · </span>
                  {order.delivery_notes}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-text-secondary">
              Pas d&apos;adresse sur cette commande
              {order.client?.phone
                ? ` — contact compte : ${order.client.phone}`
                : "."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentLoading && <Skeleton className="h-32 w-full rounded-xl" />}

          {!paymentLoading && !payment && (
            <p className="text-body-sm text-text-secondary">
              Le client n&apos;a pas encore initié de paiement.
            </p>
          )}

          {!paymentLoading && payment && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-text-secondary">
                  Statut du paiement
                </p>
                <PaymentStatusBadge status={payment.status} />
              </div>

              <PaymentProofViewer payment={payment} />

              {payment.status === "PROOF_SUBMITTED" && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="primary"
                    loading={confirming}
                    onClick={() => void handleConfirm()}
                  >
                    Confirmer le paiement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRejectOpen(true)}
                  >
                    Rejeter la preuve
                  </Button>
                </div>
              )}

              {(justConfirmed || payment.status === "CONFIRMED") && (
                <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <p className="text-body-sm font-medium">
                    Confirmer au client sur WhatsApp
                  </p>
                  <p className="text-caption text-text-secondary">
                    Indiquez le délai d&apos;arrivée ou de disponibilité, puis
                    envoyez le message prérempli.
                  </p>
                  <Input
                    label="Délai (optionnel)"
                    value={etaHint}
                    onChange={(e) => setEtaHint(e.target.value)}
                    placeholder="Ex. : livraison sous 24–48 h, retrait demain…"
                  />
                  <WhatsAppNotifyButton
                    phone={order.delivery_phone || order.client?.phone}
                    message={orderPaymentConfirmedMessage({
                      orderId: order.id,
                      storeName:
                        order.store_name_snapshot ||
                        order.store?.name ||
                        "notre boutique",
                      amountLabel: formatPrice(Number(order.total_amount)),
                      etaHint: etaHint || undefined,
                    })}
                    label="Envoyer la confirmation WhatsApp"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={() => router.push("/seller/orders")}>
        Retour aux commandes
      </Button>

      <Modal open={rejectOpen} onOpenChange={setRejectOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Rejeter la preuve de paiement</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            <Input
              label="Motif du rejet"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex : preuve illisible, montant incorrect…"
            />
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={rejecting}
                disabled={!rejectReason.trim()}
                onClick={() => void handleReject()}
              >
                Confirmer le rejet
              </Button>
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
