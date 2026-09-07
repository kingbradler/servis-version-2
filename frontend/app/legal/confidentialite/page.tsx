import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment SERVIS utilise vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <LegalDocument
      title="Politique de confidentialité"
      updatedAt="7 septembre 2026"
    >
      <section className="space-y-3">
        <h2>1. Qui est responsable</h2>
        <p>
          {env.appName} utilise vos données pour faire fonctionner la
          marketplace. Pour toute question :{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Quelles données</h2>
        <ul>
          <li>
            Compte : e-mail, nom, prénom, téléphone / WhatsApp, type de compte
            (client ou professionnel).
          </li>
          <li>
            Boutique ou profil : description, ville, localisation si vous la
            renseignez, liens, photos.
          </li>
          <li>
            Commandes et demandes : articles, montants, adresse de livraison,
            messages, preuves de paiement.
          </li>
          <li>
            Connexion : cookies nécessaires pour rester connecté et protéger
            votre session.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Pourquoi nous les utilisons</h2>
        <ul>
          <li>Créer votre compte et confirmer votre e-mail</li>
          <li>Traiter les commandes, les demandes de service et les messages</li>
          <li>Gérer les abonnements et les preuves de paiement</li>
          <li>Vous envoyer les e-mails utiles (confirmation, mot de passe)</li>
          <li>Modérer le site, limiter la fraude, vous aider en cas de souci</li>
          <li>Améliorer SERVIS à partir de chiffres d&apos;ensemble, sans vous identifier</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Combien de temps</h2>
        <p>
          Nous gardons vos données tant que votre compte existe, et le temps
          nécessaire ensuite pour la comptabilité ou un litige. Elles sont
          ensuite supprimées ou rendues anonymes.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Qui y a accès</h2>
        <p>
          L&apos;équipe SERVIS, dans la limite de ce qui est utile ; l&apos;autre
          partie d&apos;une commande (par exemple le vendeur voit votre
          commande) ; et nos prestataires techniques (hébergement, e-mail,
          stockage des fichiers), uniquement pour faire tourner le service. Nous
          ne vendons pas vos données à des publicitaires.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Cookies</h2>
        <p>
          SERVIS utilise des cookies de connexion, indispensables pour vous
          reconnaître et sécuriser votre compte. Ce ne sont pas des cookies
          publicitaires. Vous pouvez les supprimer dans votre navigateur ; vous
          serez alors déconnecté.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Sécurité</h2>
        <p>
          Le site est servi en HTTPS. Les mots de passe sont stockés de façon
          chiffrée. Les preuves de paiement ne sont pas visibles publiquement.
          Aucun système n&apos;est infaillible : signalez-nous tout usage
          suspect de votre compte.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Vos droits</h2>
        <p>
          Vous pouvez demander à consulter, corriger ou supprimer les données
          de votre compte, dans les limites prévues par la loi, en écrivant à{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
          Certaines informations liées à une commande peuvent être conservées
          comme preuve.
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Autres documents</h2>
        <p>
          <Link href="/legal/cgu">Conditions d&apos;utilisation</Link> ·{" "}
          <Link href="/legal/cgv">Conditions de vente</Link> ·{" "}
          <Link href="/legal/mentions">Mentions légales</Link>
        </p>
      </section>
    </LegalDocument>
  );
}
