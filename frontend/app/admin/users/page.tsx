"use client";

import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import * as adminService from "@/features/admin/services/admin.service";
import type { AdminUser, UserRole } from "@/features/admin/types/admin.types";
import { isApiError } from "@/lib/api/errors";

const ROLE_OPTIONS: Array<UserRole | ""> = ["", "CLIENT", "SELLER", "ADMIN"];

export default function AdminUsersPage() {
  const { user: me } = useCurrentUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState({ role: "", search: "" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await adminService.getAdminUsers({
          role: applied.role || undefined,
          search: applied.search.trim() || undefined,
        });
        if (cancelled) return;
        setUsers(data.results);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const reload = useCallback(() => {
    setLoading(true);
    setApplied((prev) => ({ ...prev }));
  }, []);

  const patchUser = async (
    id: string,
    payload: Parameters<typeof adminService.updateAdminUser>[1],
    successMessage: string
  ) => {
    setBusyId(id);
    try {
      const updated = await adminService.updateAdminUser(id, payload);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      toast({ title: successMessage, variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de l'action",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Utilisateurs</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Consultez, activez ou désactivez les comptes de la plateforme.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-[160px]">
          <label className="mb-1.5 block text-body-sm font-medium">Rôle</label>
          <select
            className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role || "all"} value={role}>
                {role || "Tous"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Input
            label="Recherche"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, nom…"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            setApplied({ role: roleFilter, search: search.trim() });
          }}
        >
          Filtrer
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState icon={Users} title="Aucun utilisateur" />
      )}

      {!loading && !error && users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => {
            const isSelf = me?.id === user.id;
            const busy = busyId === user.id;
            return (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-body font-semibold">
                      {user.first_name} {user.last_name}
                      {isSelf ? " (vous)" : ""}
                    </p>
                    <p className="text-caption text-text-muted">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{user.role}</Badge>
                      <Badge variant={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.is_active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || isSelf}
                        onClick={() =>
                          void patchUser(
                            user.id,
                            { is_active: false },
                            "Compte désactivé"
                          )
                        }
                      >
                        Désactiver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy}
                        onClick={() =>
                          void patchUser(
                            user.id,
                            { is_active: true },
                            "Compte activé"
                          )
                        }
                      >
                        Activer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
