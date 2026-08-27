"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PaymentProofViewer } from "@/features/payments/components/PaymentProofViewer";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentInstructions";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";
import { useSellerServiceRequestPayment } from "@/features/payments/hooks/useSellerServiceRequestPayment";
import {
  acceptServiceRequest,
  completeServiceRequest,
  getSellerServiceRequest,
  rejectServiceRequest,
} from "@/features/pro-services/api/service-requests.api";
import type { ServiceRequest } from "@/features/pro-services/types/service-request.types";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_VARIANTS,
} from "@/features/pro-services/types/service-request.types";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";
import { serviceRequestPaymentConfirmedMessage } from "@/lib/whatsapp";

type ActionKind = "accept" | "reject" | "complete" | null;

function hasFixedPrice(request: ServiceRequest): boolean {
  const { price, price_type } = request.service;
  if (price_type === "QUOTE") return false;
  return price != null && String(price).trim() !== "";
}

export default function SellerServiceRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [busy, setBusy] = useState(false);

  const showPayment =
    !!request &&
    hasFixedPrice(request) &&
    (request.status === "ACCEPTED" || request.status === "COMPLETED");

  const {
    payment,
    loading: paymentLoading,
    error: paymentError,
    confirm,
    reject,
  } = useSellerServiceRequestPayment(id, showPayment);

  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [etaHint, setEtaHint] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequest(await getSellerServiceRequest(id));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void getSellerServiceRequest(id)
      .then((data) => {
        if (!cancelled) {
          setRequest(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
        setRequest(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      let updated: ServiceRequest;
      if (action === "accept") updated = await acceptServiceRequest(id);
      else if (action === "reject") updated = await rejectServiceRequest(id);
      else updated = await completeServiceRequest(id);
      setRequest(updated);
      setAction(null);
      toast({
        title:
          action === "accept"
            ? "Demande acceptée"
            : action === "reject"
              ? "Demande refusée"
              : "Demande terminée",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Action impossible",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirm();
      setJustConfirmed(true);
      toast({ title: "Paiement confirmé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible",
        variant: "error",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await reject(rejectReason.trim());
      setRejectOpen(false);
      setRejectReason("");
      toast({ title: "Preuve rejetée", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible",
        variant: "error",
      });
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (!request) return null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/seller/service-requests">← Retour</Link>
      </Button>

      <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-heading-l font-bold tracking-tight">
              {request.service.name}
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              {request.client.first_name} {request.client.last_name} ·{" "}
              {request.client.email}
            </p>
          </div>
          <Badge variant={SERVICE_REQUEST_STATUS_VARIANTS[request.status]}>
            {SERVICE_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </div>

        <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Date souhaitée</dt>
            <dd>{request.requested_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Heure souhaitée</dt>
            <dd>
              {request.requested_time
                ? String(request.requested_time).slice(0, 5)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Adresse</dt>
            <dd>{request.address}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Téléphone client</dt>
            <dd>
              <a className="text-primary underline" href={`tel:${request.phone}`}>
                {request.phone}
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Message</dt>
            <dd className="whitespace-pre-wrap">{request.message}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Créée le</dt>
            <dd>{new Date(request.created_at).toLocaleString("fr-FR")}</dd>
          </div>
        </dl>

        {request.status === "PENDING" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setAction("accept")}>
              Accepter
            </Button>
            <Button variant="outline" onClick={() => setAction("reject")}>
              Refuser
            </Button>
          </div>
        )}

        {request.status === "ACCEPTED" && (
          <Button variant="primary" onClick={() => setAction("complete")}>
            Marquer comme terminé
          </Button>
        )}
      </div>

      {showPayment && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h3 className="text-heading-s font-semibold">Paiement</h3>

          {paymentLoading && <Skeleton className="h-24 w-full rounded-xl" />}

          {paymentError && (
            <ErrorState message={paymentError} onRetry={() => void load()} />
          )}

          {!paymentLoading && !payment && (
            <p className="text-body-sm text-text-secondary">
              Le client n&apos;a pas encore initié de paiement
              {request.service.price
                ? ` (${formatPrice(Number(request.service.price))})`
                : ""}
              .
            </p>
          )}

          {!paymentLoading && payment && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-text-secondary">
                  Montant · {formatPrice(Number(payment.amount))}
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
                  <Button variant="outline" onClick={() => setRejectOpen(true)}>
                    Rejeter la preuve
                  </Button>
                </div>
              )}

              {(justConfirmed || payment.status === "CONFIRMED") && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-body-sm font-medium">
                    Confirmer au client sur WhatsApp
                  </p>
                  <Input
                    label="Suite (optionnel)"
                    value={etaHint}
                    onChange={(e) => setEtaHint(e.target.value)}
                    placeholder="Ex. : intervention demain 10 h…"
                  />
                  <WhatsAppNotifyButton
                    phone={request.phone}
                    message={serviceRequestPaymentConfirmedMessage({
                      requestId: request.id,
                      serviceName: request.service.name,
                      amountLabel: formatPrice(Number(payment.amount)),
                      etaHint: etaHint || undefined,
                    })}
                    label="Envoyer la confirmation WhatsApp"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!hasFixedPrice(request) &&
        (request.status === "ACCEPTED" || request.status === "COMPLETED") && (
          <p className="text-body-sm text-text-muted">
            Service sur devis : pas de paiement en ligne sur SERVIS.
          </p>
        )}

      <Modal open={action !== null} onOpenChange={(v) => !v && setAction(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {action === "accept"
                ? "Accepter cette demande ?"
                : action === "reject"
                  ? "Refuser cette demande ?"
                  : "Marquer comme terminée ?"}
            </ModalTitle>
            <ModalDescription>
              {action === "accept"
                ? "Le client sera informé que vous acceptez l'intervention."
                : action === "reject"
                  ? "Cette action est définitive."
                  : "Confirmez que le service a bien été réalisé."}
            </ModalDescription>
          </ModalHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void runAction()}
            >
              Confirmer
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Annuler
            </Button>
          </div>
        </ModalContent>
      </Modal>

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
              placeholder="Ex. : preuve illisible, montant incorrect…"
            />
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={rejecting}
                disabled={!rejectReason.trim()}
                onClick={() => void handleReject()}
              >
                Rejeter
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
