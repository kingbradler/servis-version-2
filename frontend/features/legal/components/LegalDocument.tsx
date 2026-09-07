import Link from "next/link";

import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { env } from "@/config/env";

const LEGAL_NAV = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/cgu", label: "CGU" },
  { href: "/legal/cgv", label: "CGV" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
] as const;

export function LegalDocument({
  title,
  updatedAt,
  sections,
  children,
}: {
  title: string;
  updatedAt: string;
  sections?: { heading: string; body: React.ReactNode }[];
  children?: React.ReactNode;
}) {
  return (
    <MarketplaceShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-12">
        <nav className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-caption">
          {LEGAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-medium text-text-secondary transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary">
          Informations légales
        </p>
        <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-body-sm text-text-muted">
          Dernière mise à jour : {updatedAt} · {env.appName} — Maroc
        </p>

        <div className="legal-prose mt-8 space-y-6 text-body leading-relaxed text-text-secondary [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-text-primary [&_h3]:mt-2 [&_h3]:text-heading-s [&_h3]:font-semibold [&_h3]:text-text-primary [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-primary [&_a]:hover:underline">
          {sections?.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2>{section.heading}</h2>
              {section.body}
            </section>
          ))}
          {children}
        </div>

        <p className="mt-10 text-body-sm text-text-muted">
          Contact :{" "}
          <a
            className="text-primary hover:underline"
            href={`mailto:${env.platformEmail}`}
          >
            {env.platformEmail}
          </a>
          {" · "}
          <a
            className="text-primary hover:underline"
            href={`tel:${env.platformPhone.replace(/\s/g, "")}`}
          >
            {env.platformPhone}
          </a>
        </p>
      </div>
    </MarketplaceShell>
  );
}
