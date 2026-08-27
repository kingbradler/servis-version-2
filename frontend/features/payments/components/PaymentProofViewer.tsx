"use client";

import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Payment } from "../types/payment.types";
import {
  downloadProofFile,
  proofFilenameFromUrl,
  resolveProofUrl,
} from "../utils/media";

function pickProofUrl(payment: Payment): string | undefined {
  return (
    resolveProofUrl(payment.proof) ||
    resolveProofUrl(payment.proofs?.[0]?.file_url)
  );
}

export function PaymentProofViewer({ payment }: { payment: Payment }) {
  const proofUrl = pickProofUrl(payment);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proofUrl) {
    return (
      <p className="text-body-sm text-text-muted">Aucune preuve pour le moment.</p>
    );
  }

  const isPdf = proofUrl.toLowerCase().includes(".pdf");
  const proofsCount = payment.proofs?.length ?? 0;

  const onDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadProofFile(
        proofUrl,
        proofFilenameFromUrl(proofUrl, `preuve-${payment.id.slice(0, 8)}`)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Téléchargement impossible"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-text-secondary">
        Envoyée le{" "}
        {payment.proof_uploaded_at
          ? new Date(payment.proof_uploaded_at).toLocaleString("fr-MA")
          : "—"}
      </p>

      {isPdf ? (
        <div className="rounded-xl border border-border bg-surface-secondary p-4">
          <p className="text-body-sm text-text-secondary">
            Preuve au format PDF
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proofUrl}
          alt="Preuve de paiement"
          className="max-h-80 w-full rounded-xl object-contain bg-surface-secondary"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={downloading}
          onClick={() => void onDownload()}
        >
          <Download className="h-4 w-4" />
          Télécharger la preuve
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={proofUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Ouvrir
          </a>
        </Button>
      </div>

      {error && <p className="text-caption text-error">{error}</p>}

      {proofsCount > 1 && (
        <p className="text-caption text-text-muted">
          Historique : {proofsCount} preuve(s)
        </p>
      )}
    </div>
  );
}
