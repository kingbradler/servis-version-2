"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { FooterFeedbackForm } from "@/features/marketplace/components/FooterFeedbackForm";
import { fetchCategories } from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/category.types";
import { env } from "@/config/env";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const whatsappHref = buildWhatsAppUrl(env.platformWhatsapp);

  useEffect(() => {
    let cancelled = false;
    void fetchCategories()
      .then((data) => {
        if (!cancelled) setCategories(data.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className={cn("relative overflow-hidden bg-dk text-white", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_0%,rgba(232,66,8,0.18),transparent_55%)]" />

      <div className="relative border-b border-white/10">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-12 lg:py-16">
          <div>
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.28em] text-primary">
              À propos de nous
            </p>
            <h2 className="font-display mt-3 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">
              SERVIS, partout au Maroc
            </h2>
            <div className="mt-4 max-w-xl space-y-3 text-body-sm leading-relaxed text-white/65">
              <p>
                SERVIS est né d&apos;une idée simple : connecter les étudiants
                entrepreneurs et les talents locaux avec leur ville — produits,
                services, proximité.
              </p>
              <p>
                Une marketplace pour tout le Maroc : découvrir une boutique
                près de chez soi, contacter un professionnel, commander sans
                friction, et faire grandir l&apos;économie locale.
              </p>
              <p>
                Notre ambition : rendre le commerce local plus accessible, plus
                humain, et donner une vraie vitrine aux créateurs et
                prestataires de la région.
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-body-sm text-white/75">
              <li>
                Tél.{" "}
                <a
                  href={`tel:${env.platformPhone.replace(/\s/g, "")}`}
                  className="text-white transition-colors hover:text-primary"
                >
                  {env.platformPhone}
                </a>
              </li>
              <li>
                Email{" "}
                <a
                  href={`mailto:${env.platformEmail}`}
                  className="text-white transition-colors hover:text-primary"
                >
                  {env.platformEmail}
                </a>
              </li>
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-white transition-colors hover:text-primary"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div id="contact">
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.28em] text-primary">
              Nous contacter
            </p>
            <h3 className="font-display mt-3 text-xl font-extrabold tracking-tight">
              Laissez-nous un message
            </h3>
            <p className="mt-2 mb-4 max-w-md text-body-sm text-white/55">
              Question, suggestion ou recommandation — écrivez-nous, on lit
              tout.
            </p>
            <FooterFeedbackForm />
          </div>
        </div>
      </div>

        <div className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-14 lg:px-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <ServisLogo
              variant="lockup"
              tone="on-dark"
              className="mb-4 text-white"
              markClassName="h-8 w-auto"
            />
            <p className="max-w-xs text-body-sm leading-relaxed text-white/60">
              Marketplace des étudiants entrepreneurs — produits et services près
              de chez vous.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Produits
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/stores"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Boutiques
                </Link>
              </li>
              <li>
                <Link
                  href="/explore"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Explorer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Catégories
            </h4>
            <ul className="space-y-2">
              {categories.length === 0 ? (
                <li className="text-body-sm text-white/40">—</li>
              ) : (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="text-body-sm text-white/70 transition-colors hover:text-primary"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Légal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/mentions"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cgu"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  CGU
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cgv"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  CGV
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/confidentialite"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Compte
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Connexion
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Inscription
                </Link>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-body-sm text-white/70 transition-colors hover:text-primary"
                >
                  Nous contacter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-caption text-white/40">
            © {new Date().getFullYear()} SERVIS. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-caption text-white/40">
            <Link href="/legal/mentions" className="hover:text-primary">
              Mentions
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/cgu" className="hover:text-primary">
              CGU
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/confidentialite" className="hover:text-primary">
              Confidentialité
            </Link>
            <span aria-hidden>·</span>
            <span>Maroc</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
