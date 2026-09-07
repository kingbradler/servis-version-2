# Architecture SERVIS

## Vue d'ensemble

SERVIS est une plateforme e-commerce multi-vendeurs destinée aux étudiants entrepreneurs au Maroc.

Le projet est un **monorepo** avec frontend et backend déployables séparément.

```
servis/
├── frontend/          # Next.js 16 + TypeScript + Tailwind CSS
├── backend/           # Django 6 + Django REST Framework
├── docs/              # Documentation
├── docker-compose.yml # PostgreSQL local
└── README.md
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4 |
| Backend | Django, Django REST Framework, Python |
| Base de données | PostgreSQL 16 |
| Stockage fichiers | Supabase Storage (abstraction swappable → S3/R2) |
| Auth (Phase 2) | JWT en cookies HttpOnly + CSRF |
| API | REST JSON `/api/v1/` |
| Prod DB | PostgreSQL (`DATABASE_URL` ou `POSTGRES_*`) |
| Dev DB | SQLite (`USE_SQLITE=true`) ou Postgres local |
| Static prod | WhiteNoise + `collectstatic` |

## Décisions validées (v1)

1. **Monorepo** `servis/` avec apps séparées
2. **Une commande = une boutique** — panier multi-boutiques → plusieurs commandes au checkout
3. **Approbation admin** obligatoire pour activer une boutique
4. **Un vendeur = une boutique** en v1 (architecture prête pour multi-boutiques)
5. **Paiement manuel** uniquement (virement + preuve) — pas de PSP
6. **RIB non public** — exposé uniquement dans le contexte de paiement d'une commande
7. **JWT en HttpOnly cookies** — jamais localStorage
8. **Langue** : français (structure i18n prête pour l'arabe)
9. **Villes** : plusieurs villes marocaines (table `City`)

## Architecture frontend

```
frontend/
├── app/                 # Routes (App Router)
│   ├── (marketplace)/   # Expérience client
│   ├── (seller)/        # Dashboard vendeur
│   ├── (admin)/         # Dashboard admin
│   └── (auth)/          # Login / register
├── components/
│   ├── ui/              # Design System (une implémentation par composant)
│   └── layout/          # Navbar, Footer, Sidebar
├── features/            # Logique métier par domaine
├── lib/                 # Utils, API client, auth helpers
├── hooks/
├── types/
├── services/
├── providers/           # ThemeProvider, etc.
├── config/
└── styles/
```

### Thèmes

- Light : fond crème `#F7F5F1`, surfaces claires, accent orange
- Dark : fond `#0E0E0E` / surfaces `#161616`, accent orange
- Gestion via `next-themes` (`class` strategy)

## Architecture backend

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── core/            # Health, exceptions, storage abstraction
│   ├── users/
│   ├── stores/
│   ├── products/
│   ├── categories/
│   ├── orders/
│   ├── payments/
│   ├── reviews/
│   └── notifications/
├── requirements/
└── manage.py
```

## Stockage fichiers

Abstraction dans `apps/core/storage.py` :

- `StorageBackend` (interface)
- `LocalStorageBackend` (dev) — fichiers publics dans `media/`, **privés** dans `private_media/`
- `SupabaseStorageBackend` (prod) — bucket public `servis` + bucket privé `servis-private`
- Factory `get_storage_backend()` via `STORAGE_BACKEND=local|supabase`

### Organisation des clés objet

```
products/{store_id}/{product_id}/{uuid}.ext
stores/{store_id}/logo/{uuid}.ext
stores/{store_id}/banner/{uuid}.ext
avatars/{user_id}/{uuid}.ext
payment-proofs/{order_id}/{uuid}.ext   # PRIVÉ
```

### Public vs privé

| Type | Visibilité | Accès |
|------|------------|--------|
| Images produits, logos, bannières, avatars | Public | URL publique |
| Preuves de paiement | Privé | URL signée temporaire (1 h) après contrôle d’autorisation Django |

Les apps métier n’appellent jamais Supabase directement. La `SERVICE_KEY` reste uniquement côté Django (jamais Next.js).

Variables : voir `backend/.env.example`.

## Catalogue (Phase 3.1) — Cities & Categories

### City (`apps.stores.City`)
- UUID, name, slug unique, region, is_active
- Public: active cities only
- Soft delete admin = `is_active=false`

### Store (`apps.stores.Store`) — Phase 3.2
- OneToOne `owner` → User (SELLER only, 1 boutique / vendeur en v1)
- FK `city` → City (PROTECT)
- Status workflow: `DRAFT → PENDING → ACTIVE ⇄ SUSPENDED`
- Public marketplace: **ACTIVE only**
- Seller cannot set ACTIVE; admin approves PENDING → ACTIVE
- Soft isolation: seller endpoints always resolve store via `request.user`

### Product (`apps.products.Product`) — Phase 3.3
- FK `store` → Store (CASCADE) ; FK `category` → Category (SET_NULL, optional)
- Price MAD `Decimal(10,2)` ; `compare_price` optional and must be `> price`
- Stock `>= 0` ; ACTIVE + stock 0 → auto `OUT_OF_STOCK`
- Status: `DRAFT | ACTIVE | OUT_OF_STOCK | ARCHIVED`
- Slug unique **per store** (`UNIQUE(store, slug)`), auto-generated
- Public visibility: `product.ACTIVE` **and** `store.ACTIVE` **and** (no category or category active)
- Seller cannot publish unless `store.status == ACTIVE`
- DELETE seller = soft archive (`ARCHIVED`)
- Isolation: seller queries always `store__owner=request.user` (never trust `store_id`)

### ProductImage (`apps.products.ProductImage`)
- FK product, URL via storage abstraction, `order` unique per product, max **8** images
- Upload: JPEG/PNG/WebP, max 5 Mo, magic bytes + Pillow (no SVG)
- Storage: `apps.core.storage` (`local` in dev, `supabase` in prod)

### Cart & Orders (`apps.orders`) — Phase 3.4
- `Cart` OneToOne → User (CLIENT) ; `CartItem` unique `(cart, product)` ; prix toujours lu depuis `Product`
- `Order` : une commande = une boutique (`store` FK) ; panier multi-boutiques → plusieurs commandes au checkout
- `OrderItem` : snapshots `product_name_snapshot`, `unit_price`, `subtotal` (historique stable)
- Statuts : `PENDING | CONFIRMED | PROCESSING | READY | COMPLETED | CANCELLED`
- Checkout atomique : `select_for_update` produits + décrément stock + vidage panier
- Isolation : client → `user=request.user` ; vendeur → `store__owner=request.user` ; admin → tout
- **Pas de paiement** dans cette étape

### Payments (`apps.payments`) — Phase 3.5 + 5.2
- **Paiement manuel vendeur** : le client paie directement le vendeur ; **le vendeur** confirme/rejette la preuve (pas l'admin)
- `PaymentMethod` appartenant à une `Store` (CRUD `/seller/payment-methods/`)
- `Payment` OneToOne Order ; montant = `Order.total_amount`
- Statuts paiement : `PENDING → PROOF_SUBMITTED → CONFIRMED | REJECTED` (+ retry après rejet)
- `PaymentProof` : clés objet privées ; réponses API = **URLs signées** (local token ou Supabase signed URL)
- Admin : lecture seule des paiements — **aucune** action approve/reject
- Commande payée = `Payment.status == CONFIRMED` (Order passe à `CONFIRMED`)

### Category (`apps.categories.Category`)
- UUID, name, slug unique, description, icon (Lucide name), parent (self FK, SET_NULL)
- Tree: roots (`parent=null`) + children
- `scope` : `PRODUCT` | `SERVICE` | `BOTH` (défaut `BOTH` — rétrocompatible produits)
- Public `GET /categories/?for=product|service` filtre le périmètre
- Soft delete admin = `is_active=false` (protects `Product.category` / `Service.category`)
- Self-parent forbidden; multi-level cycle detection deferred
- Une seule table pour produits et services (pas de table catégories services séparée)

### Localisation (Phase 6.4 ✅) — champs sur Store & ProfessionalProfile

**Choix :** pas de table `Location` séparée. Les coordonnées sont des attributs 1:1 des boutiques / profils (déjà amorcé sur `ProfessionalProfile` en 6.1).

Champs (nullable / blank) :
- `address`, `neighborhood`, `postal_code`
- `latitude`, `longitude` (`Decimal` 9,6) — **paire obligatoire** (les deux ou aucun)
- Bornes : lat ∈ [−90, 90], lng ∈ [−180, 180]

Distance : Haversine dans `apps.core.geo` (pas de PostGIS en v1).
Rayon max : **100 km**. Position GPS utilisateur : query params uniquement, **jamais persistée**.

Découverte :
```
?latitude=&longitude=&radius=&ordering=distance
```
sur `/stores/`, `/professionals/`, `/services/` (services via coords du professionnel).

Frontend : `features/map/` — Mapbox GL (`MapView` + clustering), `/explore`, token `NEXT_PUBLIC_MAPBOX_TOKEN`.

### Seed
```bash
python manage.py seed_catalog
```
Villes : Casablanca, Rabat, Marrakech, Fès, Tanger, Tétouan, Agadir. Catégories marketplace étudiante.

## Sécurité (fondations)

- Secrets via variables d'environnement (jamais dans le code)
- CORS restrictif + `CORS_ALLOW_CREDENTIALS`
- JWT access/refresh en cookies **HttpOnly** (jamais localStorage)
- CSRF double-submit (`X-CSRFToken`)
- Settings séparés development / production
- **Frontend = UX** ; **Backend = sécurité** (toujours)

## Rôles & permissions (Phase 2 — Étape 4)

### Rôles (`user.role`)

| Rôle | Description |
|------|-------------|
| `CLIENT` | Acheteur marketplace |
| `SELLER` | Vendeur (1 boutique en v1) |
| `ADMIN` | Administrateur plateforme |

Source de vérité : `request.user.role` en base — **jamais** un champ `role` envoyé par le client.

`is_staff` / `is_superuser` (Django admin) ≠ `role == ADMIN` (API métier).

### Permissions DRF

| Permission | Règle |
|------------|--------|
| `IsAuthenticatedUser` | Utilisateur authentifié |
| `IsClient` | `role == CLIENT` |
| `IsSeller` | `role == SELLER` |
| `IsAdminRole` | `role == ADMIN` |
| `IsSellerOrAdmin` | `SELLER` ou `ADMIN` |
| `IsStoreOwner` | Object-level : `obj.owner` ou `obj.store.owner` (Phase 3+) |

Configuration globale : `DEFAULT_PERMISSION_CLASSES = IsAuthenticatedUser`.  
Les endpoints publics doivent déclarer explicitement `AllowAny`.

### Codes HTTP

| Situation | Code |
|-----------|------|
| Non authentifié | `401` |
| Authentifié mais rôle insuffisant | `403` |

### Isolation multi-vendeur (préparée)

- `IsStoreOwner` prêt pour Store / Product / Order
- Endpoints vendeur futurs filtrés par `store.owner == request.user`
- `/auth/me/` utilise uniquement `request.user` (ignore `?user_id=`)

## Multi-vendeur

- Isolation au niveau application (`store.owner = request.user`)
- Endpoints `/api/v1/seller/*` scopés automatiquement
- Table `City` pour filtrage géographique
- Extension multi-boutiques : retirer contrainte OneToOne User↔Store

## Phase 6 — Services + Géolocalisation (en cours)

Décisions validées :

1. **Migration soft des rôles** — `SELLER` reste (libellé « Professionnel ») ; on n’introduit pas encore un système multi-capabilities en base.
2. **Boutique + services** — un même `SELLER` peut avoir un `Store` **et** un `ProfessionalProfile`.
3. **Paiement services** — v1 = contact / `ServiceRequest` seulement (pas de paiement service).
4. **Carte** — **Mapbox** dès la Phase 6.5.
5. **Un professionnel peut acheter** — permission `CanShop` = `CLIENT | SELLER` (panier, commandes, paiements produits).

### Modèle cible

```
User (CLIENT | SELLER | ADMIN)
 ├── Store? → Products → Orders (paiement manuel)
 └── ProfessionalProfile? → Services (6.2) → ServiceRequest (6.6, sans paiement v1)
```

### ProfessionalProfile (`apps.professionals`) — 6.1 ✅

- OneToOne `owner` → User (`SELLER` only)
- Statuts : `DRAFT → PENDING → ACTIVE ⇄ SUSPENDED` (miroir boutique)
- Champs : display_name, headline, bio, city, phone/whatsapp, avatar/cover
- `latitude` / `longitude` nullable (préparé pour 6.4)
- Public : ACTIVE only ; seller CRUD + submit ; admin PATCH status

### Service (`apps.services` / label `pro_services`) — 6.2 ✅ + 6.3 ✅

- FK `professional_profile` ; slug unique **par** professionnel
- Statuts : `DRAFT → ACTIVE → ARCHIVED` ; images `ServiceImage` (max 8)
- `price_type` : FIXED | FROM | QUOTE ; catégorie via `categories.Category` (scope SERVICE|BOTH)
- Public list : recherche (`search`), filtres (category, city, prix, price_type, featured), ordering whitelist
- Visibilité : `Service.ACTIVE` + `ProfessionalProfile.ACTIVE` (+ ville active)
- Frontend `/services` : filtres URL-sync (même pattern que `/products`)

### ServiceRequest (`apps.services`) — 6.6 ✅

- FK `service`, `client` (User), `professional` (dérivé du service à la création)
- Statuts : `PENDING | ACCEPTED | REJECTED | CANCELLED | COMPLETED`
- Transitions centralisées (`request_transitions.py`) :
  - client : `PENDING → CANCELLED`
  - pro : `PENDING → ACCEPTED|REJECTED`, `ACCEPTED → COMPLETED`
- Permissions : client = ses demandes ; seller = demandes de son profil ; admin = lecture seule (pas de mutation de statut via API générique)
- **Pas de paiement** service en v1 (pas de copie du prix comme montant de paiement)
- Frontend : CTA sur `/services/[id]`, dashboards client/seller/admin
- Hors scope : Stripe, chat, calendrier complexe, notifications (placeholder)

### Roadmap Phase 6

| Étape | Contenu | Statut |
|-------|---------|--------|
| 6.1 | ProfessionalProfile / Prestataires | ✅ |
| 6.2 | Services | ✅ |
| 6.3 | Recherche + catégories de services | ✅ |
| 6.4 | Géoloc boutiques + prestataires | ✅ |
| 6.5 | Carte Mapbox « Explorer autour de moi » | ✅ |
| 6.6 | ServiceRequest / booking (sans paiement) | ✅ |
| 6.7 | Adaptation Client / Professionnel (UI) | ✅ |
| 6.8 | Monétisation — abonnements + Boosts (paiement manuel) | ✅ |

### Billing (`apps.billing`) — Phase 6.8 ✅

Séparé de `apps.payments` (paiements commandes vendeur↔client).

**Plans** (seed `python manage.py seed_billing`) :

| Plan | Prix | Limites / droits |
|------|------|------------------|
| STORE_FREE | 0 DH | 5 produits actifs (implicite si pas d’abo boutique) |
| STORE_STANDARD | 49 DH / 30 j | 20 produits |
| STORE_PRO | 99 DH / 30 j | produits illimités, stats avancées, Boosts |
| SERVICE_STANDARD | 39 DH / 30 j | publier services |
| SERVICE_PRO | 79 DH / 30 j | + stats / visibilité / Boosts |

Boutique et services = abonnements **indépendants** (max 1 ACTIVE par catégorie).

**Règles downgrade** : à l’expiration, pas de suppression des produits/services. Produits excédentaires restent ; publication de *nouveaux* listés bloquée. Services ACTIVE → ARCHIVED à l’expiration service ; republish après renouvellement.

**Paiements** : manuels via `PlatformPaymentMethod` (admin). Preuves dans bucket privé `billing-proofs/` (URLs signées). Admin approuve → ACTIVE + dates. Montant = prix plan backend uniquement.

**Boosts** : forfaits 7j/15 DH, 30j/39 DH ; cibles STORE|PRODUCT|SERVICE ; badge public `Promu` (`is_boosted` / `sponsored_label`). Soft ranking `-is_boosted` sans remplacer la réputation.

**URLs** : `/api/v1/billing/*` ; seller `/api/v1/seller/subscriptions|entitlements|boosts…` ; admin `/api/v1/admin/subscriptions|subscription-payments|platform-payment-methods|boost-payments…`.  
Note : `/seller/payment-methods/` reste réservé aux moyens **boutique** (commandes) ; les moyens SERVIS sont sous `/billing/payment-methods/`.

### Comptes & parcours (Phase 6.7 ✅)

Soft migration : **`SELLER` = Professionnel** (pas de rôle `SERVICE_PROVIDER`).

| Compte | Capacités |
|--------|-----------|
| Client | Achats produits + demandes de services (`/dashboard`) |
| Professionnel + boutique | Store → produits / commandes / paiements |
| Professionnel + services | ProfessionalProfile → services / ServiceRequest |
| Professionnel complet | Boutique + services + peut acheter (`CanShop`) |

Post-login : CLIENT → `/dashboard`, SELLER → `/seller`, ADMIN → `/admin` ; `?next=` respecté s’il est sûr et compatible rôle.

### Phase 7 — Refonte visuelle

| Étape | Contenu | Statut |
|-------|---------|--------|
| 7.1 | Audit + Design System (tokens, logo swap, docs) | ✅ |
| 7.2 | Landing + Navbar | pending |
| 7.3+ | Pages marketplace / dashboards | pending |

Après la Phase 6 (architecture + carte + services), la Phase 7 applique l’identité orange/noir/blanc **sans** changer les workflows métier. Spec : [`docs/design-system.md`](design-system.md).

## Phases précédentes

| Phase | Contenu |
|-------|---------|
| 2 | Auth JWT HttpOnly + Users + Rôles + Permissions ✅ |
| 3 | Boutiques, Produits, Catégories, Marketplace ✅ |
| 4 | Panier, Commandes ✅ |
| 5 | Paiement manuel + storage + prod prep ✅ |
