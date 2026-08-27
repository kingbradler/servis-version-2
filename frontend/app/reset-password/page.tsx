"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getHomePathForRole } from "@/features/auth/lib/roles";
import * as authService from "@/features/auth/services/auth.service";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useCurrentUser();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const linkMissing = !uid || !token;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalError(null);

    if (password !== passwordConfirm) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const user = await authService.confirmPasswordReset({
        uid,
        token,
        password,
        password_confirm: passwordConfirm,
      });
      await refresh();
      router.replace(getHomePathForRole(user.role));
      router.refresh();
    } catch (err) {
      setError(
        getUserFacingErrorMessage(
          err,
          "Lien invalide ou expiré. Demandez un nouveau lien."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketplaceShell>
      <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 mx-auto h-64 max-w-md rounded-full bg-[radial-gradient(circle,rgba(232,66,8,0.18),transparent_70%)] blur-2xl" />

        <ServisLogo
          variant="lockup"
          href={null}
          className="mb-6"
          markClassName="h-10 w-auto"
        />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Choisissez un mot de passe sécurisé pour votre compte SERVIS.
        </p>

        {linkMissing ? (
          <div className="mt-8 space-y-4 rounded-3xl bg-surface/80 p-6 sm:p-8">
            <FormMessage
              variant="error"
              title="Lien incomplet"
              message="Ce lien de réinitialisation est invalide. Demandez-en un nouveau."
            />
            <Button asChild variant="primary" className="w-full rounded-full">
              <Link href="/forgot-password">Demander un nouveau lien</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="mt-8 space-y-4 rounded-3xl bg-surface/80 p-6 shadow-[0_20px_50px_rgba(14,14,14,0.06)] backdrop-blur sm:p-8"
          >
            <Input
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />

            {(localError || error) && (
              <FormMessage
                variant="error"
                title="Réinitialisation refusée"
                message={localError || error}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-full"
              loading={loading}
            >
              Enregistrer et se connecter
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          <Link href="/login" className="text-primary hover:underline">
            Retour à la connexion
          </Link>
          {" · "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Renvoyer un lien
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <div className="mx-auto max-w-md px-4 py-12">Chargement…</div>
        </MarketplaceShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
