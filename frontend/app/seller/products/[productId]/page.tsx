"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/error-state";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { useCategories } from "@/features/categories/hooks/useCategories";
import * as productsService from "@/features/products/services/products.service";
import type {
  ProductImage,
  ProductSeller,
  ProductStatus,
} from "@/features/products/types/product.types";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { isApiError } from "@/lib/api/errors";
import { prepareProductImageFile } from "@/lib/prepare-image-file";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  OUT_OF_STOCK: "Rupture de stock",
  ARCHIVED: "Archivé",
};

const STATUS_VARIANTS: Record<
  ProductStatus,
  "secondary" | "success" | "warning" | "error"
> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  OUT_OF_STOCK: "warning",
  ARCHIVED: "error",
};

interface FormState {
  name: string;
  description: string;
  price: string;
  compare_price: string;
  stock: string;
  is_featured: boolean;
  video_url: string;
}

export default function EditSellerProductPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const router = useRouter();
  const { toast } = useToast();
  const { categories } = useCategories();
  const { entitlements } = useEntitlements({ autoLoad: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<ProductSeller | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const imageLimit = entitlements?.store.product_image_limit ?? 1;
  const atImageLimit = images.length >= imageLimit;

  const categoryOptions = useMemo(
    () =>
      categories.flatMap((cat) => [
        { value: cat.id, label: cat.name },
        ...cat.children.map((child) => ({
          value: child.id,
          label: `— ${child.name}`,
        })),
      ]),
    [categories]
  );

  const findCategoryId = useCallback(
    (slug: string | undefined) => {
      if (!slug) return "";
      for (const cat of categories) {
        if (cat.slug === slug) return cat.id;
        const child = cat.children.find((c) => c.slug === slug);
        if (child) return child.id;
      }
      return "";
    },
    [categories]
  );

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, imageList] = await Promise.all([
        productsService.getSellerProduct(productId),
        productsService.listSellerProductImages(productId),
      ]);
      setProduct(data);
      setImages(imageList);
      setForm({
        name: data.name,
        description: data.description ?? "",
        price: data.price,
        compare_price: data.compare_price ?? "",
        stock: String(data.stock),
        is_featured: data.is_featured,
        video_url: data.video_url ?? "",
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement du produit");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      productsService.getSellerProduct(productId),
      productsService.listSellerProductImages(productId),
    ])
      .then(([data, imageList]) => {
        if (cancelled) return;
        setProduct(data);
        setImages(imageList);
        setForm({
          name: data.name,
          description: data.description ?? "",
          price: data.price,
          compare_price: data.compare_price ?? "",
          stock: String(data.stock),
          is_featured: data.is_featured,
          video_url: data.video_url ?? "",
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement du produit");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Derived category selection: prefer a manual override, otherwise resolve
  // from the loaded product's category slug once categories are available.
  const categoryValue =
    categoryOverride ?? findCategoryId(product?.category?.slug);

  const handleField =
    (field: keyof Omit<FormState, "is_featured">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      const updated = await productsService.updateProduct(productId, {
        name: form.name,
        description: form.description,
        category_id: categoryValue || null,
        price: form.price,
        compare_price: form.compare_price ? form.compare_price : null,
        stock: form.stock ? Number(form.stock) : 0,
        is_featured: form.is_featured,
        video_url: form.video_url.trim(),
      });
      setProduct(updated);
      toast({ title: "Produit mis à jour", variant: "success" });
    } catch (err) {
      const message = isApiError(err) ? err.message : "Échec de la mise à jour";
      setFormError(message);
      toast({ title: "Erreur", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ready = await prepareProductImageFile(file);
      const image = await productsService.uploadSellerProductImage(productId, ready);
      setImages((prev) => [...prev, image]);
      toast({ title: "Image ajoutée", variant: "success" });
    } catch (err) {
      toast({
        title: "Photo non ajoutée",
        description: isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Échec de l'envoi de l'image. JPEG, PNG ou WebP, 5 Mo max.",
        variant: "error",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      await productsService.deleteSellerProductImage(productId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Image supprimée", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la suppression",
        variant: "error",
      });
    } finally {
      setDeletingImageId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !product || !form) {
    return (
      <ErrorState
        message={error ?? "Produit introuvable"}
        onRetry={() => void loadProduct()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">{product.name}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Modifier le produit et gérer ses images.
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[product.status]}>
          {STATUS_LABELS[product.status]}
        </Badge>
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
              value={categoryValue}
              onChange={(e) => setCategoryOverride(e.target.value)}
              placeholder="Sélectionner une catégorie"
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
                setForm((prev) =>
                  prev ? { ...prev, is_featured: checked === true } : prev
                )
              }
            />

            <Input
              label="Vidéo produit (Instagram ou TikTok)"
              type="url"
              placeholder="https://www.tiktok.com/@…/video/… ou Instagram Reels"
              value={form.video_url}
              onChange={handleField("video_url")}
              hint="Optionnel — affiché en popup sur la fiche produit."
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
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/seller/products")}
              >
                Retour
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Photos ({images.length}/{imageLimit})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-caption text-text-muted">
            JPEG, PNG ou WebP — max 5 Mo. Sur iPhone, la photo est convertie
            si besoin (évitez HEIC).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-[14px] border border-cr2 bg-surface-secondary dark:border-border"
              >
                <Image
                  src={resolveMediaUrl(image.image) ?? image.image}
                  alt={image.alt_text || product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => void handleDeleteImage(image.id)}
                  disabled={deletingImageId === image.id}
                  className="absolute right-1.5 top-1.5 rounded-md bg-dk/70 p-1.5 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 disabled:opacity-100"
                  aria-label="Supprimer l'image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              loading={uploading}
              disabled={atImageLimit}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {atImageLimit
                ? "Limite atteinte"
                : "Ajouter une photo depuis l'appareil"}
            </Button>
            {atImageLimit && (
              <p className="mt-2 text-caption text-text-muted">
                Passez à un plan supérieur pour plus de photos.{" "}
                <Link
                  href="/seller/subscription"
                  className="font-medium text-primary hover:underline"
                >
                  Voir les abonnements
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
