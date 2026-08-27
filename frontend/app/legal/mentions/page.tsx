import type { Metadata } from "next";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Mentions légales | SERVIS",
  description: "Mentions légales de la plateforme SERVIS.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocument title="Mentions légales" updatedAt="16 août 2026">
      <section className="space-y-3">
        <h2>1. Éditeur de la plateforme</h2>
        <p>
          La plateforme <strong>{env.appName}</strong> (ci-après « SERVIS ») est
          une marketplace locale permettant de découvrir des produits et
          services proposés par des vendeurs et professionnels, notamment à
          Tanger (Maroc).
        </p>
        <ul>
          <li>Nom commercial : SERVIS</li>
          <li>
            Contact :{" "}
            <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>
          </li>
          <li>Téléphone : {env.platformPhone}</li>
          <li>Zone d&apos;activité principale : Tanger, Maroc</li>
        </ul>
        <p className="text-body-sm text-text-muted">
          Les mentions d&apos;identification formelle (raison sociale, ICE /
          RC, adresse du siège) seront complétées dès formalisation de la
          structure juridique. En attendant, le contact ci-dessus fait foi pour
          toute demande.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Hébergement</h2>
        <p>
          Le site et l&apos;API sont hébergés chez le(s) prestataire(s)
          choisi(s) par SERVIS (hébergeur cloud / VPS). Les fichiers médias
          peuvent être stockés via un service de stockage objet (ex. Supabase
          Storage).
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Nature du service</h2>
        <p>
          SERVIS est un <strong>intermédiaire technique</strong> : elle met en
          relation des acheteurs / clients avec des boutiques et
          professionnels. SERVIS n&apos;est pas le vendeur des produits ni le
          prestataire des services listés, sauf mention contraire.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Propriété intellectuelle</h2>
        <p>
          La marque SERVIS, le logo, l&apos;interface et les contenus éditoriaux
          de la plateforme sont protégés. Toute reproduction non autorisée est
          interdite. Les contenus publiés par les vendeurs (photos, textes)
          restent leur responsabilité.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Signalement</h2>
        <p>
          Pour signaler un contenu illicite, une boutique frauduleuse ou un
          abus :{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
