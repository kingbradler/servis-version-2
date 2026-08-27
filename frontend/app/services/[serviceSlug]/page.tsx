"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Phone } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { formatServicePrice } from "@/features/pro-services/api/services.api";
import { ServiceRequestForm } from "@/features/pro-services/components/ServiceRequestForm";
import { usePublicService } from "@/features/pro-services/hooks/usePublicServices";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { cn } from "@/lib/utils";

export default function PublicServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = String(params.serviceSlug);
  const { service, loading, error, refresh } = usePublicService(serviceId);
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {loading && <LoadingState message="Chargement du service…" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => void refresh()} />
        )}

        {!loading && !error && !service && (
          <EmptyState
            title="Service introuvable"
            description="Ce service n'existe pas ou n'est plus visible."
            actionLabel="Voir les services"
            onAction={() => router.push("/services")}
          />
        )}

        {!loading && service && (
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-cr2 bg-primary/10 dark:border-border">
                {service.images[activeIdx] ? (
                  <Image
                    src={resolveMediaUrl(service.images[activeIdx].image) || ""}
                    alt={service.images[activeIdx].alt_text || service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-caption text-text-muted">
                    Pas d&apos;image
                  </div>
                )}
                {(service.is_boosted || service.sponsored_label) && (
                  <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    {service.sponsored_label || "Promu"}
                  </span>
                )}
              </div>
              {service.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {service.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={cn(
                        "relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border-[1.5px] transition-all",
                        idx === activeIdx
                          ? "border-primary shadow-[0_0_0_1px_var(--primary)]"
                          : "border-cr2 hover:border-primary/40 dark:border-border"
                      )}
                    >
                      <Image
                        src={resolveMediaUrl(img.image) || ""}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5 lg:sticky lg:top-[88px]">
              <div>
                <Link
                  href={`/professionals/${service.professional.slug}`}
                  className="text-caption font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
                >
                  {service.professional.display_name}
                </Link>
                <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                  {service.name}
                </h1>
                <p className="mt-3 font-display text-[28px] font-extrabold text-text-primary">
                  {formatServicePrice(service.price, service.price_type)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {service.category && (
                  <Badge variant="secondary">{service.category.name}</Badge>
                )}
                {service.duration && (
                  <Badge variant="secondary">{service.duration}</Badge>
                )}
                {service.professional.city_name && (
                  <Badge variant="secondary">
                    {service.professional.city_name}
                  </Badge>
                )}
              </div>

              {service.description && (
                <p className="whitespace-pre-wrap text-body leading-relaxed text-text-secondary">
                  {service.description}
                </p>
              )}

              <div className="rounded-[18px] border border-cr2 bg-white p-4 dark:border-border dark:bg-surface">
                <p className="font-display text-[15px] font-extrabold text-text-primary">
                  {service.professional.display_name}
                </p>
                <p className="mt-0.5 text-caption text-text-muted">
                  {service.professional.headline}
                </p>
                <Link
                  href={`/professionals/${service.professional.slug}`}
                  className="mt-2 inline-block text-caption font-medium text-primary hover:underline"
                >
                  Voir le profil →
                </Link>
              </div>

              <ServiceRequestForm
                serviceId={service.id}
                serviceName={service.name}
                className="w-full rounded-xl sm:w-auto"
              />

              {service.professional.phone || service.professional.whatsapp ? (
                <div className="flex flex-wrap gap-2">
                  {service.professional.phone && (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-xl"
                    >
                      <a href={`tel:${service.professional.phone}`}>
                        <Phone className="h-4 w-4" />
                        Contacter le professionnel
                      </a>
                    </Button>
                  )}
                  {service.professional.whatsapp && (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-xl"
                    >
                      <a
                        href={`https://wa.me/${service.professional.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-body-sm text-text-muted">
                  Coordonnées non publiées pour ce professionnel.
                </p>
              )}

              <div className="border-t border-cr2 pt-4 dark:border-border">
                <Link
                  href="/services"
                  className="text-body-sm text-text-secondary transition-colors hover:text-primary"
                >
                  ← Tous les services
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
