/** Map leftover English hero/catalog CTAs to French for visitors. */

const CTA_FR: Record<string, string> = {
  "shop produits": "Voir les produits",
  "shop products": "Voir les produits",
  "shop all": "Tous les produits",
  "shop now": "Découvrir",
  go: "Rechercher",
};

export function frenchCtaLabel(
  label: string | null | undefined,
  href?: string | null
): string {
  const raw = (label || "").trim();
  const mapped = CTA_FR[raw.toLowerCase()];
  if (mapped) return mapped;
  if (!raw) {
    if (href?.includes("/products")) return "Voir les produits";
    if (href?.includes("/services")) return "Voir les services";
    if (href?.includes("/explore")) return "Ouvrir Explorer";
    return "Découvrir";
  }
  return raw;
}
