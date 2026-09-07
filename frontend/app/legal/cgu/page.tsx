import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation | SERVIS",
  description: "Conditions d'utilisation de SERVIS.",
};

export default function CguPage() {
  return (
    <LegalDocument
      title="Conditions générales d'utilisation"
      updatedAt="7 septembre 2026"
    >
      <section className="space-y-3">
        <h2>1. Objet</h2>
        <p>
          Ces conditions expliquent comment utiliser {env.appName}. En créant un
          compte ou en naviguant sur le site, vous les acceptez.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Comptes</h2>
        <ul>
          <li>
            <strong>Client</strong> : acheter, demander un service, envoyer des
            messages, laisser un avis.
          </li>
          <li>
            <strong>Professionnel</strong> : ouvrir une boutique, vendre des
            produits, proposer des services. Un professionnel peut aussi
            acheter comme un client.
          </li>
          <li>
            <strong>Administrateur</strong> : équipe SERVIS, pour la modération
            et la validation.
          </li>
        </ul>
        <p>
          Vous êtes responsable de votre mot de passe et de ce qui est fait
          depuis votre compte. Un compte par personne.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Ce que vous publiez</h2>
        <p>
          Les photos, descriptions et prix que vous mettez en ligne doivent
          vous appartenir (ou être autorisés) et rester honnêtes. Pas de
          contenu illégal, trompeur ou insultant. En cas de manquement, SERVIS
          peut retirer le contenu, suspendre la boutique ou fermer le compte.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Commandes, services et paiements</h2>
        <p>
          La vente se fait entre le client et le professionnel. Le paiement sur
          SERVIS est manuel (virement, mobile money ou espèces, selon les moyens
          indiqués), avec une preuve si besoin. SERVIS facilite la mise en
          relation et le suivi ; elle ne garantit pas à elle seule le paiement
          ni la livraison.
        </p>
        <p>
          Les détails commerciaux sont dans les{" "}
          <Link href="/legal/cgv">conditions de vente</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Abonnements</h2>
        <p>
          Certaines options (nombre de produits, photos, services, mises en
          avant) dépendent de l&apos;offre choisie. Une offre payante est
          activée après vérification de la preuve de paiement par l&apos;équipe
          SERVIS.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Messages et avis</h2>
        <p>
          Restez courtois. Un avis produit ou service ne peut être laissé
          qu&apos;après une commande ou une prestation terminée.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Disponibilité du site</h2>
        <p>
          Nous faisons le nécessaire pour que SERVIS soit accessible. Des
          coupures restent possibles (maintenance, incident). Nous les
          limitons autant que possible.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Responsabilité</h2>
        <p>
          SERVIS n&apos;est pas partie aux litiges entre un client et un
          professionnel, sauf lorsqu&apos;elle intervient en modération. Chaque
          utilisateur reste responsable de ses annonces, de ses paiements et de
          ses livraisons. Voir aussi la{" "}
          <Link href="/legal/confidentialite">politique de confidentialité</Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Modifications</h2>
        <p>
          Nous pouvons mettre ces conditions à jour. La date en haut de page
          fait référence. Si vous continuez à utiliser SERVIS après une
          mise à jour, les nouvelles conditions s&apos;appliquent.
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
