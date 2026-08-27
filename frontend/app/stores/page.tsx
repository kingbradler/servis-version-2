import type { Metadata } from "next";

import { StoresListPage } from "@/features/stores/components/StoresListPage";

export const metadata: Metadata = {
  title: "Boutiques",
  description:
    "Découvrez les boutiques d'étudiants entrepreneurs actives sur SERVIS.",
};

export default function Page() {
  return <StoresListPage />;
}
