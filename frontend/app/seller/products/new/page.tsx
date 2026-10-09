"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useSellerProducts } from "@/features/products/hooks/useSellerProducts";
import * as productsService from "@/features/products/services/products.service";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { prepareProductImageFile } from "@/lib/prepare-image-file";

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
  const { entitlements } = useEntitlements({ autoLoad: true });
  const { toast, toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const imageLimit = entitlements?.store.product_image_limit ?? 1;
  const previews = useMemo(
    () => photos.map((file) => URL.createObjectURL(file)),
    [photos]
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

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

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    setPhotos((prev) => {
      const room = Math.max(0, imageLimit - prev.length);
      const next = [...prev, ...Array.from(files).slice(0, room)];
      return next.slice(0, imageLimit);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      let photoError: string | null = null;
      for (const file of photos) {
        try {
          const ready = await prepareProductImageFile(file);
          await productsService.uploadSellerProductImage(created.id, ready);
        } catch (err) {
          photoError = getUserFacingErrorMessage(
            err,
            "Le produit est créé, mais la photo n’a pas pu être envoyée."
          );
        }
      }

      if (photoError) {
        toast({
          title: "Produit créé, photo à reprendre",
          description: photoError,
          variant: "warning",
        });
      } else {
        toast({
          title: photos.length ? "Produit créé avec photo" : "Produit créé",
          variant: "success",
        });
      }
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
          Ajoutez le nom, le prix et une photo. Vous pourrez publier ensuite.
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

            <div className="space-y-3 rounded-xl border border-border bg-surface-secondary/40 p-4">
              <div>
                <p className="text-body-sm font-medium text-text-primary">
                  Photo du produit ({photos.length}/{imageLimit})
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  JPEG, PNG ou WebP — 5 Mo max. Sur iPhone, la photo est convertie
                  automatiquement si besoin.
                </p>
              </div>
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {previews.map((src, index) => (
                    <div
                      key={`${photos[index]?.name}-${index}`}
                      className="relative h-24 w-24 overflow-hidden rounded-xl border border-border"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Retirer cette photo"
                        className="absolute right-1 top-1 rounded-md bg-dk/70 p-1 text-white"
                        onClick={() =>
                          setPhotos((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={photos.length >= imageLimit}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {photos.length >= imageLimit
                  ? "Limite atteinte"
                  : "Ajouter une photo"}
              </Button>
            </div>

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
