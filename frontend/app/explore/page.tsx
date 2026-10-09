"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Search,
  Store,
  UserRound,
  Wrench,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AroundMeButton } from "@/features/map/components/AroundMeButton";
import { MapViewClient } from "@/features/map/components/MapViewClient";
import {
  exploreResultToMarker,
  parseExploreType,
  professionalToExploreResult,
  serviceToExploreResult,
  storeToExploreResult,
  type ExploreResult,
  type ExploreType,
} from "@/features/map/explore-adapters";
import { formatDistanceKm } from "@/features/map/format-distance";
import { DEFAULT_NEARBY_RADIUS_KM } from "@/features/map/geolocation";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  type GeoCoordinates,
} from "@/features/map/types";
import { getPublicProfessionals } from "@/features/professionals/api/professionals.api";
import { getPublicServices } from "@/features/pro-services/api/services.api";
import { getPublicStores } from "@/features/stores/services/stores.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

const TYPE_TABS: {
  value: ExploreType;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { value: "all", label: "Tout", icon: LayoutGrid },
  { value: "stores", label: "Boutiques", icon: Store },
  { value: "services", label: "Services", icon: Wrench },
  { value: "professionals", label: "Professionnels", icon: UserRound },
];

const KIND_LABEL: Record<ExploreResult["kind"], string> = {
  store: "Boutique",
  service: "Service",
  professional: "Pro",
};

function buildExploreHref(params: {
  type?: ExploreType;
  search?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}): string {
  const q = new URLSearchParams();
  if (params.type && params.type !== "all") q.set("type", params.type);
  if (params.search) q.set("search", params.search);
  if (params.latitude != null) q.set("latitude", String(params.latitude));
  if (params.longitude != null) q.set("longitude", String(params.longitude));
  if (params.radius != null) q.set("radius", String(params.radius));
  const qs = q.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

function ExploreResultsList({
  loading,
  error,
  results,
  selectedId,
  onSelect,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  results: ExploreResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const router = useRouter();
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="Rien autour de vous pour l'instant"
          description="La carte se remplira dès que des boutiques et des pros publieront. En attendant, ouvrez la vôtre."
          actionLabel="Vendre sur SERVIS"
          onAction={() => router.push("/register")}
        />
      </div>
    );
  }
  return (
    <>
      {results.map((item, index) => {
        const distance = formatDistanceKm(item.distanceKm);
        const selected = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full flex-col gap-1 border-b border-cr2 px-4 py-3.5 text-left transition-all duration-200 dark:border-border",
              "motion-safe:animate-[fade-up_0.3s_ease_both]",
              selected
                ? "bg-primary/[0.06] shadow-[inset_3px_0_0_0_var(--primary)]"
                : "hover:bg-surface-secondary/80"
            )}
            style={{
              animationDelay: `${Math.min(index * 40, 280)}ms`,
            }}
          >
            <span
              className={cn(
                "w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                item.kind === "store"
                  ? "bg-primary/10 text-primary"
                  : item.kind === "service"
                    ? "bg-o2/15 text-[#c44a1a]"
                    : "bg-dk/8 text-text-primary"
              )}
            >
              {KIND_LABEL[item.kind]}
            </span>
            <span className="font-display text-[15px] font-extrabold leading-snug text-text-primary">
              {item.title}
            </span>
            {item.subtitle && (
              <span className="line-clamp-1 text-caption text-text-secondary">
                {item.subtitle}
              </span>
            )}
            <span className="text-caption text-text-muted">
              {[item.city, distance].filter(Boolean).join(" · ")}
            </span>
            {item.priceLabel && (
              <span className="text-caption font-medium text-text-primary">
                {item.priceLabel}
              </span>
            )}
            <Link
              href={item.href}
              className="mt-1 text-caption font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Ouvrir →
            </Link>
          </button>
        );
      })}
    </>
  );
}

function ExplorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = parseExploreType(searchParams.get("type"));
  const urlSearch = searchParams.get("search") ?? "";
  const urlLat = searchParams.get("latitude");
  const urlLng = searchParams.get("longitude");
  const urlRadius = searchParams.get("radius");

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const userLocation = useMemo<GeoCoordinates | null>(() => {
    if (!urlLat || !urlLng) return null;
    const latitude = Number(urlLat);
    const longitude = Number(urlLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }, [urlLat, urlLng]);

  const radius = urlRadius ? Number(urlRadius) : DEFAULT_NEARBY_RADIUS_KM;

  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);

  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    const current = urlSearch || undefined;
    if (next === current) return;
    router.replace(
      buildExploreHref({
        type,
        search: next,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        radius: userLocation ? radius : undefined,
      }),
      { scroll: false }
    );
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const geoParams = userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius,
            ordering: "distance" as const,
          }
        : { ordering: "-created_at" as const };

      const search = urlSearch.trim() || undefined;
      const page_size = 40;

      const tasks: Promise<ExploreResult[]>[] = [];

      if (type === "all" || type === "stores") {
        tasks.push(
          getPublicStores({
            search,
            page_size,
            ...geoParams,
          }).then((data) => {
            const list = Array.isArray(data) ? data : data.results;
            return list
              .map(storeToExploreResult)
              .filter((x): x is ExploreResult => x != null);
          })
        );
      }
      if (type === "all" || type === "services") {
        tasks.push(
          getPublicServices({
            search,
            page_size,
            ...geoParams,
          }).then((data) => {
            const list = Array.isArray(data) ? data : data.results;
            return list
              .map(serviceToExploreResult)
              .filter((x): x is ExploreResult => x != null);
          })
        );
      }
      if (type === "all" || type === "professionals") {
        tasks.push(
          getPublicProfessionals({
            search,
            page_size,
            ...geoParams,
          }).then((data) => {
            const list = Array.isArray(data) ? data : data.results;
            return list
              .map(professionalToExploreResult)
              .filter((x): x is ExploreResult => x != null);
          })
        );
      }

      const chunks = await Promise.all(tasks);
      let merged = chunks.flat();
      if (userLocation) {
        merged = [...merged].sort(
          (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)
        );
      }
      setResults(merged);
      setSelectedId((prev) =>
        prev && merged.some((r) => r.id === prev) ? prev : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type, urlSearch, userLocation, radius]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    void load();
  }, [load]);

  const markers = useMemo(
    () => results.map(exploreResultToMarker),
    [results]
  );

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    if (results[0]) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }
    return DEFAULT_MAP_CENTER;
  }, [userLocation, results]);

  const setType = (next: ExploreType) => {
    router.push(
      buildExploreHref({
        type: next,
        search: urlSearch || undefined,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        radius: userLocation ? radius : undefined,
      })
    );
  };

  const resultCountLabel = loading
    ? "Chargement…"
    : `${results.length} résultat${results.length > 1 ? "s" : ""}`;

  return (
    <MarketplaceShell hideFooter hideBanner fillViewport>
      <div className="relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden bg-cr">
        {/* Full-bleed map — fills space under the navbar */}
        <div className="absolute inset-0">
          <MapViewClient
            className="servis-map-explore h-full min-h-0 max-w-full overflow-hidden rounded-none"
            markers={markers}
            userLocation={userLocation}
            center={mapCenter}
            zoom={userLocation ? 13 : results.length ? 12 : DEFAULT_MAP_ZOOM}
            selectedId={selectedId}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            navigationPosition="bottom-right"
            onMarkerClick={(marker) => {
              setSelectedId(marker.id);
              setListOpen(true);
            }}
          />
        </div>

        {/* Top controls overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 min-w-0 max-w-full p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-4 lg:p-5">
          <div className="pointer-events-auto mx-auto flex min-w-0 max-w-[1200px] flex-col gap-2.5">
            <div className="flex min-w-0 flex-col gap-2 rounded-[18px] border border-black/8 bg-white/92 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-dk/88 sm:flex-row sm:items-center sm:p-3.5">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted dark:text-white/35" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher une boutique, un service ou un pro…"
                  aria-label="Rechercher"
                  className="h-11 w-full min-w-0 rounded-xl border-[1.5px] border-border bg-white pl-10 pr-4 text-body-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary dark:border-white/11 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30"
                />
              </div>
              <AroundMeButton
                className="min-w-0 shrink-0 [&_button]:rounded-xl"
                onLocated={(coords, radiusKm) => {
                  setGeoError(null);
                  router.push(
                    buildExploreHref({
                      type,
                      search: urlSearch || undefined,
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      radius: radiusKm,
                    })
                  );
                }}
              />
            </div>
            {geoError && (
              <p className="max-w-full break-words text-caption text-error" role="alert">
                {geoError}
              </p>
            )}
            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide">
              <div className="flex w-max gap-2">
              {TYPE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = type === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setType(tab.value)}
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-medium shadow-sm transition-all",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white/90 text-text-secondary backdrop-blur-md hover:border-primary hover:text-primary dark:border-white/15 dark:bg-dk/80 dark:text-white/70 dark:hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        {/* Results overlay — bottom sheet mobile / left panel desktop */}
        <aside
          className={cn(
            "pointer-events-none absolute z-10 flex min-w-0 max-w-full",
            "inset-x-0 bottom-0 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-[158px] lg:w-[360px]"
          )}
        >
          <div
            className={cn(
              "pointer-events-auto flex w-full min-w-0 flex-col overflow-hidden border border-black/8 bg-white/96 shadow-[0_16px_48px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-dk2/96",
              "rounded-t-[22px] border-b-0 lg:rounded-[18px] lg:border-b",
              listOpen
                ? "h-[min(42dvh,380px)] min-h-[220px] lg:h-auto lg:min-h-0 lg:max-h-full"
                : "h-16 lg:h-auto lg:min-h-0 lg:max-h-full"
            )}
          >
            <button
              type="button"
              className="flex w-full shrink-0 items-center justify-between border-b border-cr2 px-4 py-3.5 dark:border-white/10 lg:cursor-default"
              onClick={() => setListOpen((v) => !v)}
              aria-expanded={listOpen}
            >
              <div className="text-left">
                <h2 className="font-display text-[15px] font-extrabold text-text-primary">
                  Résultats
                </h2>
                <p className="text-[12px] text-text-muted lg:text-[13px]">
                  {resultCountLabel}
                </p>
              </div>
              <span className="lg:hidden">
                {listOpen ? (
                  <ChevronDown className="h-5 w-5 text-text-muted" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-text-muted" />
                )}
              </span>
            </button>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                !listOpen && "hidden lg:block"
              )}
            >
              <ExploreResultsList
                loading={loading}
                error={error}
                results={results}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRetry={() => void load()}
              />
            </div>
          </div>
        </aside>
      </div>
    </MarketplaceShell>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <MarketplaceShell hideFooter hideBanner fillViewport>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-cr">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        </MarketplaceShell>
      }
    >
      <ExplorePageInner />
    </Suspense>
  );
}
