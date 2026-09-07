import type { Metadata } from "next";

import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "Mentions légales | SERVIS",
  description: "Mentions légales de SERVIS, marketplace au Maroc.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocument title="Mentions légales" updatedAt="7 septembre 2026">
      <section className="space-y-3">
        <h2>1. Qui édite SERVIS</h2>
        <p>
          <strong>{env.appName}</strong> est une marketplace au Maroc. Elle
          permet de découvrir des produits et des services proposés par des
          vendeurs et des professionnels, près de chez vous.
        </p>
        <ul>
          <li>Nom commercial : SERVIS</li>
          <li>
            E-mail :{" "}
            <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>
          </li>
          <li>Téléphone : {env.platformPhone}</li>
          <li>Pays : Maroc</li>
        </ul>
        <p>
          Pour toute question (compte, commande, signalement), écrivez-nous à
          l&apos;adresse ci-dessus. Nous vous répondons dans les meilleurs
          délais.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Hébergement</h2>
        <p>
          Le site, l&apos;application et les fichiers (photos, documents) sont
          hébergés par des prestataires techniques choisis par SERVIS. SERVIS
          reste responsable de la plateforme vis-à-vis des utilisateurs.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Rôle de SERVIS</h2>
        <p>
          SERVIS met en relation des acheteurs avec des boutiques et des
          professionnels. Sauf indication contraire, SERVIS n&apos;est pas le
          vendeur du produit et n&apos;exécute pas la prestation : le contrat se
          forme entre le client et le professionnel.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Propriété intellectuelle</h2>
        <p>
          Le nom SERVIS, le logo et l&apos;interface du site appartiennent à
          SERVIS. Vous ne pouvez pas les copier ou les réutiliser sans
          autorisation. Les photos et textes publiés par un vendeur restent sous
          sa responsabilité.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Signalement</h2>
        <p>
          Pour signaler un contenu abusif, une boutique douteuse ou un compte
          frauduleux :{" "}
          <a href={`mailto:${env.platformEmail}`}>{env.platformEmail}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
