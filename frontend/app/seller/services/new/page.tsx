"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useSellerServices } from "@/features/pro-services/hooks/useSellerServices";
import type { ServicePriceType } from "@/features/pro-services/types/service.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  price_type: ServicePriceType;
  duration: string;
  is_featured: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  category: "",
  price: "",
  price_type: "FIXED",
  duration: "",
  is_featured: false,
};

export default function NewSellerServicePage() {
  const router = useRouter();
  const { create } = useSellerServices();
  const { categories, loading: categoriesLoading } = useCategories(undefined, {
    for: "service",
  });
  const { toast, toastError } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryOptions = categories.flatMap((cat) => [
    { value: cat.id, label: cat.name },
    ...cat.children.map((child) => ({
      value: child.id,
      label: `— ${child.name}`,
    })),
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const created = await create({
        name: form.name,
        description: form.description,
        category: form.category || null,
        price: form.price_type === "QUOTE" ? null : form.price || null,
        price_type: form.price_type,
        duration: form.duration,
        is_featured: form.is_featured,
      });
      toast({ title: "Service créé", variant: "success" });
      router.push(`/seller/services/${created.id}`);
    } catch (err) {
      const message = getUserFacingErrorMessage(
        err,
        "Impossible de créer le service."
      );
      setFormError(message);
      toastError(err, {
        title: "Création impossible",
        fallback: "Impossible de créer le service.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Nouveau service</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Créez une prestation en brouillon, puis publiez-la.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              label="Nom"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-body-sm font-medium">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <Select
              label="Catégorie"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              options={[
                { value: "", label: categoriesLoading ? "Chargement…" : "Aucune" },
                ...categoryOptions,
              ]}
            />
            <Select
              label="Type de prix"
              value={form.price_type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  price_type: e.target.value as ServicePriceType,
                }))
              }
              options={[
                { value: "FIXED", label: "Prix fixe" },
                { value: "FROM", label: "À partir de" },
                { value: "QUOTE", label: "Sur devis" },
              ]}
            />
            {form.price_type !== "QUOTE" && (
              <Input
                label="Prix (MAD)"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            )}
            <Input
              label="Durée"
              placeholder="Ex: 1 h, 30 min"
              value={form.duration}
              onChange={(e) =>
                setForm((p) => ({ ...p, duration: e.target.value }))
              }
            />
            <Checkbox
              checked={form.is_featured}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, is_featured: Boolean(checked) }))
              }
              label="Mettre en avant"
            />
            {formError && (
              <FormMessage
                variant="error"
                title="Vérifiez le formulaire"
                message={formError}
              />
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" loading={saving}>
                Créer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/seller/services")}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
