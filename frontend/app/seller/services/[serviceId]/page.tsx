"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

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
import { useCategories } from "@/features/categories/hooks/useCategories";
import * as servicesApi from "@/features/pro-services/api/services.api";
import type {
  ServiceImage,
  ServicePriceType,
  ServiceSeller,
} from "@/features/pro-services/types/service.types";
import { isApiError } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/features/products/utils/media";

interface FormState {
  name: string;
  description: string;
  price: string;
  price_type: ServicePriceType;
  duration: string;
  is_featured: boolean;
}

export default function SellerServiceDetailPage() {
  const params = useParams();
  const serviceId = String(params.serviceId);
  const router = useRouter();
  const { toast } = useToast();
  const { categories } = useCategories(undefined, { for: "service" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [service, setService] = useState<ServiceSeller | null>(null);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Aucune" },
      ...categories.flatMap((cat) => [
        { value: cat.id, label: cat.name },
        ...cat.children.map((child) => ({
          value: child.id,
          label: `— ${child.name}`,
        })),
      ]),
    ],
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

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      servicesApi.getSellerService(serviceId),
      servicesApi.listSellerServiceImages(serviceId),
    ])
      .then(([data, imageList]) => {
        if (cancelled) return;
        setService(data);
        setImages(imageList);
        setForm({
          name: data.name,
          description: data.description ?? "",
          price: data.price ?? "",
          price_type: data.price_type,
          duration: data.duration ?? "",
          is_featured: data.is_featured,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const categoryValue =
    categoryOverride ?? findCategoryId(service?.category?.slug);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await servicesApi.updateService(serviceId, {
        name: form.name,
        description: form.description,
        category_id: categoryValue || null,
        price: form.price_type === "QUOTE" ? null : form.price || null,
        price_type: form.price_type,
        duration: form.duration,
        is_featured: form.is_featured,
      });
      setService(updated);
      toast({ title: "Service mis à jour", variant: "success" });
    } catch (err) {
      const message = isApiError(err) ? err.message : "Échec de la mise à jour";
      setFormError(message);
      toast({ title: "Erreur", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      const published = await servicesApi.publishService(serviceId);
      setService(published);
      toast({ title: "Service publié", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Publication impossible",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    setBusy(true);
    try {
      const archived = await servicesApi.archiveService(serviceId);
      setService(archived);
      toast({ title: "Service archivé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Archivage impossible",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const image = await servicesApi.uploadSellerServiceImage(serviceId, file);
      setImages((prev) => [...prev, image]);
      toast({ title: "Image ajoutée", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Upload impossible",
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
      await servicesApi.deleteSellerServiceImage(serviceId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Image supprimée", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Suppression impossible",
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !service || !form) {
    return (
      <ErrorState
        message={error || "Service introuvable"}
        onRetry={() => router.refresh()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">{service.name}</h2>
          <Badge className="mt-2" variant="secondary">
            {service.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {service.status === "DRAFT" && (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void handlePublish()}
            >
              Publier
            </Button>
          )}
          {service.status !== "ARCHIVED" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void handleArchive()}
            >
              Archiver
            </Button>
          )}
          <Button variant="ghost" onClick={() => router.push("/seller/services")}>
            Retour
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modifier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              label="Nom"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-body-sm font-medium">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <Select
              label="Catégorie"
              value={categoryValue}
              onChange={(e) => setCategoryOverride(e.target.value)}
              options={categoryOptions}
            />
            <Select
              label="Type de prix"
              value={form.price_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  price_type: e.target.value as ServicePriceType,
                })
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
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            )}
            <Input
              label="Durée"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
            <Checkbox
              checked={form.is_featured}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_featured: Boolean(checked) })
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
            <Button type="submit" variant="primary" loading={saving}>
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images ({images.length}/8)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            variant="outline"
            disabled={uploading || images.length >= 8}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Envoi…" : "Ajouter une image"}
          </Button>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => {
              const src = resolveMediaUrl(img.image);
              return (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-secondary">
                  {src ? (
                    <Image src={src} alt={img.alt_text || ""} fill className="object-cover" />
                  ) : null}
                  <Button
                    variant="danger"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    disabled={deletingImageId === img.id}
                    onClick={() => void handleDeleteImage(img.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
