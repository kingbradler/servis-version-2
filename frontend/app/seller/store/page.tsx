"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCities } from "@/features/cities/hooks/useCities";
import {
  FillCoordinatesButton,
  formatCoordinate,
} from "@/features/map/components/FillCoordinatesButton";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { useSellerStore } from "@/features/stores/hooks/useSellerStore";
import * as storesService from "@/features/stores/services/stores.service";
import type {
  StoreCreatePayload,
  StoreSeller,
  StoreStatus,
  StoreUpdatePayload,
} from "@/features/stores/types/store.types";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

const STATUS_LABELS: Record<StoreStatus, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente d'approbation",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
};

const STATUS_VARIANTS: Record<
  StoreStatus,
  "warning" | "secondary" | "success" | "error"
> = {
  DRAFT: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "error",
};

interface FormState {
  name: string;
  description: string;
  city: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  postal_code: string;
  latitude: string;
  longitude: string;
}

function toFormState(store: StoreSeller | null): FormState {
  return {
    name: store?.name ?? "",
    description: store?.description ?? "",
    city: store?.city?.id ?? "",
    phone: store?.phone ?? "",
    whatsapp: store?.whatsapp ?? "",
    address: store?.address ?? "",
    neighborhood: store?.neighborhood ?? "",
    postal_code: store?.postal_code ?? "",
    latitude:
      store?.latitude != null && store.latitude !== ""
        ? String(store.latitude)
        : "",
    longitude:
      store?.longitude != null && store.longitude !== ""
        ? String(store.longitude)
        : "",
  };
}

function StoreForm({
  store,
  cityOptions,
  citiesLoading,
  onCreate,
  onUpdate,
  onStoreMediaUpdated,
}: {
  store: StoreSeller | null;
  cityOptions: { value: string; label: string }[];
  citiesLoading: boolean;
  onCreate: (payload: StoreCreatePayload) => Promise<StoreSeller>;
  onUpdate: (payload: StoreUpdatePayload) => Promise<StoreSeller>;
  onStoreMediaUpdated: (store: StoreSeller) => void;
}) {
  const { toast, toastError } = useToast();
  const [form, setForm] = useState<FormState>(() => toFormState(store));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"logo" | "banner" | null>(
    null
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleField =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (store) {
        await onUpdate({
          name: form.name,
          description: form.description,
          city_id: form.city || undefined,
          phone: form.phone,
          whatsapp: form.whatsapp,
          address: form.address,
          neighborhood: form.neighborhood,
          postal_code: form.postal_code,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
        });
        toast({ title: "Boutique mise à jour", variant: "success" });
      } else {
        await onCreate({
          name: form.name,
          description: form.description,
          city: form.city,
          phone: form.phone,
          whatsapp: form.whatsapp,
          address: form.address,
          neighborhood: form.neighborhood,
          postal_code: form.postal_code,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
        });
        toast({
          title: "Boutique créée",
          description: "Vous pouvez maintenant ajouter logo et bannière.",
          variant: "success",
        });
      }
    } catch (err) {
      const message = getUserFacingErrorMessage(
        err,
        "Impossible d'enregistrer la boutique."
      );
      setFormError(message);
      toastError(err, {
        title: "Enregistrement impossible",
        fallback: "Impossible d'enregistrer la boutique.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (kind: "logo" | "banner", file: File) => {
    if (!store) return;
    setUploadingKind(kind);
    try {
      const updated = await storesService.uploadSellerStoreMedia(kind, file);
      onStoreMediaUpdated(updated);
      toast({
        title: kind === "logo" ? "Logo mis à jour" : "Bannière mise à jour",
        variant: "success",
      });
    } catch (err) {
      toastError(err, {
        title: "Envoi impossible",
        fallback: "Impossible d'envoyer l'image.",
      });
    } finally {
      setUploadingKind(null);
      if (kind === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (kind === "banner" && bannerInputRef.current)
        bannerInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nom de la boutique"
              value={form.name}
              onChange={handleField("name")}
              required
            />
            <Select
              label="Ville"
              options={cityOptions}
              value={form.city}
              onChange={handleField("city")}
              placeholder={citiesLoading ? "Chargement…" : "Sélectionner une ville"}
              required
            />
            <Input label="Téléphone" value={form.phone} onChange={handleField("phone")} />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={handleField("whatsapp")}
            />
          </div>

          {store ? (
            <div className="space-y-3 rounded-[18px] border border-cr2 p-4 dark:border-border">
              <h3 className="text-body-sm font-semibold">Photos boutique</h3>
              <p className="text-caption text-text-muted">
                Choisissez une image depuis votre appareil (JPEG, PNG, WebP).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-caption font-medium">Logo</p>
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-cr2 bg-surface-secondary dark:border-border">
                    {store.logo ? (
                      <Image
                        src={resolveMediaUrl(store.logo) || store.logo}
                        alt="Logo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-caption text-text-muted">
                        —
                      </div>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleMediaUpload("logo", file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    loading={uploadingKind === "logo"}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Choisir un logo
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-caption font-medium">Bannière</p>
                  <div className="relative h-24 w-full overflow-hidden rounded-xl border border-cr2 bg-surface-secondary dark:border-border">
                    {store.banner ? (
                      <Image
                        src={resolveMediaUrl(store.banner) || store.banner}
                        alt="Bannière"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-caption text-text-muted">
                        —
                      </div>
                    )}
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleMediaUpload("banner", file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    loading={uploadingKind === "banner"}
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Choisir une bannière
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-caption text-text-muted">
              Après création, vous pourrez ajouter logo et bannière depuis
              votre appareil.
            </p>
          )}

          <div className="space-y-3 rounded-[18px] border border-cr2 p-4 dark:border-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-body-sm font-semibold">Localisation</h3>
                <p className="mt-1 text-caption text-text-muted">
                  Adresse publique optionnelle. Utilisez le GPS pour remplir
                  latitude / longitude, puis enregistrez.
                </p>
              </div>
              <FillCoordinatesButton
                onLocated={(coords) => {
                  setForm((prev) => ({
                    ...prev,
                    latitude: formatCoordinate(coords.latitude),
                    longitude: formatCoordinate(coords.longitude),
                  }));
                  toast({
                    title: "Position détectée",
                    description: "N’oubliez pas d’enregistrer la boutique.",
                    variant: "success",
                  });
                }}
              />
            </div>
            {!form.latitude || !form.longitude ? (
              <p className="rounded-xl bg-primary/8 px-3 py-2 text-caption text-text-secondary">
                Sans coordonnées, la boutique est moins visible sur la carte
                Explorer.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Adresse"
                value={form.address}
                onChange={handleField("address")}
                placeholder="12 Rue Mohammed V"
              />
              <Input
                label="Quartier"
                value={form.neighborhood}
                onChange={handleField("neighborhood")}
                placeholder="Centre-ville"
              />
              <Input
                label="Code postal"
                value={form.postal_code}
                onChange={handleField("postal_code")}
              />
              <div />
              <Input
                label="Latitude"
                value={form.latitude}
                onChange={handleField("latitude")}
                placeholder="33.573110"
                inputMode="decimal"
                readOnly
              />
              <Input
                label="Longitude"
                value={form.longitude}
                onChange={handleField("longitude")}
                placeholder="-7.589840"
                inputMode="decimal"
                readOnly
              />
            </div>
            {form.latitude && form.longitude ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: "",
                    longitude: "",
                  }))
                }
              >
                Effacer la position
              </Button>
            ) : null}
          </div>

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

          {formError && (
            <FormMessage
              variant="error"
              title="Vérifiez le formulaire"
              message={formError}
            />
          )}

          <Button type="submit" variant="primary" loading={saving}>
            {store ? "Enregistrer" : "Créer ma boutique"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SellerStorePage() {
  const { store, loading, error, refresh, create, update, submit } =
    useSellerStore({ autoLoad: true });
  const { cities, loading: citiesLoading } = useCities();
  const { toast, toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [mediaStore, setMediaStore] = useState<StoreSeller | null>(null);

  const displayStore =
    mediaStore && store && mediaStore.id === store.id ? mediaStore : store;

  const handleSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      await submit();
      toast({ title: "Boutique soumise pour approbation", variant: "success" });
    } catch (err) {
      toastError(err, {
        title: "Soumission impossible",
        fallback: "Impossible de soumettre la boutique.",
      });
    } finally {
      setSubmitting(false);
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

  const isNotFoundError =
    error != null &&
    (error.toLowerCase().includes("boutique") || error === "Pas de boutique");

  if (error && !isNotFoundError) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.region})`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Ma boutique</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {displayStore
              ? "Gérez les informations de votre boutique."
              : "Créez votre boutique pour commencer à vendre."}
          </p>
        </div>
        {displayStore && (
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANTS[displayStore.status]}>
              {STATUS_LABELS[displayStore.status]}
            </Badge>
            {displayStore.status === "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={() => void handleSubmitForApproval()}
              >
                Soumettre pour approbation
              </Button>
            )}
          </div>
        )}
      </div>

      <StoreForm
        key={displayStore?.updated_at || displayStore?.id || "new"}
        store={displayStore}
        cityOptions={cityOptions}
        citiesLoading={citiesLoading}
        onCreate={async (payload) => {
          const created = await create(payload);
          setMediaStore(created);
          return created;
        }}
        onUpdate={async (payload) => {
          const updated = await update(payload);
          setMediaStore(updated);
          return updated;
        }}
        onStoreMediaUpdated={(s) => {
          setMediaStore(s);
          void refresh();
        }}
      />
    </div>
  );
}
