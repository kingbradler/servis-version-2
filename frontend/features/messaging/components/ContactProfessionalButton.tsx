"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { startConversation } from "@/features/messaging/api/messaging.api";
import { isApiError } from "@/lib/api/errors";

export function ContactProfessionalButton({
  professionalSlug,
  professionalName,
  threadBasePath = "/dashboard/messages",
}: {
  professionalSlug: string;
  professionalName: string;
  threadBasePath?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useCurrentUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push(
        `/login?next=${encodeURIComponent(`/professionals/${professionalSlug}`)}`
      );
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      const conversation = await startConversation({
        professional_slug: professionalSlug,
        message: text,
      });
      setOpen(false);
      setMessage("");
      toast({ title: "Message envoyé", variant: "success" });
      router.push(`${threadBasePath}/${conversation.id}`);
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Envoi impossible",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={loading}
        onClick={handleOpen}
      >
        Contacter
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Contacter {professionalName}</ModalTitle>
            <ModalDescription>
              Votre message ouvrira une conversation privée.
            </ModalDescription>
          </ModalHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              required
              placeholder="Bonjour, je souhaiterais…"
              className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" loading={sending}>
                Envoyer
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
