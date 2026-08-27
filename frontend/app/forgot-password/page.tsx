"use client";

import Link from "next/link";
import { useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import * as authService from "@/features/auth/services/auth.service";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(
          err,
          "Impossible d'envoyer l'e-mail. Réessayez."
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
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Indiquez votre e-mail : nous vous enverrons un lien pour choisir un
          nouveau mot de passe.
        </p>

        {done ? (
          <div className="mt-8 space-y-4 rounded-3xl bg-surface/80 p-6 shadow-[0_20px_50px_rgba(14,14,14,0.06)] backdrop-blur sm:p-8">
            <FormMessage
              variant="success"
              title="E-mail envoyé"
              message="Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation sous peu. Pensez à vérifier vos spams."
            />
            <Button asChild variant="primary" className="w-full rounded-full">
              <Link href="/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="mt-8 space-y-4 rounded-3xl bg-surface/80 p-6 shadow-[0_20px_50px_rgba(14,14,14,0.06)] backdrop-blur sm:p-8"
          >
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && (
              <FormMessage
                variant="error"
                title="Envoi impossible"
                message={error}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-full"
              loading={loading}
            >
              Envoyer le lien
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          <Link href="/login" className="text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}
