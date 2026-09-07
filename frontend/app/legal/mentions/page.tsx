import { LegalDocument } from "@/features/legal/components/LegalDocument";

export default function MentionsLegalesPage() {
  return (
    <LegalDocument
      title="Mentions légales"
      updatedAt="7 septembre 2026"
      sections={[
        {
          heading: "1. Éditeur du site",
          body: (
            <>
              <p>
                Le site <strong>SERVIS</strong> (servis-superrapid.com) est une
                marketplace. Des étudiants et des professionnels peuvent y
                proposer des produits et des services, partout au Maroc.
              </p>
              <p>
                SERVIS n’est pas le vendeur de ces offres. Chaque vendeur est
                responsable de ce qu’il publie et de ce qu’il vend.
              </p>
              <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium text-foreground">Nom</dt>
                <dd>SERVIS</dd>
                <dt className="font-medium text-foreground">Site</dt>
                <dd>https://www.servis-superrapid.com</dd>
                <dt className="font-medium text-foreground">Contact</dt>
                <dd>
                  <a href="mailto:contact@servis-superrapid.com">
                    contact@servis-superrapid.com
                  </a>
                </dd>
                <dt className="font-medium text-foreground">Pays</dt>
                <dd>Maroc</dd>
              </dl>
            </>
          ),
        },
        {
          heading: "2. Hébergement",
          body: (
            <>
              <p>Le site et l’application sont hébergés chez :</p>
              <ul>
                <li>
                  <strong>Vercel Inc.</strong> — pages du site (États-Unis)
                </li>
                <li>
                  <strong>Render</strong> — serveur de l’application
                </li>
              </ul>
              <p>
                Les données (comptes, commandes, messages) sont stockées chez
                un prestataire d’hébergement de base de données, dans le cadre
                du fonctionnement du service.
              </p>
            </>
          ),
        },
        {
          heading: "3. Propriété intellectuelle",
          body: (
            <p>
              Le nom SERVIS, le logo, la présentation du site et les textes
              rédigés par SERVIS sont protégés. Vous n’avez pas le droit de les
              copier ou de les réutiliser sans accord écrit.
            </p>
          ),
        },
        {
          heading: "4. Contenus publiés par les utilisateurs",
          body: (
            <p>
              Les annonces, photos, avis et messages sont publiés par les
              utilisateurs. SERVIS peut les retirer s’ils sont illégaux, faux
              ou contraires aux règles du site.
            </p>
          ),
        },
        {
          heading: "5. Responsabilité",
          body: (
            <p>
              SERVIS met le site à disposition. SERVIS n’est pas responsable
              des ventes entre un acheteur et un vendeur, ni des retards ou
              des problèmes de livraison dus au vendeur ou au transporteur.
            </p>
          ),
        },
        {
          heading: "6. Données personnelles",
          body: (
            <p>
              L’utilisation des données personnelles est expliquée dans la{" "}
              <a href="/legal/confidentialite">politique de confidentialité</a>.
            </p>
          ),
        },
        {
          heading: "7. Contact",
          body: (
            <p>
              Pour une question sur ces mentions :{" "}
              <a href="mailto:contact@servis-superrapid.com">
                contact@servis-superrapid.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
