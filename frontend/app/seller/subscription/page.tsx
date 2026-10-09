"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormMessage } from "@/components/ui/form-message";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PaymentStatusBadge,
  SubscriptionStatusBadge,
  productQuotaLabel,
} from "@/features/billing/components/BillingBadges";
import * as billingService from "@/features/billing/services/billing.service";
import type {
  Entitlements,
  Plan,
  PlatformPaymentMethod,
  Subscription,
} from "@/features/billing/types/billing.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { env } from "@/config/env";
import { formatPrice } from "@/lib/utils";
import { prepareProofFile } from "@/lib/prepare-image-file";
import { subscriptionPaymentNotifyPlatformMessage } from "@/lib/whatsapp";
import { WhatsAppNotifyButton } from "@/features/payments/components/WhatsAppNotifyButton";

function dh(amount: string | number) {
  return formatPrice(Number(amount));
}

type Step = "plans" | "pay" | "proof" | "done";

export default function SellerSubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PlatformPaymentMethod[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [methodId, setMethodId] = useState<string>("");
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, m, e, s] = await Promise.all([
        billingService.getPlans(),
        billingService.getPlatformPaymentMethods(),
        billingService.getEntitlements(),
        billingService.getMySubscriptions(),
      ]);
      setPlans(p);
      setMethods(m);
      setEntitlements(e);
      setSubs(s);
      if (m[0]) setMethodId(m[0].id);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, "Impossible de charger l'abonnement.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, m, e, s] = await Promise.all([
          billingService.getPlans(),
          billingService.getPlatformPaymentMethods(),
          billingService.getEntitlements(),
          billingService.getMySubscriptions(),
        ]);
        if (cancelled) return;
        setPlans(p);
        setMethods(m);
        setEntitlements(e);
        setSubs(s);
        if (m[0]) setMethodId(m[0].id);
      } catch (err) {
        if (!cancelled) {
          setError(
            getUserFacingErrorMessage(err, "Impossible de charger l'abonnement.")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const storePlans = useMemo(
    () => plans.filter((p) => p.category === "STORE"),
    [plans]
  );
  const servicePlans = useMemo(
    () => plans.filter((p) => p.category === "SERVICE"),
    [plans]
  );

  const selectedMethod = methods.find((m) => m.id === methodId) ?? null;

  async function startCheckout(plan: Plan) {
    setActionError(null);
    setSelectedPlan(plan);
    if (plan.code === "STORE_FREE" || Number(plan.price) === 0) {
      setBusy(true);
      try {
        await billingService.createSubscription({ plan_id: plan.id });
        await load();
        setStep("done");
      } catch (err) {
        setActionError(
          getUserFacingErrorMessage(err, "Échec de l'abonnement gratuit.")
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep("pay");
  }

  async function confirmPayment() {
    if (!selectedPlan || !methodId) return;
    setBusy(true);
    setActionError(null);
    try {
      const sub = await billingService.createSubscription({
        plan_id: selectedPlan.id,
        payment_method_id: methodId,
      });
      setPendingSub(sub);
      setStep("proof");
      await load();
    } catch (err) {
      setActionError(
        getUserFacingErrorMessage(err, "Impossible de démarrer le paiement.")
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!pendingSub || !proofFile) {
      setActionError("Sélectionnez une preuve de paiement.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await billingService.uploadSubscriptionProof(
        pendingSub.id,
        proofFile,
        reference
      );
      setStep("done");
      await load();
    } catch (err) {
      setActionError(
        getUserFacingErrorMessage(err, "Impossible d'envoyer la preuve.")
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">
            Mon abonnement
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Boutique et services sont indépendants. Activation après validation
            manuelle du paiement.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/seller">Retour tableau de bord</Link>
        </Button>
      </div>

      {entitlements && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-body-sm text-text-secondary">
                Boutique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-heading-m font-semibold">
                {entitlements.store.plan_name}
              </p>
              <p className="text-body-sm">
                Produits :{" "}
                {productQuotaLabel(
                  entitlements.store.active_product_count,
                  entitlements.store.product_limit
                )}
              </p>
              {entitlements.store.days_remaining != null && (
                <p className="text-body-sm text-text-secondary">
                  Expire dans {entitlements.store.days_remaining} jours
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-body-sm text-text-secondary">
                Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-heading-m font-semibold">
                {entitlements.services.has_active_subscription
                  ? entitlements.services.plan_name
                  : "Aucun abonnement"}
              </p>
              {entitlements.services.days_remaining != null && (
                <p className="text-body-sm text-text-secondary">
                  Expire dans {entitlements.services.days_remaining} jours
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === "plans" && (
        <>
          {storePlans.length === 0 && servicePlans.length === 0 && (
            <EmptyState
              title="Les offres Free, Standard et Premium"
              description="Les formules boutique et services n’ont pas encore été chargées. Réessayez — elles s’affichent dès que le serveur les a enregistrées."
              actionLabel="Réessayer"
              onAction={() => void load()}
            />
          )}
          <section className="space-y-3">
            <h3 className="text-heading-s font-semibold">Boutique</h3>
            <ul className="grid gap-3 sm:hidden">
              {storePlans.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-body-sm text-text-secondary">
                    {dh(p.price)} / mois
                  </p>
                  <ul className="mt-2 space-y-1 text-caption text-text-muted">
                    <li>Produits : {p.product_limit ?? "∞"}</li>
                    <li>Stats avancées : {p.advanced_stats ? "Oui" : "Non"}</li>
                    <li>Boost : {p.boosts_allowed ? "Oui" : "Non"}</li>
                  </ul>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={() => void startCheckout(p)}
                  >
                    Choisir
                  </Button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[520px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="py-2 pr-3">Fonctionnalité</th>
                    {storePlans.map((p) => (
                      <th key={p.id} className="py-2 pr-3">
                        {p.name.replace("Boutique ", "")}
                        <div className="font-normal">
                          {dh(p.price)} / mois
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Produits</td>
                    {storePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.product_limit ?? "∞"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Stats avancées</td>
                    {storePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.advanced_stats ? "Oui" : "Non"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Boost</td>
                    {storePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.boosts_allowed ? "Oui" : "Non"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-3" />
                    {storePlans.map((p) => (
                      <td key={p.id} className="py-3 pr-3">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void startCheckout(p)}
                        >
                          Choisir
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-heading-s font-semibold">Services</h3>
            <ul className="grid gap-3 sm:hidden">
              {servicePlans.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-body-sm text-text-secondary">
                    {dh(p.price)} / mois
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={() => void startCheckout(p)}
                  >
                    Choisir
                  </Button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[420px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="py-2 pr-3">Fonctionnalité</th>
                    {servicePlans.map((p) => (
                      <th key={p.id} className="py-2 pr-3">
                        {p.name.replace("Services ", "")}
                        <div className="font-normal">
                          {dh(p.price)} / mois
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Publier des services</td>
                    {servicePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.service_enabled ? "Oui" : "Non"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Stats avancées</td>
                    {servicePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.advanced_stats ? "Oui" : "Non"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">Boost</td>
                    {servicePlans.map((p) => (
                      <td key={p.id} className="py-2 pr-3">
                        {p.boosts_allowed ? "Oui" : "Non"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-3" />
                    {servicePlans.map((p) => (
                      <td key={p.id} className="py-3 pr-3">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void startCheckout(p)}
                        >
                          Choisir
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {step === "pay" && selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Paiement — {selectedPlan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm">
              Montant à payer :{" "}
              <strong>{dh(selectedPlan.price)}</strong>
            </p>
            <p className="rounded-lg border border-border bg-surface-muted/40 p-3 text-body-sm">
              Votre abonnement sera activé après vérification manuelle de votre
              paiement.
            </p>
            <label className="block text-body-sm font-medium">
              Moyen de paiement SERVIS
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedMethod && (
              <div className="space-y-1 text-body-sm text-text-secondary">
                <p>Bénéficiaire : {selectedMethod.account_name}</p>
                <p>Compte : {selectedMethod.account_number}</p>
                <p>{selectedMethod.instructions}</p>
              </div>
            )}
            {actionError && (
              <FormMessage
                variant="error"
                title="Paiement non enregistré"
                message={actionError}
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("plans")}>
                Retour
              </Button>
              <Button disabled={busy || !methodId} onClick={() => void confirmPayment()}>
                J&apos;ai payé — continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "proof" && pendingSub && (
        <Card>
          <CardHeader>
            <CardTitle>Envoyer la preuve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm text-text-secondary">
              Choisissez une capture dans votre galerie, ou un PDF. La preuve
              reste privée.
            </p>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/*,image/heic,image/heif,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const ready = await prepareProofFile(file);
                  setProofFile(ready);
                  setActionError(null);
                } catch (err) {
                  setProofFile(null);
                  setActionError(
                    getUserFacingErrorMessage(
                      err,
                      "Photo illisible. Utilisez JPEG, PNG, WebP ou PDF."
                    )
                  );
                } finally {
                  if (proofInputRef.current) proofInputRef.current.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => proofInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choisir depuis la galerie
            </Button>
            {proofFile ? (
              <p className="text-caption text-text-secondary">
                Fichier : {proofFile.name}
              </p>
            ) : null}
            <input
              type="text"
              placeholder="Référence (optionnel)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body-sm"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            {actionError && (
              <FormMessage
                variant="error"
                title="Envoi de la preuve impossible"
                message={actionError}
              />
            )}
            <Button disabled={busy} onClick={() => void submitProof()}>
              Envoyer
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="font-medium">Demande enregistrée.</p>
            <p className="text-body-sm text-text-secondary">
              Si un paiement est requis, l&apos;activation suit la validation
              administrateur. Prévenez aussi SERVIS sur WhatsApp pour accélérer
              le traitement.
            </p>
            {selectedPlan && Number(selectedPlan.price) > 0 && (
              <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <p className="text-body-sm font-medium">
                  Informer SERVIS sur WhatsApp
                </p>
                <WhatsAppNotifyButton
                  phone={env.platformWhatsapp}
                  message={subscriptionPaymentNotifyPlatformMessage({
                    planName: selectedPlan.name,
                    amountLabel: dh(selectedPlan.price),
                  })}
                  label="Envoyer le message à SERVIS"
                />
              </div>
            )}
            <Button
              onClick={() => {
                setStep("plans");
                setPendingSub(null);
                setSelectedPlan(null);
              }}
            >
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h3 className="text-heading-s font-semibold">Historique</h3>
        {subs.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Aucun abonnement.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-body-sm"
              >
                <div>
                  <span className="font-medium">{s.plan.name}</span>
                  <span className="text-text-secondary">
                    {" "}
                    — {dh(s.plan.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SubscriptionStatusBadge status={s.status} />
                  {s.latest_payment && (
                    <PaymentStatusBadge status={s.latest_payment.status} />
                  )}
                </div>
                {s.latest_payment?.rejection_reason && (
                  <p className="w-full text-error">
                    Refus : {s.latest_payment.rejection_reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
