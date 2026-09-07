import type { Metadata } from "next";

import { ProfessionalsListPage } from "@/features/professionals/components/ProfessionalsListPage";

export const metadata: Metadata = {
  title: "Professionnels",
  description:
    "Trouvez un prestataire près de chez vous sur SERVIS — services locaux partout au Maroc.",
};

export default function Page() {
  return <ProfessionalsListPage />;
}
