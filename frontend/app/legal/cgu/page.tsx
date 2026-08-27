import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation | SERVIS",
  description: "CGU de la plateforme SERVIS.",
};

export default function CguPage() {
  return (
    <LegalDocument
      title="Conditions générales d'utilisation"
      updatedAt="16 août 2026"
    >
      <section className="space-y-3">
        <h2>1. Objet</h2>
        <p>
          Les présentes CGU régissent l&apos;accès et l&apos;utilisation de{" "}
          {env.appName} (site, application web et API associées). En créant un
          compte ou en utilisant la plateforme, vous acceptez ces conditions.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Comptes et rôles</h2>
        <ul>
          <li>
            <strong>Client</strong> : naviguer, commander, demander un service,
            messagerie, avis.
          </li>
          <li>
            <strong>Vendeur / professionnel</strong> : publier boutique,
            produits et/ou services, gérer commandes et demandes, abonnements.
          </li>
          <li>
            <strong>Administrateur</strong> : modération et validation (boutiques,
            paiements plateforme, etc.).
          </li>
        </ul>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et des
          actions réalisées depuis votre compte.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Contenu publié</h2>
        <p>
          Les vendeurs garantissent disposer des droits sur les contenus
          publiés (photos, descriptions, prix) et s&apos;engagent à ne pas
          publier de contenus illicites, trompeurs ou offensants. SERVIS peut
          masquer, suspendre ou supprimer un contenu ou un compte en cas de
          manquement.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Commandes, services et paiements</h2>
        <p>
          Les ventes et prestations sont conclues entre le client et le vendeur /
          professionnel. Le paiement sur SERVIS est actuellement{" "}
          <strong>manuel</strong> (virement / mobile money / espèces selon les
          moyens indiqués, avec preuve éventuelle). SERVIS ne garantit pas le
          paiement ni la livraison ; elle facilite la mise en relation et les
          outils de suivi.
        </p>
        <p>
          Les règles commerciales détaillées figurent dans les{" "}
          <Link href="/legal/cgv">CGV</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Abonnements vendeurs</h2>
        <p>
          Certaines fonctionnalités (limites produits, photos, services, boosts)
          dépendent de l&apos;offre d&apos;abonnement. L&apos;activation d&apos;une
          offre payante intervient après validation manuelle de la preuve de
          paiement par l&apos;équipe SERVIS.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Messagerie et avis</h2>
        <p>
          La messagerie et les avis doivent rester respectueux et factuels. Les
          avis produits / services ne peuvent être laissés que dans les
          conditions prévues (commande ou prestation terminée).
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Disponibilité</h2>
        <p>
          SERVIS s&apos;efforce d&apos;assurer une disponibilité continue mais ne
          garantit pas une absence d&apos;interruptions (maintenance, incidents).
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Responsabilité</h2>
        <p>
          Dans les limites permises par la loi, SERVIS n&apos;est pas responsable
          des litiges entre utilisateurs, des dommages indirects, ni du contenu
          tiers. Voir aussi la{" "}
          <Link href="/legal/confidentialite">politique de confidentialité</Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Modification</h2>
        <p>
          SERVIS peut mettre à jour les CGU. La date de mise à jour figure en
          tête de page. L&apos;usage continu après publication vaut acceptation
          des nouvelles conditions, sauf obligation contraire.
        </p>
      </section>

      <section className="space-y-3">
        <h2>10. Contact</h2>
        <p>
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>
        </p>
      </section>
    </LegalDocument>
  );
}
