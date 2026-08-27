"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import * as authService from "@/features/auth/services/auth.service";
import { getHomePathForRole } from "@/features/auth/lib/roles";
import { isApiError } from "@/lib/api/errors";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    uid && token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    uid && token
      ? "Confirmation en cours…"
      : "Lien de confirmation manquant ou incomplet."
  );

  useEffect(() => {
    if (!uid || !token) return;
    let cancelled = false;
    void (async () => {
      try {
        const user = await authService.verifyEmail({ uid, token });
        if (cancelled) return;
        setStatus("ok");
        setMessage("Votre e-mail est confirmé. Bienvenue sur SERVIS !");
        await refresh();
        const dest = getHomePathForRole(user.role);
        window.setTimeout(() => {
          router.replace(dest);
          router.refresh();
        }, 1800);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          isApiError(err)
            ? err.message
            : "Lien invalide ou expiré. Demandez un nouvel e-mail."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, token, refresh, router]);

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
          Confirmation e-mail
        </h1>
        {status === "loading" && (
          <div className="mt-6">
            <LoadingState message={message} />
          </div>
        )}
        {status === "ok" && (
          <Alert variant="success" className="mt-6">
            {message}
          </Alert>
        )}
        {status === "error" && (
          <div className="mt-6 space-y-4">
            <Alert variant="error">{message}</Alert>
            <Button asChild variant="primary">
              <Link href="/verify-email/pending">Renvoyer un e-mail</Link>
            </Button>
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <LoadingState message="Chargement…" />
        </MarketplaceShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
