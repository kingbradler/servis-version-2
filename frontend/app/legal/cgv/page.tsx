import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Conditions générales de vente | SERVIS",
  description: "CGV de la marketplace SERVIS.",
};

export default function CgvPage() {
  return (
    <LegalDocument
      title="Conditions générales de vente"
      updatedAt="16 août 2026"
    >
      <section className="space-y-3">
        <h2>1. Champ d&apos;application</h2>
        <p>
          Les présentes CGV encadrent les transactions réalisées via {env.appName}
          entre un <strong>client</strong> et un <strong>vendeur</strong>{" "}
          (produits) ou un <strong>professionnel</strong> (services). SERVIS agit
          comme plateforme d&apos;intermédiation, non comme vendeur, sauf offre
          expressément marquée autrement.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Produits et commandes</h2>
        <ul>
          <li>
            Les prix affichés sont en MAD, indiqués par le vendeur. Une commande
            concerne une seule boutique ; un panier multi-boutiques génère
            plusieurs commandes.
          </li>
          <li>
            Le client fournit une adresse / contact de livraison au checkout
            lorsque demandé.
          </li>
          <li>
            Le vendeur confirme, prépare et marque la commande comme terminée
            selon le statut disponible dans son espace.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Services et demandes</h2>
        <p>
          Une demande de service est envoyée au professionnel. Celui-ci peut
          accepter, refuser, puis marquer la prestation comme terminée. Pour les
          services à prix fixe / « à partir de », un paiement manuel peut être
          proposé après acceptation. Les devis (« sur devis ») se négocient hors
          flux de paiement automatique.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Paiement</h2>
        <p>
          Le paiement est <strong>manuel</strong> : le client suit les
          instructions du vendeur / professionnel (ou de la plateforme pour les
          abonnements), puis peut transmettre une preuve. La validation de la
          preuve est effectuée par le vendeur (marketplace) ou l&apos;admin
          (abonnements SERVIS).
        </p>
        <p>
          SERVIS ne conserve pas de données de carte bancaire et n&apos;opère
          pas de prélèvement automatique à ce stade.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Livraison / exécution</h2>
        <p>
          Délais, modalités de retrait ou de livraison, et conditions
          d&apos;exécution du service sont de la responsabilité du vendeur /
          professionnel. Le client est invité à confirmer ces points via la
          messagerie ou WhatsApp.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Annulation et litiges</h2>
        <p>
          En cas de problème (non-réception, non-conformité, prestation non
          réalisée), contactez d&apos;abord l&apos;autre partie. Vous pouvez
          aussi écrire à{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a> pour un
          accompagnement de modération via l&apos;espace{" "}
          <strong>Litiges</strong> de la plateforme, ou{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>. SERVIS
          peut suspendre un compte en cas d&apos;abus répété.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Avis</h2>
        <p>
          Les avis vérifiés (après commande ou prestation terminée) aident la
          communauté. Les faux avis ou contenus diffamatoires pourront être
          masqués.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Droit applicable</h2>
        <p>
          Les présentes CGV sont destinées à un usage au Maroc. En cas de
          différend non résolu à l&apos;amiable, les tribunaux compétents du
          ressort de Tanger pourront être saisis, sous réserve des règles
          d&apos;ordre public applicables.
        </p>
        <p>
          Voir aussi les <Link href="/legal/cgu">CGU</Link> et la{" "}
          <Link href="/legal/confidentialite">confidentialité</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
