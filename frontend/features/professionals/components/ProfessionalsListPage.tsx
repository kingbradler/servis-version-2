"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";

import { PageHero } from "@/components/brand/PageHero";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { AroundMeButton } from "@/features/map/components/AroundMeButton";
import { usePublicProfessionals } from "@/features/professionals/hooks/usePublicProfessionals";
import type { PublicProfessionalFilters } from "@/features/professionals/api/professionals.api";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function ProfessionalsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [geo, setGeo] = useState<Pick<
    PublicProfessionalFilters,
    "latitude" | "longitude" | "radius" | "ordering"
  > | null>(null);
  const debounced = useDebouncedValue(search, 350);
  const { professionals, loading, error, refresh } = usePublicProfessionals({
    search: debounced.trim() || undefined,
    ordering: geo?.ordering ?? "-created_at",
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    radius: geo?.radius,
  });

  return (
    <MarketplaceShell>
      <div className="mx-auto w-full min-w-0 max-w-[1200px] overflow-x-clip px-3 py-5 sm:px-6 sm:py-10 lg:px-12">
        <PageHero
          tone="dark"
          eyebrow="Professionnels"
          title="Tous les professionnels"
          description="Trouvez un prestataire près de chez vous — plomberie, cours, beauté, réparations."
        >
          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un professionnel…"
              className="h-12 w-full rounded-xl border-[1.5px] border-white/11 bg-white/8 pl-10 pr-4 text-body-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary"
            />
          </div>
          <div className="mt-4 flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <AroundMeButton
              className="[&_button]:rounded-xl [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/15 [&_button]:hover:text-white [&_p]:text-red-300"
              onLocated={(coords, radiusKm) =>
                setGeo({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  radius: radiusKm,
                  ordering: "distance",
                })
              }
            />
            <Link
              href="/explore?type=professionals"
              className="inline-flex min-w-0 items-center gap-1.5 text-body-sm font-medium text-white/70 transition-colors hover:text-primary"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Explorer sur la carte
            </Link>
            <Link
              href="/services"
              className="inline-flex min-w-0 items-center gap-1.5 text-body-sm font-medium text-white/70 transition-colors hover:text-primary"
            >
              Voir les services
            </Link>
          </div>
        </PageHero>

        {!loading && !error && professionals.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-[19px] font-extrabold text-text-primary">
              Prestataires actifs
            </h2>
            <span className="text-[13px] text-text-muted">
              {professionals.length} résultat
              {professionals.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {loading && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && professionals.length === 0 && (
          <EmptyState
            title={
              search.trim()
                ? "Aucun professionnel trouvé"
                : "Pas encore de professionnel"
            }
            description={
              search.trim()
                ? "Essayez un autre nom ou une autre ville."
                : "Proposez vos services aux étudiants et aux habitants près de chez vous."
            }
            actionLabel={
              search.trim() ? "Effacer la recherche" : "Devenir professionnel"
            }
            onAction={() =>
              search.trim() ? setSearch("") : router.push("/register")
            }
          />
        )}

        {!loading && !error && professionals.length > 0 && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((pro, i) => (
              <ProfessionalCard
                key={pro.id}
                index={i}
                displayName={pro.display_name}
                slug={pro.slug}
                headline={pro.headline}
                city={pro.location?.city || pro.city?.name}
                neighborhood={pro.neighborhood || pro.location?.neighborhood}
                avatarUrl={resolveMediaUrl(pro.avatar)}
                distanceKm={pro.distance_km}
              />
            ))}
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
