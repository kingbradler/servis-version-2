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
import { useSellerProducts } from "@/features/products/hooks/useSellerProducts";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  compare_price: string;
  stock: string;
  is_featured: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  category: "",
  price: "",
  compare_price: "",
  stock: "0",
  is_featured: false,
};

export default function NewSellerProductPage() {
  const router = useRouter();
  const { create } = useSellerProducts();
  const { categories, loading: categoriesLoading } = useCategories();
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

  const handleField =
    (field: keyof Omit<FormState, "is_featured">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const created = await create({
        name: form.name,
        description: form.description,
        category: form.category || null,
        price: form.price,
        compare_price: form.compare_price ? form.compare_price : null,
        stock: form.stock ? Number(form.stock) : 0,
        is_featured: form.is_featured,
      });
      toast({ title: "Produit créé", variant: "success" });
      router.push(`/seller/products/${created.id}`);
    } catch (err) {
      const message = getUserFacingErrorMessage(
        err,
        "Impossible de créer le produit."
      );
      setFormError(message);
      toastError(err, {
        title: "Création impossible",
        fallback: "Impossible de créer le produit.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">
          Nouveau produit
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Renseignez les informations de votre produit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails du produit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom du produit"
              value={form.name}
              onChange={handleField("name")}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-text-primary">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={handleField("description")}
                rows={4}
                className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text-primary transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>

            <Select
              label="Catégorie"
              options={categoryOptions}
              value={form.category}
              onChange={handleField("category")}
              placeholder={categoriesLoading ? "Chargement…" : "Sélectionner une catégorie"}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Prix (MAD)"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleField("price")}
                required
              />
              <Input
                label="Prix barré (MAD)"
                type="number"
                min="0"
                step="0.01"
                value={form.compare_price}
                onChange={handleField("compare_price")}
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleField("stock")}
              />
            </div>

            <Checkbox
              label="Mettre en avant ce produit"
              checked={form.is_featured}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_featured: checked === true }))
              }
            />

            {formError && (
              <FormMessage
                variant="error"
                title="Vérifiez le formulaire"
                message={formError}
              />
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>
                Créer le produit
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/seller/products")}
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
