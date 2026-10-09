"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as billingService from "@/features/billing/services/billing.service";
import type { PlatformPaymentMethod } from "@/features/billing/types/billing.types";
import { isApiError } from "@/lib/api/errors";

type MethodRow = PlatformPaymentMethod & {
  is_active: boolean;
  sort_order: number;
};

const emptyForm = {
  name: "",
  account_name: "SERVIS",
  account_number: "",
  instructions: "",
  is_active: true,
};

export default function AdminPlatformPaymentsPage() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMethods(await billingService.getAdminPlatformPaymentMethods());
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (method: MethodRow) => {
    setEditingId(method.id);
    setForm({
      name: method.name,
      account_name: method.account_name,
      account_number: method.account_number,
      instructions: method.instructions,
      is_active: method.is_active,
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await billingService.updateAdminPlatformPaymentMethod(editingId, form);
        toast({ title: "Moyen mis à jour", variant: "success" });
      } else {
        await billingService.createAdminPlatformPaymentMethod(form);
        toast({ title: "Moyen ajouté", variant: "success" });
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast({
        title: isApiError(err) ? err.message : "Enregistrement impossible",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">
          Moyens de paiement SERVIS
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Ces coordonnées s&apos;affichent aux professionnels quand ils paient
          un abonnement. Renseignez vos vrais numéros (Orange Money, Inwi,
          RIB…).
        </p>
      </div>

      {loading && <Skeleton className="h-32 w-full" />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {!loading && !error && methods.length === 0 && (
        <EmptyState
          title="Aucun moyen pour l'instant"
          description="Ajoutez Orange Money, Inwi Money, Cash Plus ou un virement."
        />
      )}
      {!loading && !error && (
        <div className="space-y-3">
          {methods.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1 text-body-sm">
                  <p className="font-medium">
                    {m.name}{" "}
                    {!m.is_active && (
                      <span className="text-text-muted">(inactif)</span>
                    )}
                  </p>
                  <p className="break-words">
                    {m.account_name} — {m.account_number}
                  </p>
                  <p className="text-text-secondary">{m.instructions}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => startEdit(m)}
                >
                  Modifier
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-heading-s font-semibold">
            {editingId ? "Modifier ce moyen" : "Ajouter un moyen"}
          </h3>
          <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
            <Input
              label="Nom (ex. Orange Money)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Bénéficiaire"
              value={form.account_name}
              onChange={(e) =>
                setForm({ ...form, account_name: e.target.value })
              }
              required
            />
            <Input
              label="Numéro / RIB / référence"
              value={form.account_number}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
              required
            />
            <Input
              label="Consignes pour le professionnel"
              value={form.instructions}
              onChange={(e) =>
                setForm({ ...form, instructions: e.target.value })
              }
            />
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(v) =>
                setForm({ ...form, is_active: v === true })
              }
              label="Actif (visible pour les professionnels)"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" loading={saving}>
                {editingId ? "Enregistrer" : "Ajouter"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={startCreate}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
