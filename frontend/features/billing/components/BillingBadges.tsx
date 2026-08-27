import { Badge } from "@/components/ui/badge";

import type { SubscriptionPaymentStatus, SubscriptionStatus } from "../types/billing.types";

const SUB_VARIANTS: Record<
  SubscriptionStatus,
  "secondary" | "success" | "warning" | "error"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  EXPIRED: "secondary",
  REJECTED: "error",
  CANCELLED: "secondary",
};

const SUB_LABELS: Record<SubscriptionStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  REJECTED: "Refusé",
  CANCELLED: "Annulé",
};

const PAY_VARIANTS: Record<
  SubscriptionPaymentStatus,
  "secondary" | "success" | "warning" | "error"
> = {
  PENDING: "warning",
  PROOF_SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const PAY_LABELS: Record<SubscriptionPaymentStatus, string> = {
  PENDING: "Paiement en attente",
  PROOF_SUBMITTED: "Preuve envoyée",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus | string;
}) {
  const key = status as SubscriptionStatus;
  return (
    <Badge variant={SUB_VARIANTS[key] ?? "secondary"}>
      {SUB_LABELS[key] ?? status}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
}: {
  status: SubscriptionPaymentStatus | string;
}) {
  const key = status as SubscriptionPaymentStatus;
  return (
    <Badge variant={PAY_VARIANTS[key] ?? "secondary"}>
      {PAY_LABELS[key] ?? status}
    </Badge>
  );
}

export function productQuotaLabel(
  active: number,
  limit: number | null | undefined
): string {
  if (limit == null) return `${active} / ∞`;
  return `${active} / ${limit}`;
}
