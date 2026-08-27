# Design System SERVIS — Phase 7.1

> Base visuelle validée avant toute refonte de pages (Phase 7.2+).  
> **Aucun changement backend / workflows / API** dans cette phase.

## Identité

SERVIS = marketplace locale (produits + services + carte).  
Palette : **orange · noir · blanc/crème · gris neutres**.

L’orange (`#E84208`) est l’identité principale : CTAs, focus, liens actifs, badges « featured ».  
Noir et crème portent structure et surfaces — l’UI ne doit pas devenir « tout orange ».

### Couleurs fondamentales

| Token | Hex | Rôle |
|-------|-----|------|
| `--o` / `--primary` | `#E84208` | CTA, accents forts |
| `--o2` | `#FF6534` | Hover primary (bright) |
| `--o-hover` | `#C73807` | Hover alternatif |
| `--o-active` | `#A52F06` | Active / pressed |
| `--o-light` | `#FDEAE3` | Fond badges / chips |
| `--dk` | `#0E0E0E` | Noir, footer, dark bg |
| `--dk2` | `#161616` | Surfaces dark / bandeau |
| `--cr` | `#F7F5F1` | Fond clair (crème) |
| `--cr2` | `#EDEBE5` | Bordures cartes |

### Tokens sémantiques (light / dark)

| Token | Light | Dark |
|-------|-------|------|
| `background` | crème | noir |
| `surface` | `#FFFCF8` | `#161616` |
| `surface-secondary` | `#EFEBE5` | `#1E1E1E` |
| `foreground` / `text-primary` | `#1A1A1A` | `#F5F5F5` |
| `muted` / `text-muted` | `#8A8A8A` | `#737373` |
| `border` | `#E0DBD4` | `#2A2A2A` |
| `primary` | orange | orange (inchangé) |
| `success` / `warning` / `danger` (`error`) / `info` | verts / ambre / rouge / bleu | idem + lights |

Source code : `frontend/app/globals.css` · référence TS : `frontend/lib/design-tokens.ts`.

## Logo

Concept propriétaire : **chariot + lettre S** — reconnaissable sans texte.

| Version | Usage | Composant |
|---------|--------|-----------|
| **Lockup** | Navbar desktop, landing | `ServisLogo variant="lockup"` |
| **Mark** (compact) | Mobile, favicon, PWA, splash | `ServisLogo variant="mark"` |
| **Wordmark** | Cas texte seul | `ServisLogo variant="wordmark"` |

Assets : `frontend/public/brand/`  
Chemins centralisés : `frontend/config/brand.ts` (`BRAND.mark.light/dark`).

**Remplacer le logo** = déposer les nouveaux SVG/PNG dans `/public/brand` et, si besoin, ajuster `config/brand.ts` uniquement. Ne pas hardcoder des chemins ailleurs.

Phase 7.1 : **pas de génération / remplacement automatique** du logo.

## Typographie

**Deux polices** via `next/font` :

| Rôle | Famille | Variable CSS |
|------|---------|--------------|
| Titres / display | [Syne](https://fonts.google.com/specimen/Syne) (700–800) | `--font-syne` / `.font-display` |
| Corps | [DM Sans](https://fonts.google.com/specimen/DM+Sans) | `--font-dm-sans` / `font-sans` |

| Classe | Usage |
|--------|--------|
| `.text-heading-xl` … `.text-heading-s` | Titres (Syne) |
| `.text-body` / `.text-body-sm` | Corps (DM Sans) |
| `.text-small` / `.text-caption` | Méta, labels |

Direction visuelle Phase 7.2 : inspiration Bolt (navbar sombre, hero photo carousel, fade-up, hover cartes) — **sans changer APIs / workflows**.

## Motion

- `fade-up` — apparition sections / cartes  
- `ann-scroll` — bandeau d’annonces  
- `hero-kenburns` — photo hero  
Respecter `prefers-reduced-motion`.

## Radius

| Token | Valeur |
|-------|--------|
| `sm` | 0.375rem |
| `md` | 0.5rem |
| `lg` | 0.75rem (boutons) |
| `xl` | 1rem / `rounded-2xl` (cartes marketplace) |
| `full` | pills / badges |

## Shadows

| Token | Usage |
|-------|--------|
| `sm` | Légère élévation |
| `md` | Cartes / dropdown |
| `lg` | Modales |

Éviter les ombres multi-couches et glow.

## Boutons (`Button`)

| Variant | Rôle |
|---------|------|
| `primary` | Orange — CTA principal |
| `secondary` | Surface + fond secondaire |
| `outline` | Bordure (ex-« secondary » marketplace) |
| `ghost` | Sans fond |
| `danger` | Destructif |
| `link` | Lien texte |

États : hover, active, focus-visible (ring primary), disabled, `loading`.

## Cartes marketplace

Même langage : `rounded-2xl`, hover lift léger, image / avatar, titre → primary au hover.

| Composant | Contenu typique |
|-----------|-----------------|
| `ProductCard` | Image, nom, prix, boutique, note, badge |
| `ServiceCard` | Image, pro, catégorie, prix, lieu, featured |
| `StoreCard` | Bannière, logo, ville, nb produits |
| `ProfessionalCard` | Avatar, headline, ville, distance, CTA |
| `CategoryCard` | Icône + label |

Ne pas les rendre identiques — adapter la densité au métier.

## Badges

Variants UI : `default` | `primary` | `secondary` | `success` | `warning` | `error` | `info` | `outline`.

Mapping métier recommandé (`BADGE_SEMANTICS` dans `design-tokens.ts`) :

| Statut | Variant |
|--------|---------|
| Active / Disponible / Terminé | success |
| Featured | primary |
| En attente / Pending | warning |
| Accepté | info |
| Refusé / Suspendu | error |
| Sur devis / Draft / Annulé | secondary |

## Navbar — direction (Phase 7.2)

```
[LOGO] Accueil · Produits · Services · Explorer    [Recherche] [Panier] [Compte]
```

- Desktop : horizontale  
- Mobile : mark compact + menu  
- Orange sur item actif / CTA Connexion  
**Ne pas refondre entièrement en 7.1** — direction documentée seulement.

## Landing `/` — direction (Phase 7.2)

Hero identité SERVIS forte + 3 piliers :

1. **Acheter** — produits  
2. **Services** — professionnels  
3. **Explorer** — carte / autour de moi  

CTA principal orange.

## `/explore` — direction

Carte Mapbox (conservée) + liste résultats + distance + filtres type.  
Pas de remplacement Mapbox.

## Dashboards — direction

Trois shells partagés (`DashboardShell` + sidebar) :

| Client | Professionnel | Admin |
|--------|---------------|-------|
| Vue d’ensemble, commandes, demandes, panier, profil | Boutique, produits, commandes, services, demandes, paiements, profil pro | Users, boutiques, produits, services, commandes, paiements, catégories |

Même : sidebar, stats cards, tableaux, badges, boutons, formulaires.

## Dark mode

`next-themes` + classe `.dark`.  
Primary orange **identique** en clair et sombre.  
Surfaces / bordures / textes basculent via tokens sémantiques.

## Mobile & PWA (préparation)

Breakpoints : mobile `<768`, tablet `768–1023`, desktop `≥1024`.  
CSS safe-area : `.safe-px`, `.safe-pt`, `.safe-pb` + vars `--safe-*`.  
Favicon / app icon : chemins dans `BRAND.appIcon` (à finaliser en PWA complète plus tard).

## Accessibilité

- Contraste texte / fond via tokens  
- `focus-visible` ring primary  
- Labels sur inputs  
- Alt images / aria-label logo  
- Cibles tactiles ≥ boutons `md`/`lg`

## Composants à réutiliser (ne pas dupliquer)

`frontend/components/ui/` : Button, Input, Select, Checkbox, Radio, Modal, Dropdown, Badge, Avatar, Card, ProductCard, ServiceCard (feature), StoreCard, ProfessionalCard, CategoryCard, Rating, Alert, Skeleton, Empty/Loading/Error, Toast.  
`layout/` : Navbar, Footer, Sidebar, DashboardShell, MarketplaceShell.  
`brand/` : ServisLogo, PageHero, Reveal, SiteIntro.

## Incohérences actuelles (audit)

1. Orange parfois trop discret sur home / listes (accent seulement).  
2. Cartes Service vs Product : densités et badges inconsistants (featured custom vs `Badge`).  
3. Pas de `ProfessionalCard` jusqu’en 7.1 (listes explore / pros hétérogènes).  
4. Titres dashboards « Vendeur » vs « Professionnel » (partiellement corrigé 6.7).  
5. Hex / gradients locaux sporadiques (ex. placeholders).  
6. Shadows Tailwind génériques vs tokens SERVIS (tokens exposés en 7.1).  
7. PWA icons / splash non finalisés.  
8. Landing ne met pas encore assez en avant Acheter / Services / Explorer.

## Prochaine étape

**Phase 7.2 — Landing page + Navbar + système de navigation**  
(appliquer ce Design System sur `/` et la navbar uniquement — pas toute l’app).

## Fichiers Phase 7.1

| Créé / mis à jour | Rôle |
|-------------------|------|
| `docs/design-system.md` | Spec DS |
| `frontend/config/brand.ts` | Chemins logo / PWA |
| `frontend/lib/design-tokens.ts` | Référence tokens |
| `frontend/components/ui/professional-card.tsx` | Carte pro |
| `frontend/app/globals.css` | Aliases + shadows @theme + safe-area |
| `frontend/components/brand/ServisLogo.tsx` | Utilise `BRAND` |
