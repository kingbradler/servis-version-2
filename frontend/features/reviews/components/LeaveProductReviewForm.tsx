"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createProductReview } from "@/features/reviews/api/reviews.api";
import { StarRatingInput } from "@/features/reviews/components/StarRating";
import { isApiError } from "@/lib/api/errors";

export function LeaveProductReviewForm({
  orderItemId,
  productName,
  onSuccess,
}: {
  orderItemId: string;
  productName: string;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createProductReview({
        order_item_id: orderItemId,
        rating,
        comment: comment.trim(),
      });
      setDone(true);
      toast({ title: "Avis publié", variant: "success" });
      onSuccess?.();
    } catch (err) {
      const message = isApiError(err) ? err.message : "Échec de l'envoi";
      setError(message);
      toast({ title: "Erreur", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <p className="text-body-sm text-success">
        Merci — votre avis sur {productName} a été enregistré.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-body-sm font-medium text-text-primary">
          Note pour {productName}
        </p>
        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-body-sm font-medium text-text-primary">
          Commentaire (optionnel)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={saving}
          className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text-primary transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          placeholder="Décrivez votre expérience…"
        />
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <Button type="submit" variant="primary" loading={saving}>
        Publier mon avis
      </Button>
    </form>
  );
}
