"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  CLIENT_AREA_ROLES,
  getRoleLabel,
} from "@/features/auth/lib/roles";
import * as authService from "@/features/auth/services/auth.service";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { clientNav } from "@/features/dashboard/nav";
import { isApiError } from "@/lib/api/errors";

function ProfileForm({
  user,
  onSaved,
}: {
  user: AuthUser;
  onSaved: () => Promise<AuthUser | null>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
    avatar: user.avatar ?? "",
  });

  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    user.email.slice(0, 2).toUpperCase();

  const onChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateMe({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        avatar: form.avatar.trim(),
      });
      setForm({
        first_name: updated.first_name ?? "",
        last_name: updated.last_name ?? "",
        phone: updated.phone ?? "",
        avatar: updated.avatar ?? "",
      });
      await onSaved();
      toast({ title: "Profil mis à jour", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la mise à jour",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar size="lg">
          {form.avatar ? <AvatarImage src={form.avatar} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>
            {user.first_name} {user.last_name}
          </CardTitle>
          <p className="text-body-sm text-text-secondary">{user.email}</p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prénom"
              value={form.first_name}
              onChange={onChange("first_name")}
              required
            />
            <Input
              label="Nom"
              value={form.last_name}
              onChange={onChange("last_name")}
              required
            />
          </div>
          <Input label="Email" value={user.email} disabled />
          <Input
            label="WhatsApp"
            value={form.phone}
            onChange={onChange("phone")}
            placeholder="+212 6 XX XX XX XX"
            hint="Utilisé pour les confirmations de commande (ex. +212612345678)"
          />
          <Input
            label="Avatar (URL)"
            value={form.avatar}
            onChange={onChange("avatar")}
            placeholder="https://…"
          />
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <span className="text-body-sm text-text-secondary">
              Email vérifié
            </span>
            <Badge variant={user.is_verified ? "success" : "warning"}>
              {user.is_verified ? "Vérifié" : "Non vérifié"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-body-sm text-text-secondary">Rôle</span>
            <span className="text-body-sm font-medium">
              {getRoleLabel(user.role)}
            </span>
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfileContent() {
  const { user, loading, refresh } = useCurrentUser();
  const shellTitle = user?.role === "SELLER" ? "Mes achats" : "Client";

  return (
    <DashboardShell title={shellTitle} items={clientNav}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-heading-l font-bold tracking-tight">Mon profil</h2>
        <p className="text-body-sm text-text-secondary">
          Informations du compte — distinctes de la boutique et du profil
          professionnel.
        </p>
        {loading && <Skeleton className="h-64 w-full rounded-xl" />}
        {!loading && user && (
          <>
            <ProfileForm
              key={user.updated_at || user.id}
              user={user}
              onSaved={refresh}
            />
            {user.role === "SELLER" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-heading-s">
                    Activité professionnelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/seller/store">Ma boutique</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/seller/professional">
                      Mon profil professionnel
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/seller">Espace professionnel</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <ProfileContent />
    </RequireAuth>
  );
}
