"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getPublicHeroSlides,
  type HeroSlide,
} from "@/features/marketplace/services/hero-slides.service";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { frenchCtaLabel } from "@/lib/marketplace/french-cta";
import { cn } from "@/lib/utils";

function withFrenchCtas(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((slide) => ({
    ...slide,
    cta_label: frenchCtaLabel(slide.cta_label, slide.cta_href),
  }));
}

/** Fallback if API empty / offline — same visuals as initial seed. */
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    title: "Marketplace locale",
    highlight: "près de vous",
    subtitle:
      "Produits d'étudiants entrepreneurs et services de proximité, partout au Maroc.",
    image:
      "https://images.pexels.com/photos/4495416/pexels-photo-4495416.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    cta_href: "/products",
    cta_label: "Voir les produits",
    sort_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-2",
    title: "Services pro",
    highlight: "autour de vous",
    subtitle: "Trouvez un professionnel, échangez, avancez sans friction.",
    image:
      "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    cta_href: "/services",
    cta_label: "Voir les services",
    sort_order: 1,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-3",
    title: "Carte & proximité",
    highlight: "Explorer",
    subtitle:
      "Boutiques et prestataires sur la carte — ce qui compte est près de chez vous.",
    image:
      "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600",
    cta_href: "/explore",
    cta_label: "Ouvrir Explorer",
    sort_order: 2,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
];

/**
 * Puma-inspired full-bleed hero: brand first, one headline, one CTA group,
 * edge-to-edge image plane (no inset media card).
 */
export function HomeHero() {
  const router = useRouter();
  const [slides, setSlides] = useState<HeroSlide[]>(() =>
    withFrenchCtas(FALLBACK_SLIDES)
  );
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getPublicHeroSlides()
      .then((data) => {
        if (cancelled) return;
        if (data.length > 0) setSlides(withFrenchCtas(data));
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(
      () => setActive((p) => (p + 1) % slides.length),
      5200
    );
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    setActive((p) => (slides.length ? Math.min(p, slides.length - 1) : 0));
  }, [slides.length]);

  const slide = slides[active] ?? slides[0] ?? FALLBACK_SLIDES[0];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <section className="relative isolate min-h-[min(78vh,720px)] overflow-hidden bg-dk text-white sm:min-h-[min(92vh,860px)]">
      {slides.map((s, i) => {
        const src = resolveMediaUrl(s.image) || s.image;
        return (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              i === active ? "opacity-100" : "opacity-0"
            )}
            aria-hidden={i !== active}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0}
              unoptimized={src.includes("/media/") || src.startsWith("/")}
              className={cn(
                "object-cover object-center",
                i === active &&
                  "motion-safe:animate-[hero-kenburns_10s_ease-out_forwards]"
              )}
              sizes="100vw"
            />
          </div>
        );
      })}

      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(14,14,14,0.92)_0%,rgba(14,14,14,0.72)_42%,rgba(14,14,14,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,rgba(232,66,8,0.28),transparent_55%)]" />

      <div className="relative z-10 mx-auto flex min-h-[min(78vh,720px)] max-w-[1280px] flex-col justify-end px-4 pb-10 pt-20 sm:min-h-[min(92vh,860px)] sm:px-6 sm:pb-16 sm:pt-24 lg:px-12 lg:pb-20">
        <div className="max-w-2xl">
          <p className="font-display text-[clamp(2.35rem,14vw,7.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em] motion-safe:animate-[fade-up_0.55s_ease-out_both]">
            Servis<span className="text-primary">.</span>
          </p>
          <h1 className="font-display mt-4 text-[clamp(1.5rem,6.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-tight motion-safe:animate-[fade-up_0.7s_ease-out_both] sm:mt-5">
            {slide.title}
            <span className="block text-primary">{slide.highlight}</span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65 motion-safe:animate-[fade-up_0.85s_ease-out_both] sm:mt-4 sm:text-base">
            {slide.subtitle}
          </p>

          <form
            onSubmit={onSearch}
            className="mt-6 flex w-full max-w-xl flex-col gap-2 motion-safe:animate-[fade-up_0.95s_ease-out_both] sm:mt-8 sm:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit, un service…"
                className="h-12 w-full rounded-none border border-white/20 bg-black/35 pl-10 pr-4 text-[15px] text-white outline-none backdrop-blur-sm placeholder:text-white/35 focus:border-primary"
                aria-label="Recherche marketplace"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="h-12 w-full rounded-none px-5 font-bold uppercase tracking-wide sm:w-auto"
            >
              Rechercher
            </Button>
          </form>

          <div className="mt-5 flex w-full flex-col gap-2 motion-safe:animate-[fade-up_1.05s_ease-out_both] sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full rounded-none uppercase tracking-wide sm:w-auto"
            >
              <Link href={slide.cta_href || "/products"}>
                {slide.cta_label || "Découvrir"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full rounded-none border-white/30 bg-transparent uppercase tracking-wide text-white hover:bg-white hover:text-dk sm:w-auto"
            >
              <Link href="/stores">Boutiques</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-1 rounded-none transition-all",
                i === active
                  ? "w-10 bg-primary"
                  : "w-4 bg-white/35 hover:bg-white/55"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
