"use client";

import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  createHeroSlide,
  deleteHeroSlide,
  getAdminHeroSlides,
  updateHeroSlide,
  type HeroSlide,
} from "@/features/marketplace/services/hero-slides.service";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { isApiError } from "@/lib/api/errors";

interface FormState {
  title: string;
  highlight: string;
  subtitle: string;
  cta_href: string;
  cta_label: string;
  sort_order: string;
  is_active: boolean;
  image_url: string;
  imageFile: File | null;
}

const emptyForm: FormState = {
  title: "",
  highlight: "",
  subtitle: "",
  cta_href: "/products",
  cta_label: "Découvrir",
  sort_order: "0",
  is_active: true,
  image_url: "",
  imageFile: null,
};

export default function AdminHeroSlidesPage() {
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSlides(await getAdminHeroSlides());
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAdminHeroSlides()
      .then((data) => {
        if (!cancelled) setSlides(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur de chargement");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      sort_order: String(slides.length),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditing(slide);
    setForm({
      title: slide.title,
      highlight: slide.highlight,
      subtitle: slide.subtitle,
      cta_href: slide.cta_href,
      cta_label: slide.cta_label,
      sort_order: String(slide.sort_order),
      is_active: slide.is_active,
      image_url: "",
      imageFile: null,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("highlight", form.highlight.trim());
    fd.append("subtitle", form.subtitle.trim());
    fd.append("cta_href", form.cta_href.trim() || "/products");
    fd.append("cta_label", form.cta_label.trim() || "Découvrir");
    fd.append("sort_order", form.sort_order || "0");
    fd.append("is_active", form.is_active ? "true" : "false");
    if (form.imageFile) fd.append("image", form.imageFile);
    if (form.image_url.trim()) fd.append("image_url", form.image_url.trim());
    return fd;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Le titre est obligatoire.");
      return;
    }
    if (!editing && !form.imageFile && !form.image_url.trim()) {
      setFormError("Ajoutez une photo (fichier) ou une URL.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const fd = buildFormData();
      if (editing) {
        await updateHeroSlide(editing.id, fd);
        toast({ title: "Slide mis à jour", variant: "success" });
      } else {
        await createHeroSlide(fd);
        toast({ title: "Slide ajouté", variant: "success" });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (
      !window.confirm(
        `Supprimer le slide « ${slide.title} » ? Il disparaîtra de l'accueil.`
      )
    ) {
      return;
    }
    setDeletingId(slide.id);
    try {
      await deleteHeroSlide(slide.id);
      toast({ title: "Slide supprimé", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Suppression impossible",
        description: isApiError(err) ? err.message : "Erreur",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">
            Photos d&apos;accueil
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Gérez les images qui défilent sur la page d&apos;accueil (hero).
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter un slide
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && slides.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="Aucun slide"
          description="Ajoutez au moins une photo pour l'accueil."
          actionLabel="Ajouter un slide"
          onAction={openCreate}
        />
      )}

      {!loading && !error && slides.length > 0 && (
        <div className="space-y-3">
          {slides.map((slide) => {
            const img = resolveMediaUrl(slide.image) || slide.image;
            return (
              <Card key={slide.id}>
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-surface-secondary sm:w-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {slide.title}{" "}
                        <span className="text-primary">{slide.highlight}</span>
                      </p>
                      <Badge variant={slide.is_active ? "success" : "secondary"}>
                        {slide.is_active ? "Actif" : "Masqué"}
                      </Badge>
                      <span className="text-caption text-text-muted">
                        Ordre {slide.sort_order}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-body-sm text-text-secondary">
                      {slide.subtitle}
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      CTA : {slide.cta_label} → {slide.cta_href}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(slide)}
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deletingId === slide.id}
                      onClick={() => void handleDelete(slide)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent className="max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>
              {editing ? "Modifier le slide" : "Nouveau slide"}
            </ModalTitle>
          </ModalHeader>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <Input
              label="Titre"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <Input
              label="Surbrillance (ligne colorée)"
              value={form.highlight}
              onChange={(e) =>
                setForm((f) => ({ ...f, highlight: e.target.value }))
              }
            />
            <label className="block space-y-1.5">
              <span className="text-body-sm font-medium">Sous-titre</span>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Libellé du bouton"
                value={form.cta_label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_label: e.target.value }))
                }
              />
              <Input
                label="Lien du bouton"
                value={form.cta_href}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_href: e.target.value }))
                }
                placeholder="/products"
              />
            </div>
            <Input
              label="Ordre d'affichage"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) =>
                setForm((f) => ({ ...f, sort_order: e.target.value }))
              }
            />
            <label className="block space-y-1.5">
              <span className="text-body-sm font-medium">
                Photo {editing ? "(laisser vide pour garder l'actuelle)" : ""}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-body-sm"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    imageFile: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>
            <Input
              label="Ou URL d'image (optionnel)"
              value={form.image_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, image_url: e.target.value }))
              }
              placeholder="https://…"
            />
            {editing && (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(editing.image) || editing.image}
                  alt=""
                  className="max-h-40 w-full object-cover"
                />
              </div>
            )}
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, is_active: checked === true }))
              }
              label="Visible sur l'accueil"
            />
            {formError && (
              <p className="text-body-sm text-error">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
