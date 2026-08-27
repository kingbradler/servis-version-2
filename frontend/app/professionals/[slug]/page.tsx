"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone, Wrench } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getPublicProfessional,
  type ProfessionalPublic,
} from "@/features/professionals/api/professionals.api";
import { getPublicServices } from "@/features/pro-services/api/services.api";
import type { ServicePublic } from "@/features/pro-services/types/service.types";
import { ServiceCard } from "@/features/pro-services/components/ServiceCard";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { ProfessionalReviewsSection } from "@/features/reviews/components/ProfessionalReviewsSection";
import { ContactProfessionalButton } from "@/features/messaging/components/ContactProfessionalButton";
import { isApiError } from "@/lib/api/errors";

function SocialLinks({
  professional,
}: {
  professional: ProfessionalPublic;
}) {
  const links = [
    { href: professional.instagram_url, label: "Instagram" },
    { href: professional.tiktok_url, label: "TikTok" },
    { href: professional.facebook_url, label: "Facebook" },
  ].filter((l) => Boolean(l.href?.trim()));

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Button
          key={link.label}
          asChild
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <a href={link.href!} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </Button>
      ))}
    </div>
  );
}

export default function PublicProfessionalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [professional, setProfessional] = useState<ProfessionalPublic | null>(
    null
  );
  const [services, setServices] = useState<ServicePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const pro = await getPublicProfessional(slug);
        if (cancelled) return;
        setProfessional(pro);
        const svc = await getPublicServices({
          search: pro.display_name,
          page_size: 20,
        });
        if (cancelled) return;
        const list = Array.isArray(svc) ? svc : svc.results;
        setServices(list.filter((s) => s.professional.slug === pro.slug));
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Profil introuvable");
          setProfessional(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {loading && <LoadingState message="Chargement du professionnel…" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => router.refresh()} />
        )}

        {!loading && !error && !professional && (
          <EmptyState
            title="Professionnel introuvable"
            description="Ce profil n'est pas disponible."
            actionLabel="Explorer"
            onAction={() => router.push("/explore")}
          />
        )}

        {!loading && professional && (
          <div className="space-y-10">
            <section className="overflow-hidden rounded-[26px] border border-cr2 bg-white dark:border-border dark:bg-surface">
              <div className="relative h-28 bg-dk sm:h-36">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(232,66,8,0.35),transparent_55%)]" />
              </div>
              <div className="relative grid gap-6 px-5 pb-6 sm:px-8 lg:grid-cols-[auto_1fr] lg:items-end">
                <div className="relative -mt-14 h-28 w-28 overflow-hidden rounded-[22px] border-4 border-white bg-primary/10 shadow-lg dark:border-surface sm:-mt-16 sm:h-32 sm:w-32">
                  {professional.avatar ? (
                    <Image
                      src={resolveMediaUrl(professional.avatar) || ""}
                      alt={professional.display_name}
                      fill
                      className="object-cover"
                      sizes="128px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-muted">
                      <Wrench className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-3 pb-1">
                  <div>
                    <h1 className="font-display text-heading-l tracking-tight text-text-primary">
                      {professional.display_name}
                    </h1>
                    <p className="mt-1 text-body text-text-secondary">
                      {professional.headline}
                    </p>
                  </div>
                  {professional.city?.name && (
                    <Badge variant="secondary">{professional.city.name}</Badge>
                  )}
                  {professional.bio && (
                    <p className="max-w-2xl whitespace-pre-wrap text-body text-text-secondary">
                      {professional.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {professional.phone && (
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <a href={`tel:${professional.phone}`}>
                          <Phone className="h-4 w-4" />
                          {professional.phone}
                        </a>
                      </Button>
                    )}
                    {professional.whatsapp && (
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <a
                          href={`https://wa.me/${professional.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="primary" size="sm" className="rounded-xl">
                      <Link
                        href={`/services?search=${encodeURIComponent(professional.display_name)}`}
                      >
                        Voir ses services
                      </Link>
                    </Button>
                    <ContactProfessionalButton
                      professionalSlug={professional.slug}
                      professionalName={professional.display_name}
                    />
                  </div>
                  <SocialLinks professional={professional} />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-display text-[19px] font-extrabold text-text-primary">
                  Services
                </h2>
                <span className="text-[13px] text-text-muted">
                  {services.length} offre{services.length > 1 ? "s" : ""}
                </span>
              </div>
              {services.length === 0 ? (
                <EmptyState
                  title="Aucun service disponible pour le moment"
                  description="Ce professionnel n'a pas encore de service publié."
                />
              ) : (
                <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service, i) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </section>

            <ProfessionalReviewsSection slug={professional.slug} />
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
