"use client";

import Image from "next/image";
import Link from "next/link";

import { formatServicePrice } from "../api/services.api";
import type { ServicePublic } from "../types/service.types";
import { LocationLabel } from "@/features/map/components/LocationLabel";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { cn } from "@/lib/utils";

export interface ServiceCardProps {
  service: ServicePublic;
  index?: number;
}

export function ServiceCard({ service, index = 0 }: ServiceCardProps) {
  const img = resolveMediaUrl(service.primary_image);
  const priceLabel = formatServicePrice(service.price, service.price_type);
  const city =
    service.professional.location?.city || service.professional.city_name;
  const neighborhood = service.professional.location?.neighborhood;

  return (
    <Link
      href={`/services/${service.id}`}
      className="group block motion-safe:animate-[fade-up_0.35s_ease_both]"
      style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
    >
      <article
        className={cn(
          "h-full overflow-hidden rounded-[18px] border border-cr2 bg-white transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-[0_8px_36px_rgba(0,0,0,0.15)]",
          "dark:border-border dark:bg-surface"
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
          {img ? (
            <Image
              src={img}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 via-dk/5 to-primary/10 text-caption text-text-muted">
              Service
            </div>
          )}
          {(service.is_boosted || service.sponsored_label) && (
            <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
              {service.sponsored_label || "Promu"}
            </span>
          )}
          {!service.is_boosted &&
            !service.sponsored_label &&
            service.is_featured && (
              <span className="absolute left-3 top-3 rounded-md bg-dk px-2 py-0.5 text-[10px] font-bold text-white">
                Mis en avant
              </span>
            )}
        </div>
        <div className="space-y-1.5 px-3.5 py-3">
          <p className="truncate text-caption text-text-muted">
            {service.professional.display_name}
          </p>
          <LocationLabel city={city} neighborhood={neighborhood || undefined} />
          <h2 className="font-display text-[15px] font-extrabold leading-snug text-text-primary transition-colors group-hover:text-primary">
            {service.name}
          </h2>
          {service.category && (
            <p className="text-caption text-text-secondary">
              {service.category.name}
            </p>
          )}
          <p className="text-body-sm font-semibold text-text-primary">
            <span>{priceLabel}</span>
            {service.price_type === "FIXED" && (
              <span className="font-normal text-caption text-text-muted">
                {" "}
                · Prix fixe
              </span>
            )}
            {service.duration ? (
              <span className="font-normal text-caption text-text-muted">
                {" "}
                · {service.duration}
              </span>
            ) : null}
          </p>
        </div>
      </article>
    </Link>
  );
}
