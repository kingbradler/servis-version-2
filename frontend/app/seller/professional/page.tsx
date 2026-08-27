"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCities } from "@/features/cities/hooks/useCities";
import {
  FillCoordinatesButton,
  formatCoordinate,
} from "@/features/map/components/FillCoordinatesButton";
import { useSellerProfessional } from "@/features/professionals/hooks/useSellerProfessional";
import type {
  ProfessionalCreatePayload,
  ProfessionalSeller,
  ProfessionalUpdatePayload,
} from "@/features/professionals/api/seller-professional.api";
import { isApiError } from "@/lib/api/errors";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente d'approbation",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

interface FormState {
  display_name: string;
  headline: string;
  bio: string;
  city: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  latitude: string;
  longitude: string;
  instagram_url: string;
  tiktok_url: string;
  facebook_url: string;
}

function toForm(profile: ProfessionalSeller | null): FormState {
  return {
    display_name: profile?.display_name ?? "",
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    city: profile?.city?.id ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
    address: profile?.address ?? "",
    neighborhood: profile?.neighborhood ?? "",
    latitude:
      profile?.latitude != null && profile.latitude !== ""
        ? String(profile.latitude)
        : "",
    longitude:
      profile?.longitude != null && profile.longitude !== ""
        ? String(profile.longitude)
        : "",
    instagram_url: profile?.instagram_url ?? "",
    tiktok_url: profile?.tiktok_url ?? "",
    facebook_url: profile?.facebook_url ?? "",
  };
}

function ProfessionalForm({
  profile,
  cityOptions,
  citiesLoading,
  onCreate,
  onUpdate,
  onSubmitReview,
}: {
  profile: ProfessionalSeller | null;
  cityOptions: { value: string; label: string }[];
  citiesLoading: boolean;
  onCreate: (payload: ProfessionalCreatePayload) => Promise<ProfessionalSeller>;
  onUpdate: (payload: ProfessionalUpdatePayload) => Promise<ProfessionalSeller>;
  onSubmitReview: () => Promise<ProfessionalSeller>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasCoords = Boolean(form.latitude && form.longitude);

  const handleField =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      display_name: form.display_name.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      city: form.city,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim(),
      latitude: form.latitude.trim() || null,
      longitude: form.longitude.trim() || null,
      instagram_url: form.instagram_url.trim(),
      tiktok_url: form.tiktok_url.trim(),
      facebook_url: form.facebook_url.trim(),
    };
    try {
      if (profile) {
        await onUpdate(payload);
        toast({ title: "Profil mis à jour", variant: "success" });
      } else {
        await onCreate(payload);
        toast({ title: "Profil créé", variant: "success" });
      }
    } catch (err) {
      setFormError(isApiError(err) ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    setSaving(true);
    try {
      await onSubmitReview();
      toast({ title: "Profil soumis pour validation", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Soumission impossible",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          {profile
            ? "Mon profil professionnel"
            : "Créer mon profil professionnel"}
        </CardTitle>
        {profile && (
          <Badge variant="secondary">
            {STATUS_LABELS[profile.status] || profile.status}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => void handleSave(e)}>
          <Input
            label="Nom affiché"
            required
            value={form.display_name}
            onChange={handleField("display_name")}
          />
          <Input
            label="Métier / titre"
            required
            value={form.headline}
            onChange={handleField("headline")}
            placeholder="Ex. Plombier"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pro-bio" className="text-body-sm font-medium">
              Bio
            </label>
            <textarea
              id="pro-bio"
              rows={4}
              value={form.bio}
              onChange={handleField("bio")}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body"
            />
          </div>
          <Select
            label="Ville"
            required
            value={form.city}
            onChange={handleField("city")}
            disabled={citiesLoading}
            options={cityOptions}
            placeholder={
              citiesLoading ? "Chargement…" : "Sélectionner une ville"
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Téléphone"
              value={form.phone}
              onChange={handleField("phone")}
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={handleField("whatsapp")}
            />
          </div>
          <Input
            label="Adresse"
            value={form.address}
            onChange={handleField("address")}
          />
          <Input
            label="Quartier"
            value={form.neighborhood}
            onChange={handleField("neighborhood")}
          />

          <div className="space-y-3 rounded-[18px] border border-cr2 p-4 dark:border-border">
            <h3 className="text-body-sm font-semibold">Réseaux sociaux</h3>
            <p className="text-caption text-text-muted">
              Liens publics affichés sur votre profil (Instagram, TikTok,
              Facebook).
            </p>
            <Input
              label="Instagram"
              value={form.instagram_url}
              onChange={handleField("instagram_url")}
              placeholder="https://instagram.com/votrecompte"
            />
            <Input
              label="TikTok"
              value={form.tiktok_url}
              onChange={handleField("tiktok_url")}
              placeholder="https://tiktok.com/@votrecompte"
            />
            <Input
              label="Facebook"
              value={form.facebook_url}
              onChange={handleField("facebook_url")}
              placeholder="https://facebook.com/votrepage"
            />
          </div>

          <div className="space-y-3 rounded-[18px] border border-cr2 p-4 dark:border-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-body-sm font-semibold">
                  Position sur la carte
                </h3>
                <p className="mt-1 text-caption text-text-muted">
                  Un clic remplit latitude et longitude via le GPS. Enregistrez
                  ensuite le profil pour publier votre position.
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
                    description: "N’oubliez pas d’enregistrer le profil.",
                    variant: "success",
                  });
                }}
              />
            </div>
            {!hasCoords && (
              <p className="rounded-xl bg-primary/8 px-3 py-2 text-caption text-text-secondary">
                Sans coordonnées, vos services n’apparaissent pas correctement
                sur la carte Explorer.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Latitude"
                value={form.latitude}
                onChange={handleField("latitude")}
                placeholder="35.759500"
                inputMode="decimal"
                readOnly
              />
              <Input
                label="Longitude"
                value={form.longitude}
                onChange={handleField("longitude")}
                placeholder="-5.834000"
                inputMode="decimal"
                readOnly
              />
            </div>
            {hasCoords && (
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
            )}
          </div>

          {formError && (
            <p className="text-body-sm text-error" role="alert">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="rounded-xl"
            >
              {profile ? "Enregistrer" : "Créer le profil"}
            </Button>
            {profile?.status === "DRAFT" && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                loading={saving}
                onClick={() => void handleSubmitReview()}
              >
                Soumettre pour validation
              </Button>
            )}
            {profile && (
              <Button asChild variant="ghost" className="rounded-xl">
                <Link href="/seller/services">Mes services</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SellerProfessionalPage() {
  const { cities, loading: citiesLoading } = useCities();
  const {
    profile,
    loading,
    error,
    missing,
    refresh,
    create,
    update,
    submit,
  } = useSellerProfessional();

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
          Profil professionnel
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Requis pour publier des services. Indépendant de votre boutique.
        </p>
      </div>

      {loading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!loading && error && !missing && (
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && (missing || profile || !error) && (
        <ProfessionalForm
          key={profile?.updated_at || profile?.id || "new"}
          profile={profile}
          cityOptions={cityOptions}
          citiesLoading={citiesLoading}
          onCreate={create}
          onUpdate={update}
          onSubmitReview={submit}
        />
      )}
    </div>
  );
}
