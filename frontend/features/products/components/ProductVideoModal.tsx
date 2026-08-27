"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { resolveProductVideoEmbed } from "@/lib/social-embed";

export function ProductVideoModal({
  open,
  onOpenChange,
  videoUrl,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  productName: string;
}) {
  const embed = resolveProductVideoEmbed(videoUrl);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg" className="max-w-lg overflow-hidden p-0 sm:max-w-xl">
        <ModalHeader className="border-b border-cr2 px-5 py-4 dark:border-border">
          <ModalTitle className="font-display text-[18px] font-extrabold">
            Vidéo produit
          </ModalTitle>
          <ModalDescription className="line-clamp-1">
            {productName}
          </ModalDescription>
        </ModalHeader>
        <div className="bg-dk">
          {embed?.embedSrc ? (
            <iframe
              title={`Vidéo — ${productName}`}
              src={embed.embedSrc}
              className="aspect-[9/16] max-h-[70vh] w-full border-0"
              allow="encrypted-media; clipboard-write; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <p className="text-body-sm text-white/70">
                Aperçu intégré indisponible pour ce lien. Ouvrez la vidéo sur le
                réseau social.
              </p>
              {embed && (
                <Button asChild variant="primary" className="rounded-xl">
                  <a href={embed.href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {embed.label}
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        {embed?.embedSrc && (
          <div className="flex justify-end border-t border-cr2 px-4 py-3 dark:border-border">
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <a href={embed.href} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {embed.label}
              </a>
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
