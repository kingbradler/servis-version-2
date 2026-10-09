"use client";

import { Badge } from "@/components/ui/badge";
import type { PaymentMethod } from "../types/payment.types";

const TYPE_LABELS: Record<string, string> = {
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  CASH: "Espèces",
  OTHER: "Autre",
};

export function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary-light/40"
          : "border-border bg-surface hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold text-text-primary">
          {method.label}
        </span>
        <Badge variant="secondary">{TYPE_LABELS[method.type] ?? method.type}</Badge>
      </div>
      <p className="mt-2 text-body-sm text-text-secondary">
        {method.account_name}
        {method.account_number ? ` · ${method.account_number}` : ""}
      </p>
    </button>
  );
}
