"use client";

import { useState } from "react";

import { FormMessage } from "@/components/ui/form-message";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

export function PaymentProofUpload({
  onUpload,
  disabled,
}: {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <label className="block text-body-sm font-medium text-text-primary">
        Envoyer ma preuve (JPEG, PNG, WebP ou PDF)
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={disabled || busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            await onUpload(file);
          } catch (err) {
            setError(
              getUserFacingErrorMessage(
                err,
                "Impossible d'envoyer la preuve. Réessayez."
              )
            );
          } finally {
            setBusy(false);
          }
        }}
        className="block w-full text-body-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
      />
      {error && (
        <FormMessage
          variant="error"
          title="Envoi impossible"
          message={error}
        />
      )}
    </div>
  );
}
