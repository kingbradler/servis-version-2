import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Politique de confidentialité | SERVIS",
  description: "Politique de confidentialité et protection des données SERVIS.",
};

export default function ConfidentialitePage() {
  return (
    <LegalDocument
      title="Politique de confidentialité"
      updatedAt="16 août 2026"
    >
      <section className="space-y-3">
        <h2>1. Responsable du traitement</h2>
        <p>
          {env.appName} traite des données personnelles pour faire fonctionner
          la marketplace. Contact :{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Données collectées</h2>
        <ul>
          <li>
            Compte : email, nom, prénom, téléphone / WhatsApp, rôle
            (client / vendeur).
          </li>
          <li>
            Boutique / profil pro : description, ville, géolocalisation
            éventuelle, réseaux sociaux, médias.
          </li>
          <li>
            Commandes et demandes : articles, montants, adresse de livraison,
            messages, preuves de paiement (fichiers).
          </li>
          <li>
            Technique : cookies de session (JWT HttpOnly), logs de sécurité
            limités, données de navigation nécessaires au service.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Finalités</h2>
        <ul>
          <li>Créer et sécuriser les comptes (auth, vérification email)</li>
          <li>Exécuter commandes, demandes de service et messagerie</li>
          <li>Gérer abonnements et preuves de paiement</li>
          <li>Notifications in-app / emails transactionnels</li>
          <li>Modération, prévention de la fraude, support</li>
          <li>Améliorer le service (stats agrégées, non nominatives)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Base et conservation</h2>
        <p>
          Les traitements reposent sur l&apos;exécution du contrat
          (fourniture du service), l&apos;intérêt légitime (sécurité,
          amélioration) et, le cas échéant, le consentement. Les données sont
          conservées le temps nécessaire au compte et aux obligations légales
          / litiges, puis supprimées ou anonymisées.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Destinataires</h2>
        <p>
          Données accessibles aux équipes SERVIS habilitées, à l&apos;autre
          partie d&apos;une transaction (ex. vendeur voit votre commande), et
          aux sous-traitants techniques (hébergement, email, stockage) dans la
          limite du nécessaire. Pas de vente de données à des annonceurs.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Cookies et auth</h2>
        <p>
          SERVIS utilise des cookies HttpOnly pour l&apos;authentification (accès
          / refresh) et un mécanisme CSRF. Ce ne sont pas des cookies publicitaires
          tiers. Vous pouvez supprimer les cookies via le navigateur ; la
          déconnexion invalide la session côté serveur selon les règles en
          vigueur.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Sécurité</h2>
        <p>
          Mesures raisonnables : HTTPS en production, mots de passe hashés,
          permissions côté API, rate limiting sur certaines routes sensibles,
          preuves de paiement en stockage privé.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès, la rectification, la limitation ou
          la suppression de vos données de compte, dans les limites légales,
          en écrivant à{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
          Certaines données liées à des transactions peuvent être conservées
          pour preuve.
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Documents liés</h2>
        <p>
          <Link href="/legal/cgu">CGU</Link> ·{" "}
          <Link href="/legal/cgv">CGV</Link> ·{" "}
          <Link href="/legal/mentions">Mentions légales</Link>
        </p>
      </section>
    </LegalDocument>
  );
}
