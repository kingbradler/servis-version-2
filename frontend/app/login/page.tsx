"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolvePostLoginPath } from "@/features/auth/lib/roles";
import * as authService from "@/features/auth/services/auth.service";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Already signed in (API cookie) → leave /login instead of showing the form.
  useEffect(() => {
    let cancelled = false;
    void authService
      .getMe()
      .then((user) => {
        if (cancelled || !user) return;
        router.replace(resolvePostLoginPath(user.role, nextParam));
      })
      .catch(() => {
        /* stay on the form */
      });
    return () => {
      cancelled = true;
    };
  }, [router, nextParam]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      const user = await login({ email, password });
      const next = resolvePostLoginPath(user.role, nextParam);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, "Connexion impossible. Réessayez.")
      );
    }
  };

  const registerHref = nextParam
    ? `/register?next=${encodeURIComponent(nextParam)}`
    : "/register";

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
          Connexion
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Connectez-vous pour accéder à votre compte.
        </p>

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
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="-mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-caption text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {(localError || error) && (
            <FormMessage
              variant="error"
              title="Connexion refusée"
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
            Se connecter
          </Button>
        </form>

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          Pas encore de compte ?{" "}
          <Link href={registerHref} className="text-primary hover:underline">
            Créer un compte
          </Link>
          {" · "}
          <Link href="/" className="text-primary hover:underline">
            Accueil
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <div className="mx-auto max-w-md px-4 py-12">Chargement…</div>
        </MarketplaceShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
