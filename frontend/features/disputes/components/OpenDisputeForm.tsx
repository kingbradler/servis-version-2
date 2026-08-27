"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createDispute,
  type DisputeReason,
  DISPUTE_REASON_LABELS,
} from "@/features/disputes/api/disputes.api";
import { isApiError } from "@/lib/api/errors";

const REASONS = Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[];

export function OpenDisputeForm({
  orderId,
  serviceRequestId,
  onSuccess,
}: {
  orderId?: string;
  serviceRequestId?: string;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState<DisputeReason>("OTHER");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createDispute({
        order_id: orderId,
        service_request_id: serviceRequestId,
        reason,
        description: description.trim(),
      });
      setDone(true);
      toast({ title: "Litige ouvert", variant: "success" });
      onSuccess?.();
    } catch (err) {
      const message = isApiError(err) ? err.message : "Impossible d'ouvrir le litige";
      setError(message);
      toast({ title: "Erreur", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <p className="text-body-sm text-success">
        Litige enregistré. Suivez-le dans « Litiges ».
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-body-sm font-medium">Motif</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as DisputeReason)}
          disabled={saving}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {DISPUTE_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-body-sm font-medium">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          minLength={10}
          maxLength={3000}
          required
          disabled={saving}
          className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body"
          placeholder="Expliquez le problème (min. 10 caractères)…"
        />
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <Button type="submit" variant="outline" loading={saving}>
        Ouvrir un litige
      </Button>
    </form>
  );
}
