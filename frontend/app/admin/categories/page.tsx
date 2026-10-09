"use client";

import { FolderTree, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminCategory } from "@/features/admin/types/admin.types";
import { isApiError } from "@/lib/api/errors";
import { unwrapList } from "@/lib/utils";

interface FormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: string;
  order: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  parent: "",
  order: "0",
  is_active: true,
};

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminCategories();
      setCategories(unwrapList(data));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminService
      .getAdminCategories()
      .then((data) => {
        if (!cancelled) setCategories(unwrapList(data));
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
  }, []);

  const parentOptions = useMemo(
    () =>
      categories
        .filter((c) => !editing || c.id !== editing.id)
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, editing]
  );

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon: category.icon ?? "",
      parent: category.parent ?? "",
      order: String(category.order ?? 0),
      is_active: category.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      icon: form.icon,
      parent: form.parent || null,
      order: form.order ? Number(form.order) : 0,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const updated = await adminService.updateAdminCategory(editing.id, payload);
        setCategories((prev) =>
          prev.map((c) => (c.id === editing.id ? updated : c))
        );
        toast({ title: "Catégorie mise à jour", variant: "success" });
      } else {
        const created = await adminService.createAdminCategory(payload);
        setCategories((prev) => [...prev, created]);
        toast({ title: "Catégorie créée", variant: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      const message = isApiError(err) ? err.message : "Échec de l'enregistrement";
      setFormError(message);
      toast({ title: "Erreur", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category: AdminCategory) => {
    try {
      const updated = await adminService.updateAdminCategory(category.id, {
        is_active: !category.is_active,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? updated : c))
      );
      toast({
        title: updated.is_active ? "Catégorie activée" : "Catégorie désactivée",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la mise à jour",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Catégories</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Gérez l&apos;arborescence des catégories du catalogue.
          </p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && categories.length === 0 && (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          actionLabel="Créer une catégorie"
          onAction={openCreate}
        />
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words font-medium">{category.name}</p>
                    <Badge variant={category.is_active ? "success" : "error"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-caption text-text-muted">
                    {category.slug}
                    {category.parent ? ` · Parent : ${categoryName(category.parent)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleToggleActive(category)}
                  >
                    {category.is_active ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Slug (optionnel)"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              hint="Laissez vide pour générer automatiquement."
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-text-primary">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text-primary transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Icône"
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
              />
              <Input
                label="Ordre"
                type="number"
                value={form.order}
                onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
              />
            </div>
            <Select
              label="Catégorie parente (optionnel)"
              options={parentOptions}
              value={form.parent}
              onChange={(e) => setForm((prev) => ({ ...prev, parent: e.target.value }))}
              placeholder="Aucune (catégorie racine)"
            />
            <Checkbox
              label="Active"
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_active: checked === true }))
              }
            />

            {formError && <p className="text-body-sm text-error">{formError}</p>}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>
                {editing ? "Enregistrer" : "Créer"}
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
