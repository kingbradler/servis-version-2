import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Accès refusé",
  description: "Vous n'avez pas les permissions nécessaires.",
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <p className="text-caption font-semibold uppercase tracking-[0.2em] text-primary">
        403
      </p>
      <h1 className="mt-3 text-heading-l font-bold tracking-tight">
        Accès refusé
      </h1>
      <p className="mt-3 max-w-md text-body text-text-secondary">
        Vous n&apos;avez pas les permissions nécessaires pour accéder à cette
        page.
      </p>
      <Button asChild variant="primary" className="mt-8">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
