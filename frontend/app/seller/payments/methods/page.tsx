"use client";

import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
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
import { useSellerPaymentMethods } from "@/features/payments/hooks/useSellerPaymentMethods";
import type {
  PaymentMethod,
  PaymentMethodCreatePayload,
  PaymentMethodType,
} from "@/features/payments/types/payment.types";
import { isApiError } from "@/lib/api/errors";

const TYPE_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces" },
  { value: "OTHER", label: "Autre" },
];

interface FormState {
  type: PaymentMethodType;
  label: string;
  account_name: string;
  account_number: string;
  instructions: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  type: "MOBILE_MONEY",
  label: "",
  account_name: "",
  account_number: "",
  instructions: "",
  is_active: true,
};

export default function SellerPaymentMethodsPage() {
  const { methods, loading, error, refresh, create, update, remove } =
    useSellerPaymentMethods();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditing(method);
    setForm({
      type: method.type,
      label: method.label,
      account_name: method.account_name,
      account_number: method.account_number,
      instructions: method.instructions,
      is_active: method.is_active ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleField =
    (field: keyof Omit<FormState, "is_active" | "type">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const payload: PaymentMethodCreatePayload = {
      type: form.type,
      label: form.label,
      account_name: form.account_name,
      account_number: form.account_number,
      instructions: form.instructions,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast({ title: "Moyen de paiement mis à jour", variant: "success" });
      } else {
        await create(payload);
        toast({ title: "Moyen de paiement créé", variant: "success" });
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await remove(id);
      toast({ title: "Moyen de paiement supprimé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la suppression",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">
            Moyens de paiement
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Configurez les moyens de paiement proposés à vos clients.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void refresh()} />
      )}

      {!loading && !error && methods.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="Aucun moyen de paiement"
          description="Ajoutez un moyen de paiement pour permettre à vos clients de payer."
          actionLabel="Ajouter un moyen de paiement"
          onAction={openCreate}
        />
      )}

      {!loading && !error && methods.length > 0 && (
        <div className="space-y-3">
          {methods.map((method) => (
            <Card key={method.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{method.label}</p>
                    <Badge variant="secondary">
                      {TYPE_OPTIONS.find((t) => t.value === method.type)?.label}
                    </Badge>
                    {method.is_active === false && (
                      <Badge variant="error">Inactif</Badge>
                    )}
                  </div>
                  <p className="text-caption text-text-muted">
                    {method.account_name}
                    {method.account_number ? ` · ${method.account_number}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(method)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={deletingId === method.id}
                    onClick={() => void handleDelete(method.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
              {editing ? "Modifier le moyen de paiement" : "Nouveau moyen de paiement"}
            </ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as PaymentMethodType,
                }))
              }
            />
            <Input
              label="Nom affiché"
              value={form.label}
              onChange={handleField("label")}
              required
            />
            <Input
              label="Nom du titulaire"
              value={form.account_name}
              onChange={handleField("account_name")}
              required
            />
            <Input
              label="Numéro de compte"
              value={form.account_number}
              onChange={handleField("account_number")}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-text-primary">
                Instructions
              </label>
              <textarea
                value={form.instructions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, instructions: e.target.value }))
                }
                rows={3}
                className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text-primary transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            <Checkbox
              label="Actif"
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
