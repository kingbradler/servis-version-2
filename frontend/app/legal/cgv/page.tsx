import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions de vente de la marketplace SERVIS.",
};

export default function CgvPage() {
  return (
    <LegalDocument
      title="Conditions générales de vente"
      updatedAt="7 septembre 2026"
    >
      <section className="space-y-3">
        <h2>1. Champ d&apos;application</h2>
        <p>
          Ces conditions s&apos;appliquent aux achats et aux demandes de
          service passés sur {env.appName}, entre un client et un professionnel
          (boutique ou prestataire). SERVIS est la plateforme qui les met en
          relation, pas le vendeur, sauf si une offre est clairement présentée
          comme une offre SERVIS.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Produits et commandes</h2>
        <ul>
          <li>
            Les prix sont en dirhams (MAD), fixés par le vendeur. Un panier
            avec plusieurs boutiques donne lieu à une commande par boutique.
          </li>
          <li>
            Au paiement, le client indique un contact et, si besoin, une
            adresse de livraison.
          </li>
          <li>
            Le vendeur confirme la commande, prépare la commande, puis la
            marque comme terminée depuis son espace.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Services</h2>
        <p>
          Le client envoie une demande au professionnel, qui peut l&apos;accepter
          ou la refuser, puis indiquer quand la prestation est terminée. Pour un
          prix fixe (ou « à partir de »), un paiement manuel peut être proposé
          après acceptation. Un devis se discute directement, hors paiement en
          ligne.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Paiement</h2>
        <p>
          Le paiement est manuel : le client suit les instructions du
          professionnel (ou de SERVIS pour un abonnement), puis envoie une
          preuve si demandé. Le professionnel valide la preuve pour une
          commande ; l&apos;équipe SERVIS la valide pour un abonnement.
        </p>
        <p>
          SERVIS ne stocke pas de numéro de carte bancaire et ne prélève pas
          automatiquement votre compte.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Livraison et réalisation</h2>
        <p>
          Les délais, le retrait, la livraison et la façon dont le service est
          rendu relèvent du professionnel. Le client peut confirmer ces points
          par message ou WhatsApp avant de payer.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Annulation et litiges</h2>
        <p>
          En cas de problème (colis non reçu, article non conforme, prestation
          non réalisée), contactez d&apos;abord l&apos;autre partie. Vous pouvez
          aussi ouvrir un litige depuis votre espace, ou écrire à{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>. SERVIS
          peut suspendre un compte en cas d&apos;abus.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Avis</h2>
        <p>
          Les avis après une commande ou une prestation terminée aident les
          autres utilisateurs. Un faux avis ou un texte injurieux pourra être
          retiré.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Droit applicable</h2>
        <p>
          Ces conditions sont prévues pour un usage au Maroc. Si un désaccord
          n&apos;est pas réglé à l&apos;amiable, les tribunaux compétents au
          Maroc pourront être saisis, dans le respect des règles en vigueur.
        </p>
        <p>
          Voir aussi les <Link href="/legal/cgu">conditions d&apos;utilisation</Link>{" "}
          et la{" "}
          <Link href="/legal/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
