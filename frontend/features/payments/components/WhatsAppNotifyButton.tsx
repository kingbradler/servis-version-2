"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function WhatsAppNotifyButton({
  phone,
  message,
  label = "Envoyer sur WhatsApp",
  className,
  variant = "primary",
  size = "md",
}: {
  phone?: string | null;
  message: string;
  label?: string;
  className?: string;
  variant?: "primary" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
}) {
  const href = buildWhatsAppUrl(phone, message);
  if (!href) {
    return (
      <p className="text-body-sm text-text-muted">
        Aucun numéro WhatsApp n&apos;est renseigné pour ce contact.
      </p>
    );
  }

  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
