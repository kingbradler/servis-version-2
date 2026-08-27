"use client";

import { Badge } from "@/components/ui/badge";
import type { Payment, PaymentStatus } from "../types/payment.types";

const LABELS: Record<PaymentStatus, string> = {
  PENDING: "En attente de paiement",
  PROOF_SUBMITTED: "Preuve envoyée",
  CONFIRMED: "Payé / confirmé",
  REJECTED: "Preuve rejetée",
  CANCELLED: "Annulé",
};

const VARIANTS: Record<
  PaymentStatus,
  "warning" | "secondary" | "success" | "error" | "default"
> = {
  PENDING: "warning",
  PROOF_SUBMITTED: "secondary",
  CONFIRMED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}

export function PaymentInstructions({ payment }: { payment: Payment }) {
  const m = payment.payment_method;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-semibold">{m.label}</h3>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <p className="text-body-sm text-text-secondary">
        Montant à payer :{" "}
        <strong className="text-text-primary">
          {payment.amount} {payment.currency}
        </strong>
      </p>
      <p className="text-body-sm text-text-secondary">
        Bénéficiaire : {m.account_name}
      </p>
      {m.account_number && (
        <p className="text-body-sm text-text-secondary">
          Compte / numéro : {m.account_number}
        </p>
      )}
      {m.instructions && (
        <p className="text-body-sm whitespace-pre-wrap text-text-primary">
          {m.instructions}
        </p>
      )}
      {payment.status === "REJECTED" && payment.seller_rejection_reason && (
        <p className="text-body-sm text-error">
          Motif du rejet : {payment.seller_rejection_reason}
        </p>
      )}
    </div>
  );
}
