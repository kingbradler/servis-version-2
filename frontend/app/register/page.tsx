"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolvePostLoginPath } from "@/features/auth/lib/roles";
import type { RegisterAccountType } from "@/features/auth/types/auth.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { register, loading, error } = useAuth();

  const [accountType, setAccountType] = useState<RegisterAccountType>("CLIENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== passwordConfirm) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }
    const whatsapp = phone.trim();
    if (!whatsapp) {
      setLocalError(
        "Le numéro WhatsApp est obligatoire pour vous contacter après un paiement."
      );
      return;
    }
    try {
      const user = await register(
        {
          email,
          password,
          password_confirm: passwordConfirm,
          first_name: firstName,
          last_name: lastName,
          phone: whatsapp,
        },
        accountType
      );
      if (!user.is_verified) {
        router.replace("/verify-email/pending");
        router.refresh();
        return;
      }
      const next = resolvePostLoginPath(user.role, nextParam);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, "Inscription impossible. Réessayez.")
      );
    }
  };

  const loginHref = nextParam
    ? `/login?next=${encodeURIComponent(nextParam)}`
    : "/login";

  return (
    <MarketplaceShell>
      <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
        <ServisLogo
          variant="lockup"
          href={null}
          className="mb-6"
          markClassName="h-10 w-auto"
        />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Créer un compte
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Un seul compte. Choisissez votre parcours principal — un
          professionnel peut aussi acheter.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAccountType("CLIENT")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              accountType === "CLIENT"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface/80 hover:border-border-strong"
            )}
          >
            <p className="font-semibold">Client</p>
            <p className="mt-1 text-caption text-text-secondary">
              Acheter des produits et demander des services.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("SELLER")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              accountType === "SELLER"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface/80 hover:border-border-strong"
            )}
          >
            <p className="font-semibold">Professionnel</p>
            <p className="mt-1 text-caption text-text-secondary">
              Vendre des produits et/ou proposer des services.
            </p>
          </button>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-6 space-y-4 rounded-3xl bg-surface/80 p-6 shadow-[0_20px_50px_rgba(14,14,14,0.06)] backdrop-blur sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prénom"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Nom"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Numéro WhatsApp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+212 6 XX XX XX XX"
            hint="Obligatoire — pour les confirmations de commande et de paiement"
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />

          {(localError || error) && (
            <FormMessage
              variant="error"
              title="Inscription impossible"
              message={localError || error}
            />
          )}

          <p className="text-center text-caption leading-relaxed text-text-muted">
            En créant un compte, vous acceptez les{" "}
            <Link href="/legal/cgu" className="text-primary hover:underline">
              CGU
            </Link>{" "}
            et la{" "}
            <Link
              href="/legal/confidentialite"
              className="text-primary hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full rounded-full"
            loading={loading}
          >
            Créer mon compte
          </Button>
        </form>

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          Déjà un compte ?{" "}
          <Link href={loginHref} className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </MarketplaceShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell>
          <div className="mx-auto max-w-md px-4 py-12">Chargement…</div>
        </MarketplaceShell>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
