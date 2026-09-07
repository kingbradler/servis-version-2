"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { CartItem } from "@/features/orders/types/order.types";
import * as ordersService from "@/features/orders/services/orders.service";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { cn, formatPrice } from "@/lib/utils";
import { useOptionalCart } from "@/providers/cart-provider";

type CartStep = "edit" | "confirm";

function groupByStore(items: CartItem[]) {
  const map = new Map<
    string,
    { storeName: string; storeSlug: string; items: CartItem[] }
  >();
  for (const item of items) {
    const key = item.product.store_slug || item.product.store_name;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, {
        storeName: item.product.store_name,
        storeSlug: item.product.store_slug,
        items: [item],
      });
    }
  }
  return Array.from(map.values());
}

function QuantityStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const atMin = value <= 1;
  const atMax = typeof max === "number" && value >= max;

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        aria-label="Diminuer la quantité"
        disabled={disabled || atMin}
        onClick={() => onChange(value - 1)}
        className={cn(
          "flex h-10 w-10 items-center justify-center text-text-primary transition-colors",
          "hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2.5rem] text-center text-body-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        disabled={disabled || atMax}
        onClick={() => onChange(value + 1)}
        className={cn(
          "flex h-10 w-10 items-center justify-center text-text-primary transition-colors",
          "hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const cart = useOptionalCart();
  const { user } = useCurrentUser();
  const { toast, toastError } = useToast();
  const [step, setStep] = useState<CartStep>("edit");
  const [checkingOut, setCheckingOut] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const items = cart?.cart?.items ?? [];
  const groups = useMemo(() => groupByStore(items), [items]);

  useEffect(() => {
    if (!user) return;
    setDeliveryName((prev) => {
      if (prev) return prev;
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    });
    setDeliveryPhone((prev) => prev || user.phone || "");
  }, [user]);

  if (!cart || cart.authLoading) {
    return (
      <MarketplaceShell>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <LoadingState message="Chargement du panier…" />
        </div>
      </MarketplaceShell>
    );
  }

  if (!cart.isAuthenticated) {
    return (
      <MarketplaceShell>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <EmptyState
            title="Connexion requise"
            description="Connectez-vous pour voir et gérer votre panier."
            actionLabel="Se connecter"
            onAction={() =>
              router.push(`/login?next=${encodeURIComponent("/cart")}`)
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  if (cart.loading) {
    return (
      <MarketplaceShell>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <LoadingState message="Chargement du panier…" />
        </div>
      </MarketplaceShell>
    );
  }

  if (cart.error) {
    return (
      <MarketplaceShell>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <ErrorState message={cart.error} onRetry={() => void cart.refresh()} />
        </div>
      </MarketplaceShell>
    );
  }

  const onQuantityChange = async (item: CartItem, next: number) => {
    if (next < 1) return;
    if (typeof item.product.stock === "number" && next > item.product.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Il reste ${item.product.stock} unité(s) pour ce produit.`,
        variant: "warning",
      });
      return;
    }
    setUpdatingId(item.id);
    setActionError(null);
    try {
      await cart.updateItem(item.id, next);
    } catch (err) {
      toastError(err, {
        title: "Quantité non mise à jour",
        fallback: "Impossible de modifier la quantité.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const onRemove = async (itemId: string) => {
    setUpdatingId(itemId);
    setActionError(null);
    try {
      await cart.removeItem(itemId);
      toast({ title: "Article retiré", variant: "success" });
    } catch (err) {
      toastError(err, {
        title: "Retrait impossible",
        fallback: "Impossible de retirer l'article.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const onCheckout = async () => {
    const name = deliveryName.trim();
    const phone = deliveryPhone.trim();
    const address = deliveryAddress.trim();
    const city = deliveryCity.trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 8 || address.length < 5) {
      setActionError(
        "Complétez le destinataire, un téléphone valide et l'adresse de livraison."
      );
      return;
    }
    if (city.length < 2) {
      setActionError("Indiquez la ville de livraison.");
      return;
    }

    setCheckingOut(true);
    setActionError(null);
    try {
      const result = await ordersService.checkoutCart({
        delivery_name: name,
        delivery_phone: phone,
        delivery_address: address,
        delivery_city: city,
        delivery_notes: deliveryNotes.trim(),
      });
      await cart.refresh();
      toast({
        title: "Commande créée",
        description:
          result.orders.length > 1
            ? `${result.orders.length} commandes créées (une par boutique).`
            : "Votre commande a été créée. Passez au paiement.",
        variant: "success",
      });
      const first = result.orders[0];
      if (first) {
        router.push(`/dashboard/orders/${first.id}`);
      } else {
        router.push("/dashboard/orders");
      }
    } catch (err) {
      const message = getUserFacingErrorMessage(
        err,
        "Impossible de valider la commande."
      );
      setActionError(message);
      toastError(err, {
        title: "Commande impossible",
        fallback: message,
      });
      setStep("confirm");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <header className="mb-8">
          <p className="mb-2 text-caption font-semibold uppercase tracking-[0.2em] text-primary">
            Panier
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {step === "edit" ? "Votre sélection" : "Confirmer la commande"}
          </h1>
          <p className="mt-2 text-body-sm text-text-secondary">
            {step === "edit"
              ? "Ajustez les quantités, puis passez à la confirmation."
              : "Vérifiez le récapitulatif. Une commande sera créée par boutique."}
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Votre panier est vide"
            description="Parcourez le catalogue pour ajouter des produits."
            actionLabel="Voir les produits"
            onAction={() => router.push("/products")}
          />
        ) : step === "edit" ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <section
                key={group.storeSlug || group.storeName}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="border-b border-border bg-surface-secondary/50 px-4 py-3">
                  <Link
                    href={`/stores/${group.storeSlug}`}
                    className="text-body-sm font-semibold text-text-primary hover:text-primary"
                  >
                    {group.storeName}
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/stores/${item.product.store_slug}/products/${item.product.slug}`}
                          className="font-medium text-text-primary hover:text-primary"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-0.5 text-caption text-text-muted">
                          {formatPrice(Number(item.product.price))} / unité
                          {typeof item.product.stock === "number"
                            ? ` · Stock ${item.product.stock}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <QuantityStepper
                          value={item.quantity}
                          max={item.product.stock}
                          disabled={updatingId === item.id}
                          onChange={(next) =>
                            void onQuantityChange(item, next)
                          }
                        />
                        <span className="min-w-[5.5rem] text-right text-body-sm font-semibold tabular-nums">
                          {formatPrice(Number(item.line_total))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingId === item.id}
                          onClick={() => void onRemove(item.id)}
                        >
                          Retirer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="flex items-center justify-between rounded-2xl bg-dk px-5 py-4 text-white">
              <span className="text-body font-medium text-white/70">Total</span>
              <span className="text-heading-s font-bold tabular-nums">
                {formatPrice(Number(cart.cart?.total_amount ?? 0))}
              </span>
            </div>

            {actionError && (
              <FormMessage
                variant="error"
                title="Action impossible"
                message={actionError}
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="primary"
                size="lg"
                className="w-full rounded-none uppercase tracking-wide sm:w-auto"
                onClick={() => {
                  setActionError(null);
                  setStep("confirm");
                }}
              >
                Continuer — récapitulatif
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-none">
                <Link href="/products">Continuer vos achats</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <FormMessage
              variant="info"
              title={`${groups.length} boutique${groups.length > 1 ? "s" : ""}`}
              message={
                groups.length > 1
                  ? "Plusieurs commandes seront créées — une par boutique. Vous pourrez payer chacune séparément."
                  : "Une seule commande sera créée pour cette boutique."
              }
            />

            <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="font-semibold">Adresse de livraison</h2>
              <p className="text-caption text-text-muted">
                Indiquez où le vendeur peut vous livrer ou vous rencontrer.
              </p>
              <Input
                label="Destinataire"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                required
                autoComplete="name"
              />
              <Input
                label="Téléphone (WhatsApp)"
                type="tel"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                required
                autoComplete="tel"
              />
              <Input
                label="Adresse"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                placeholder="Quartier, rue, immeuble…"
                autoComplete="street-address"
              />
              <Input
                label="Ville"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                required
                autoComplete="address-level2"
                placeholder="Votre ville"
              />
              <label className="block space-y-1.5">
                <span className="text-body-sm font-medium text-text-primary">
                  Notes (optionnel)
                </span>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  maxLength={400}
                  placeholder="Code d'entrée, horaires préférés…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>
            </section>

            {groups.map((group) => {
              const subtotal = group.items.reduce(
                (sum, i) => sum + Number(i.line_total),
                0
              );
              return (
                <section
                  key={`confirm-${group.storeSlug || group.storeName}`}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold">{group.storeName}</h2>
                    <span className="text-body-sm font-bold tabular-nums">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 text-body-sm text-text-secondary"
                      >
                        <span>
                          {item.product.name}{" "}
                          <span className="text-text-muted">
                            × {item.quantity}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium text-text-primary tabular-nums">
                          {formatPrice(Number(item.line_total))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <div className="flex items-center justify-between rounded-2xl bg-dk px-5 py-4 text-white">
              <span className="text-body font-medium text-white/70">
                Total à régler
              </span>
              <span className="text-heading-s font-bold tabular-nums">
                {formatPrice(Number(cart.cart?.total_amount ?? 0))}
              </span>
            </div>

            <p className="text-caption text-text-muted">
              Après validation, vous serez dirigé vers le paiement (virement /
              Mobile Money + preuve).
            </p>

            {actionError && (
              <FormMessage
                variant="error"
                title="Commande impossible"
                message={actionError}
              />
            )}

            <div className="h-20 sm:hidden" aria-hidden />

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 safe-pb backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full rounded-none uppercase tracking-wide sm:w-auto"
                  loading={checkingOut}
                  onClick={() => void onCheckout()}
                >
                  Confirmer et commander
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-none"
                  disabled={checkingOut}
                  onClick={() => setStep("edit")}
                >
                  Modifier le panier
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
