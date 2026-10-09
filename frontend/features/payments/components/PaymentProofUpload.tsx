"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { prepareProofFile } from "@/lib/prepare-image-file";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

export function PaymentProofUpload({
  onUpload,
  disabled,
}: {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const ready = await prepareProofFile(file);
      setFileName(ready.name);
      await onUpload(ready);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(
          err,
          "Impossible d'envoyer la preuve. Réessayez."
        )
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-body-sm font-medium text-text-primary">
        Preuve de paiement
      </p>
      <p className="text-caption text-text-muted">
        Choisissez une photo dans votre galerie, ou un PDF.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,image/heic,image/heif,application/pdf"
        disabled={disabled || busy}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={disabled || busy}
        loading={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {busy ? "Envoi…" : "Choisir depuis la galerie"}
      </Button>
      {fileName && !error && (
        <p className="text-caption text-text-secondary">Fichier : {fileName}</p>
      )}
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
