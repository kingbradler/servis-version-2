"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Phone } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import { OpenDisputeForm } from "@/features/disputes/components/OpenDisputeForm";
import {
  PaymentInstructions,
  PaymentStatusBadge,
} from "@/features/payments/components/PaymentInstructions";
import { PaymentMethodCard } from "@/features/payments/components/PaymentMethodCard";
import { PaymentProofUpload } from "@/features/payments/components/PaymentProofUpload";
import { PaymentProofViewer } from "@/features/payments/components/PaymentProofViewer";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";
import { useServiceRequestPayment } from "@/features/payments/hooks/useServiceRequestPayment";
import {
  cancelServiceRequest,
  getMyServiceRequest,
} from "@/features/pro-services/api/service-requests.api";
import type { ServiceRequest } from "@/features/pro-services/types/service-request.types";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_VARIANTS,
} from "@/features/pro-services/types/service-request.types";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";
import { serviceRequestPaymentNotifySellerMessage } from "@/lib/whatsapp";

function hasFixedPrice(request: ServiceRequest): boolean {
  const { price, price_type } = request.service;
  if (price_type === "QUOTE") return false;
  return price != null && String(price).trim() !== "";
}

function Content() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const payable =
    !!request &&
    hasFixedPrice(request) &&
    (request.status === "ACCEPTED" || request.status === "COMPLETED");
  const canCreatePayment =
    !!request && hasFixedPrice(request) && request.status === "ACCEPTED";
  const paymentApi = useServiceRequestPayment(id, payable);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequest(await getMyServiceRequest(id));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void getMyServiceRequest(id)
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

  const handleCancel = async () => {
    if (!window.confirm("Annuler cette demande ?")) return;
    setCancelling(true);
    try {
      const updated = await cancelServiceRequest(id);
      setRequest(updated);
      toast({ title: "Demande annulée", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de l'annulation",
        variant: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const onCreatePayment = async () => {
    if (!selectedMethod) return;
    try {
      await paymentApi.create(selectedMethod);
      toast({
        title: "Paiement initié",
        description: "Suivez les instructions du professionnel.",
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
        description: "Le professionnel va vérifier votre paiement.",
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

  const proPhone = request?.professional.phone?.trim() ?? "";
  const waDigits = request?.professional.whatsapp?.replace(/\D/g, "") ?? "";
  const amountLabel = request?.service.price
    ? formatPrice(Number(request.service.price))
    : "";

  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/service-requests">← Retour</Link>
          </Button>
        </div>

        {loading && <Skeleton className="h-48 w-full rounded-xl" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}

        {!loading && request && (
          <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-l font-bold tracking-tight">
                  {request.service.name}
                </h2>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {request.professional.display_name}
                </p>
              </div>
              <Badge
                variant={SERVICE_REQUEST_STATUS_VARIANTS[request.status]}
              >
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
                <dt className="text-text-muted">Téléphone</dt>
                <dd>{request.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-muted">Message</dt>
                <dd className="whitespace-pre-wrap">{request.message}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Créée le</dt>
                <dd>
                  {new Date(request.created_at).toLocaleString("fr-FR")}
                </dd>
              </div>
            </dl>

            <section className="space-y-4 border-t border-border pt-4">
              <h3 className="text-heading-s font-semibold">Paiement</h3>

              {!hasFixedPrice(request) && (
                <p className="text-body-sm text-text-muted">
                  Ce service est sur devis : le paiement se convient directement
                  avec le professionnel.
                </p>
              )}

              {hasFixedPrice(request) && request.status === "PENDING" && (
                <p className="text-body-sm text-text-muted">
                  Le paiement ({amountLabel}) sera disponible une fois la
                  demande acceptée.
                </p>
              )}

              {hasFixedPrice(request) &&
                (request.status === "REJECTED" ||
                  request.status === "CANCELLED") && (
                  <p className="text-body-sm text-text-muted">
                    Aucun paiement n&apos;est demandé pour cette demande.
                  </p>
                )}

              {payable && (
                <>
                  {paymentApi.loading && (
                    <LoadingState message="Chargement du paiement…" />
                  )}
                  {paymentApi.error && (
                    <ErrorState
                      message={paymentApi.error}
                      onRetry={() => void paymentApi.refresh()}
                    />
                  )}

                  {!paymentApi.loading &&
                    !paymentApi.payment &&
                    canCreatePayment && (
                      <div className="space-y-4">
                        <p className="text-body-sm text-text-secondary">
                          Montant : <strong>{amountLabel}</strong>
                        </p>
                        <p className="text-body-sm font-medium">
                          Moyen de paiement
                        </p>
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
                          <Alert variant="warning" title="Aucun moyen disponible">
                            Ce professionnel n&apos;a pas encore configuré de
                            moyen de paiement (via sa boutique).
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

                  {!paymentApi.loading &&
                    !paymentApi.payment &&
                    !canCreatePayment && (
                      <p className="text-body-sm text-text-muted">
                        Aucun paiement n&apos;a été initié pour cette demande.
                      </p>
                    )}

                  {paymentApi.payment && (
                    <div className="space-y-4">
                      <PaymentInstructions payment={paymentApi.payment} />
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm text-text-secondary">
                          Statut :
                        </span>
                        <PaymentStatusBadge
                          status={paymentApi.payment.status}
                        />
                      </div>

                      {paymentApi.payment.status === "REJECTED" && (
                        <Alert variant="error" title="Votre preuve a été rejetée">
                          {paymentApi.payment.seller_rejection_reason ||
                            "Vous pouvez envoyer une nouvelle preuve."}
                        </Alert>
                      )}

                      {(paymentApi.payment.status === "PENDING" ||
                        paymentApi.payment.status === "REJECTED") &&
                        canCreatePayment && (
                          <div className="space-y-3">
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
                        <div className="space-y-2">
                          <p className="text-body-sm font-medium">
                            Prévenir le professionnel sur WhatsApp
                          </p>
                          <WhatsAppNotifyButton
                            phone={
                              request.professional.whatsapp ||
                              request.professional.phone ||
                              null
                            }
                            message={serviceRequestPaymentNotifySellerMessage({
                              requestId: request.id,
                              serviceName: request.service.name,
                              amountLabel: formatPrice(
                                Number(paymentApi.payment.amount)
                              ),
                            })}
                            label="Informer sur WhatsApp"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {(proPhone || waDigits) && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-body-sm font-medium">
                  Contacter le professionnel
                </p>
                <div className="flex flex-wrap gap-2">
                  {proPhone && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`tel:${proPhone}`}>
                        <Phone className="h-4 w-4" />
                        {proPhone}
                      </a>
                    </Button>
                  )}
                  {waDigits && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {request.status === "COMPLETED" && (
              <Button asChild variant="primary">
                <Link href="/dashboard/reviews">Laisser un avis</Link>
              </Button>
            )}

            {(request.status === "ACCEPTED" ||
              request.status === "COMPLETED") && (
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-heading-s font-semibold">Litige</h3>
                <p className="text-body-sm text-text-muted">
                  Un problème avec cette prestation ? Ouvrez un litige.
                </p>
                <OpenDisputeForm serviceRequestId={request.id} />
                <Link
                  href="/dashboard/disputes"
                  className="inline-block text-caption text-primary hover:underline"
                >
                  Voir mes litiges
                </Link>
              </div>
            )}

            {request.status === "PENDING" && (
              <Button
                variant="outline"
                loading={cancelling}
                onClick={() => void handleCancel()}
              >
                Annuler la demande
              </Button>
            )}

            {request.status !== "PENDING" && (
              <Button variant="outline" onClick={() => router.push("/services")}>
                Voir d&apos;autres services
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ClientServiceRequestDetailPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
