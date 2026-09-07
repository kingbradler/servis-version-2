"use client";

import Link from "next/link";
import { useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import * as authService from "@/features/auth/services/auth.service";
import { isApiError } from "@/lib/api/errors";

export default function VerifyEmailPendingPage() {
  const { user, isAuthenticated } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      const payloadEmail = isAuthenticated ? undefined : email.trim();
      if (!isAuthenticated && !payloadEmail) {
        setError("Indiquez votre adresse e-mail.");
        return;
      }
      const res = await authService.resendVerification(payloadEmail);
      setInfo(res.detail);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketplaceShell>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-12">
        <ServisLogo
          variant="lockup"
          href="/"
          className="mb-6"
          markClassName="h-10 w-auto"
        />
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Vérifiez votre e-mail
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Nous avons envoyé un lien de confirmation
          {user?.email ? (
            <>
              {" "}
              à <strong>{user.email}</strong>
            </>
          ) : (
            " à votre adresse"
          )}
          . Ouvrez-le pour activer votre compte.
        </p>
        <p className="mt-2 text-body-sm text-text-muted">
          Rien dans la boîte de réception ? Regardez aussi les spams. Le lien
          reste valable quelques jours.
        </p>

        <div className="mt-8 space-y-4 rounded-none border border-border bg-surface p-5">
          <p className="text-body-sm font-medium">Vous n&apos;avez rien reçu ?</p>
          {!isAuthenticated && (
            <Input
              type="email"
              label="E-mail du compte"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          )}
          {info && <Alert variant="success">{info}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}
          <Button
            type="button"
            variant="primary"
            loading={sending}
            onClick={() => void handleResend()}
            className="rounded-none uppercase tracking-wide"
          >
            Renvoyer l&apos;e-mail
          </Button>
        </div>

        <p className="mt-6 text-body-sm text-text-secondary">
          Déjà confirmé ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}
