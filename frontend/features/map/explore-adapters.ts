import type { MapMarker, MapMarkerKind } from "@/features/map/types";
import { formatServicePrice } from "@/features/pro-services/api/services.api";
import type { ServicePublic } from "@/features/pro-services/types/service.types";
import type { ProfessionalPublic } from "@/features/professionals/api/professionals.api";
import type { StorePublic } from "@/features/stores/types/store.types";

export type ExploreType = "all" | "stores" | "services" | "professionals";

export interface ExploreResult {
  id: string;
  kind: Exclude<MapMarkerKind, "user">;
  title: string;
  subtitle?: string;
  city?: string | null;
  distanceKm?: number | null;
  priceLabel?: string;
  href: string;
  latitude: number;
  longitude: number;
}

function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function storeToExploreResult(store: StorePublic): ExploreResult | null {
  const lat =
    toCoord(store.latitude) ?? toCoord(store.location?.latitude ?? null);
  const lng =
    toCoord(store.longitude) ?? toCoord(store.location?.longitude ?? null);
  if (lat == null || lng == null) return null;
  return {
    id: `store:${store.id}`,
    kind: "store",
    title: store.name,
    subtitle: store.description?.slice(0, 80) || undefined,
    city: store.location?.city || store.city?.name,
    distanceKm: store.distance_km ?? null,
    href: `/stores/${store.slug}`,
    latitude: lat,
    longitude: lng,
  };
}

export function serviceToExploreResult(
  service: ServicePublic
): ExploreResult | null {
  const lat =
    toCoord(service.professional.latitude) ??
    toCoord(service.professional.location?.latitude ?? null);
  const lng =
    toCoord(service.professional.longitude) ??
    toCoord(service.professional.location?.longitude ?? null);
  if (lat == null || lng == null) return null;
  return {
    id: `service:${service.id}`,
    kind: "service",
    title: service.name,
    subtitle: service.professional.display_name,
    city:
      service.professional.location?.city || service.professional.city_name,
    distanceKm: service.distance_km ?? null,
    priceLabel: formatServicePrice(service.price, service.price_type),
    href: `/services/${service.id}`,
    latitude: lat,
    longitude: lng,
  };
}

export function professionalToExploreResult(
  pro: ProfessionalPublic
): ExploreResult | null {
  const lat =
    toCoord(pro.latitude) ?? toCoord(pro.location?.latitude ?? null);
  const lng =
    toCoord(pro.longitude) ?? toCoord(pro.location?.longitude ?? null);
  if (lat == null || lng == null) return null;
  return {
    id: `professional:${pro.id}`,
    kind: "professional",
    title: pro.display_name,
    subtitle: pro.headline,
    city: pro.location?.city || pro.city?.name,
    distanceKm: pro.distance_km ?? null,
    href: `/professionals/${pro.slug}`,
    latitude: lat,
    longitude: lng,
  };
}

export function exploreResultToMarker(result: ExploreResult): MapMarker {
  return {
    id: result.id,
    kind: result.kind,
    coordinates: {
      latitude: result.latitude,
      longitude: result.longitude,
    },
    label: result.title,
    subtitle: result.subtitle,
    city: result.city,
    distanceKm: result.distanceKm,
    priceLabel: result.priceLabel,
    href: result.href,
  };
}

export function parseExploreType(value: string | null): ExploreType {
  if (
    value === "stores" ||
    value === "services" ||
    value === "professionals"
  ) {
    return value;
  }
  return "all";
}
