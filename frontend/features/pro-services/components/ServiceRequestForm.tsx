"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { isApiError } from "@/lib/api/errors";

import { createServiceRequest } from "../api/service-requests.api";
import type { ServiceRequest } from "../types/service-request.types";

type Props = {
  serviceId: string;
  serviceName: string;
  className?: string;
};

export function ServiceRequestForm({
  serviceId,
  serviceName,
  className,
}: Props) {
  const { isAuthenticated, loading: authLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ServiceRequest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const resetForm = () => {
    setMessage("");
    setRequestedDate("");
    setRequestedTime("");
    setAddress("");
    setPhone("");
    setFormError(null);
  };

  const handleOpen = () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setCreated(null);
    resetForm();
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await createServiceRequest({
        service: serviceId,
        message: message.trim(),
        requested_date: requestedDate || null,
        requested_time: requestedTime || null,
        address: address.trim(),
        phone: phone.trim(),
      });
      setCreated(result);
      toast({
        title: "Demande envoyée",
        description: "Votre demande a été envoyée au professionnel.",
        variant: "success",
      });
    } catch (err) {
      setFormError(
        isApiError(err) ? err.message : "Impossible d'envoyer la demande."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const waDigits = created?.professional.whatsapp?.replace(/\D/g, "") ?? "";
  const proPhone = created?.professional.phone?.trim() ?? "";

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className={className}
        loading={authLoading}
        onClick={handleOpen}
      >
        Demander ce service
      </Button>

      <Modal open={loginOpen} onOpenChange={setLoginOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Connexion requise</ModalTitle>
            <ModalDescription>
              Connectez-vous pour demander ce service. Vous reviendrez ensuite
              sur cette page.
            </ModalDescription>
          </ModalHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() =>
                router.push(
                  `/login?next=${encodeURIComponent(pathname || "/")}`
                )
              }
            >
              Se connecter
            </Button>
            <Button variant="outline" onClick={() => setLoginOpen(false)}>
              Annuler
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setCreated(null);
        }}
      >
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>
              {created ? "Demande envoyée" : "Demander ce service"}
            </ModalTitle>
            <ModalDescription>
              {created
                ? "Votre demande a été envoyée au professionnel."
                : serviceName}
            </ModalDescription>
          </ModalHeader>

          {created ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-surface-secondary/60 p-3 text-body-sm text-text-secondary">
                Aucun paiement n&apos;est demandé à cette étape.
              </p>
              {(proPhone || waDigits) && (
                <div className="space-y-2">
                  <p className="text-body-sm font-medium">
                    Contacter le professionnel
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {proPhone && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`tel:${proPhone}`}>{proPhone}</a>
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
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/dashboard/service-requests/${created.id}`);
                  }}
                >
                  Voir ma demande
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <p className="rounded-lg bg-surface-secondary/60 p-3 text-body-sm text-text-secondary">
                Aucun paiement n&apos;est demandé à cette étape.
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sr-message"
                  className="text-body-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id="sr-message"
                  required
                  minLength={5}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body"
                  placeholder="Décrivez votre besoin…"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Date souhaitée"
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                />
                <Input
                  label="Heure souhaitée"
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                />
              </div>

              <Input
                label="Adresse"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse d'intervention"
              />
              <Input
                label="Téléphone"
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212…"
              />

              {formError && (
                <p className="text-body-sm text-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  disabled={submitting}
                >
                  Envoyer la demande
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
