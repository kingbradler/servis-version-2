# API SERVIS

Base URL : `/api/v1/`

Documentation interactive (drf-spectacular) :
- Schema OpenAPI : `GET /api/schema/`
- Swagger UI : `GET /api/docs/`

## Conventions

| Aspect | Convention |
|--------|------------|
| Format | JSON |
| Auth | JWT via cookies HttpOnly (Phase 2) |
| Pagination | `?page=1&page_size=20` |
| Filtrage | Query params (`?city=tanger&status=active`) |
| Tri | `?ordering=-created_at` |
| Erreurs | `{ "detail", "code", "fields" }` |

## Endpoints Phase 1

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/api/v1/health/` | Health check |

## Endpoints prévus (phases suivantes)

### Auth
```
POST   /api/v1/auth/register/
POST   /api/v1/auth/register/seller/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
POST   /api/v1/auth/refresh/
GET    /api/v1/auth/csrf/
GET    /api/v1/auth/me/
PATCH  /api/v1/auth/me/              # first_name, last_name, phone, avatar (pas role/email)
```

`/auth/me/` expose aussi : `can_shop`, `has_store`, `has_professional_profile`.
- `register/` → rôle CLIENT ; `register/seller/` → rôle SELLER (libellé Professionnel).
- Un SELLER peut acheter (`CanShop`) et demander des services avec le même compte.
They are never returned in the JSON body and must never be stored in `localStorage`.

CSRF (double-submit): call `GET /api/v1/auth/csrf/` then send header `X-CSRFToken` on mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`).

### Marketplace (public) — Phase 3.1 + 3.2 + 3.3
```
GET    /api/v1/cities/
GET    /api/v1/cities/{slug}/
GET    /api/v1/categories/              # arbre racines + children
GET    /api/v1/categories/?parent=slug  # enfants d'une catégorie
GET    /api/v1/categories/?for=product|service  # filtre Category.scope
GET    /api/v1/categories/{slug}/
GET    /api/v1/stores/                  # ACTIVE only
       ?city=&search=&ordering=
       ?latitude=&longitude=&radius=&ordering=distance
GET    /api/v1/stores/{slug}/
GET    /api/v1/products/                # ACTIVE + store ACTIVE
       ?city=&category=&store=&min_price=&max_price=&search=&featured=&ordering=
GET    /api/v1/stores/{store_slug}/products/{product_slug}/  # slug unique par boutique
```

### Géolocalisation — Phase 6.4
Paramètres communs (`/stores/`, `/professionals/`, `/services/`) :
| Paramètre | Règle |
|-----------|--------|
| `latitude` + `longitude` | Ensemble ou absents ; bornes WGS84 |
| `radius` | km, > 0, **max 100** ; nécessite lat/lng |
| `ordering=distance` | Nécessite lat/lng ; sinon **400** (pas 500) |

Réponse `location` (public) :
```json
{
  "address": "12 Rue Mohammed V",
  "city": "Tanger",
  "neighborhood": "Centre-ville",
  "postal_code": "",
  "latitude": 35.7595,
  "longitude": -5.834
}
```
Seller : `PATCH /api/v1/seller/store/` et `PATCH /api/v1/seller/professional-profile/` acceptent adresse / quartier / lat / lng.
Privacy : GPS navigateur → frontend mémoire → query API uniquement (jamais stocké côté user).
Mapbox : Phase 6.5 — page `/explore`, `NEXT_PUBLIC_MAPBOX_TOKEN` (frontend only).

### Seller — boutique
```
GET|POST|PATCH  /api/v1/seller/store/
POST            /api/v1/seller/store/submit/   # DRAFT → PENDING
```

### Professionnels — Phase 6.1
```
GET             /api/v1/professionals/                    # ACTIVE only
                ?city=&search=&ordering=
                ?latitude=&longitude=&radius=&ordering=distance
GET             /api/v1/professionals/{slug}/
GET|POST|PATCH  /api/v1/seller/professional-profile/
POST            /api/v1/seller/professional-profile/submit/   # DRAFT → PENDING
GET|PATCH       /api/v1/admin/professionals/                  # PATCH { status }
GET|PATCH       /api/v1/admin/professionals/{id}/
```
- Rôle `SELLER` = compte professionnel (boutique et/ou profil services).
- Un même SELLER peut avoir `Store` + `ProfessionalProfile`.
- Achat produits : `CanShop` = `CLIENT | SELLER` (panier / commandes / paiements produits).
- Localisation : `address`, `neighborhood`, `postal_code`, `latitude`, `longitude` (+ objet `location`).
- Carte Mapbox : Phase 6.5 — `/explore` (frontend), token `NEXT_PUBLIC_MAPBOX_TOKEN`.

### Services professionnels — Phase 6.2 + 6.3
```
GET             /api/v1/services/                         # ACTIVE + profil ACTIVE
GET             /api/v1/services/{id}/                    # UUID (slug unique par pro seulement)
GET|POST        /api/v1/seller/services/
GET|PATCH|DELETE /api/v1/seller/services/{id}/            # DELETE = archive
POST            /api/v1/seller/services/{id}/publish/
POST            /api/v1/seller/services/{id}/archive/
GET|POST        /api/v1/seller/services/{id}/images/
DELETE          /api/v1/seller/services/{id}/images/{image_id}/
GET|PATCH       /api/v1/admin/services/
GET|PATCH       /api/v1/admin/services/{id}/              # PATCH { status }
```

#### Découverte publique `GET /api/v1/services/` (Phase 6.3)
| Paramètre | Description |
|-----------|-------------|
| `search` | Nom, description, professionnel (icontains, insensible à la casse) |
| `category` | Slug ou UUID — catégories `SERVICE` ou `BOTH` uniquement |
| `city` | Slug ou UUID — villes **actives** uniquement |
| `min_price` / `max_price` | Filtre prix ; exclut `QUOTE` et prix null |
| `price_type` | `FIXED` \| `FROM` \| `QUOTE` |
| `featured` | `true` → mis en avant |
| `latitude` / `longitude` | Position utilisateur (paire) |
| `radius` | km, max 100 |
| `ordering` | `created_at`, `name`, `price`, `distance` (préfixe `-` ; nulls last pour prix) |
| `page` / `page_size` | Pagination (compatible avec les filtres) |

Exemples :
```
/api/v1/services/?search=plombier
/api/v1/services/?category=plomberie&city=tanger
/api/v1/services/?min_price=50&max_price=500&price_type=FIXED
/api/v1/services/?featured=true&ordering=price
```

- Ownership via `ProfessionalProfile` (jamais `professional_profile` / `owner` client).
- `price_type`: `FIXED` | `FROM` | `QUOTE` (QUOTE → prix nullable).
- Workflow seller : `DRAFT → ACTIVE → ARCHIVED` (+ `DRAFT → ARCHIVED`) ; pas de republication directe depuis ARCHIVED.
- Publication uniquement si `ProfessionalProfile.status == ACTIVE`.
- Visibilité publique : `Service.ACTIVE` **et** `ProfessionalProfile.ACTIVE` (DRAFT / ARCHIVED / SUSPENDED exclus).
- Catégories : réutilise `categories.Category` + champ `scope` (`PRODUCT` \| `SERVICE` \| `BOTH`).
- Images : max 8, storage `services/{profile_id}/{service_id}/{uuid}.ext`.
- Pas de panier / paiement service dans cette phase (ServiceRequest = Phase 6.6).

### ServiceRequest — Phase 6.6 (sans paiement)
```
POST            /api/v1/service-requests/
GET             /api/v1/service-requests/
GET             /api/v1/service-requests/{id}/
POST            /api/v1/service-requests/{id}/cancel/     # client, PENDING only

GET             /api/v1/seller/service-requests/
GET             /api/v1/seller/service-requests/{id}/
POST            /api/v1/seller/service-requests/{id}/accept/
POST            /api/v1/seller/service-requests/{id}/reject/
POST            /api/v1/seller/service-requests/{id}/complete/

GET             /api/v1/admin/service-requests/           # lecture seule
GET             /api/v1/admin/service-requests/{id}/
```

Création (client / `CanShop`) :
```json
{
  "service": "UUID",
  "message": "…",
  "requested_date": "2026-08-20",
  "requested_time": "14:00",
  "address": "…",
  "phone": "+212…"
}
```
- `professional` est dérivé du service (jamais fourni par le client).
- Statuts : `PENDING` → `ACCEPTED` → `COMPLETED` ; ou `PENDING` → `REJECTED` / `CANCELLED`.
- Création si service `ACTIVE` + profil `ACTIVE` ; pas de demande sur son propre service.
- **Aucun paiement** service en v1 (pas de Stripe / preuve / montant de paiement).
- Notifications : non branchées (app `notifications` encore placeholder).

### Seller — produits
```
GET|POST         /api/v1/seller/products/
GET|PATCH|DELETE /api/v1/seller/products/{id}/   # DELETE = ARCHIVED
POST             /api/v1/seller/products/{id}/publish/
GET|POST         /api/v1/seller/products/{id}/images/
DELETE           /api/v1/seller/products/{id}/images/{image_id}/
```
`store` / `owner` / `status` / `slug` never accepted as client authority.

### Admin catalogue (IsAdminRole)
```
GET|POST         /api/v1/admin/cities/
GET|PATCH|DELETE /api/v1/admin/cities/{id}/
GET|POST         /api/v1/admin/categories/
GET|PATCH|DELETE /api/v1/admin/categories/{id}/
GET|PATCH        /api/v1/admin/stores/
GET              /api/v1/admin/stores/{id}/
POST             /api/v1/admin/stores/{id}/approve/
POST             /api/v1/admin/stores/{id}/suspend/
POST             /api/v1/admin/stores/{id}/activate/
GET|PATCH        /api/v1/admin/products/
GET              /api/v1/admin/products/{id}/
POST             /api/v1/admin/products/{id}/archive/
```
`DELETE` cities/categories = soft delete (`is_active=false`).

### Store status workflow
```
DRAFT --(seller submit)--> PENDING --(admin approve)--> ACTIVE
                                                         ↕
                                                      SUSPENDED
```
DRAFT → ACTIVE is forbidden.

### Product status workflow
```
DRAFT --> ACTIVE (publish, store must be ACTIVE, stock > 0)
DRAFT --> OUT_OF_STOCK (publish with stock = 0)
ACTIVE <--> OUT_OF_STOCK
ACTIVE|DRAFT|OUT_OF_STOCK --> ARCHIVED (seller DELETE / admin archive)
```
Public listing shows **ACTIVE** products only (store also ACTIVE).

### Client — panier & commandes (Phase 3.4)
```
GET             /api/v1/cart/
POST            /api/v1/cart/items/              # { product_id, quantity }
PATCH           /api/v1/cart/items/{id}/         # { quantity }
DELETE          /api/v1/cart/items/{id}/
DELETE          /api/v1/cart/                    # vider
POST            /api/v1/orders/                  # checkout → { count, orders[] }
GET             /api/v1/orders/
GET             /api/v1/orders/{id}/
```
Règles checkout :
- prix / total calculés côté serveur (jamais trust frontend) ;
- stock vérifié + décrémenté atomiquement ;
- 1 commande par boutique ;
- panier vidé après succès ;
- snapshots nom/prix dans `OrderItem`.

### Client — paiement manuel (Phase 3.5 révisé)
```
GET             /api/v1/orders/{id}/payment-methods/   # moyens actifs de la boutique
POST|GET        /api/v1/orders/{id}/payment/           # créer / voir
POST            /api/v1/orders/{id}/payment/proof/     # multipart: proof
```
Workflow : `PENDING → PROOF_SUBMITTED → CONFIRMED|REJECTED` (retry après REJECTED).  
Montant = `Order.total_amount`. Confirmation = **vendeur** (pas admin).  
Les champs `proof` / `proofs[].file_url` renvoient une **URL signée temporaire** (pas une URL publique permanente).  
Stockage privé : `payment-proofs/{order_id}/{uuid}.ext`.

### Seller — moyens de paiement & validation
```
GET|POST         /api/v1/seller/payment-methods/
PATCH|DELETE     /api/v1/seller/payment-methods/{id}/
GET              /api/v1/seller/orders/{id}/payment/
POST             /api/v1/seller/orders/{id}/payment/confirm/
POST             /api/v1/seller/orders/{id}/payment/reject/   # { reason }
```

### Seller — fondations commandes
```
GET    /api/v1/seller/orders/
GET    /api/v1/seller/orders/{id}/
```

### Admin — fondations commandes
```
GET    /api/v1/admin/orders/
GET    /api/v1/admin/orders/{id}/
```

### Admin — paiements (lecture seule)
```
GET    /api/v1/admin/payments/
GET    /api/v1/admin/payments/{id}/
```
**Pas** d'endpoints admin approve/reject.

### Client (prévu plus tard)
```
POST   /api/v1/reviews/
GET    /api/v1/addresses/
```

### Vendeur (`/api/v1/seller/`)
```
GET/PATCH  /seller/store/
CRUD       /seller/products/          # Phase 3.3 ✅
GET        /seller/orders/            # Phase 3.4 ✅ (lecture)
GET        /seller/orders/{id}/
PATCH      /seller/orders/{id}/status/  # futur
GET        /seller/payments/
POST       /seller/payments/{id}/verify/
POST       /seller/payments/{id}/reject/
GET        /seller/stats/             # ✅ compteurs boutique/produits/commandes/paiements
GET/PATCH  /seller/payment-config/
```

### Billing — Phase 6.8 (abonnements + Boosts)

Séparé des paiements commandes (`/payments/`, `/seller/payment-methods/` boutique).

```
GET    /api/v1/billing/plans/
GET    /api/v1/billing/boost-packages/
GET    /api/v1/billing/payment-methods/          # SERVIS (IsSeller) — pas les RIB boutique

GET    /api/v1/seller/entitlements/
GET|POST /api/v1/seller/subscriptions/
GET    /api/v1/seller/subscriptions/{id}/
POST   /api/v1/seller/subscriptions/{id}/proof/  # multipart private billing-proofs/
GET    /api/v1/seller/subscription-payments/
GET|POST /api/v1/seller/boosts/
POST   /api/v1/seller/boosts/{id}/proof/

GET    /api/v1/admin/subscriptions/
GET    /api/v1/admin/subscriptions/{id}/
GET    /api/v1/admin/subscription-payments/
POST   /api/v1/admin/subscription-payments/{id}/approve/
POST   /api/v1/admin/subscription-payments/{id}/reject/   # { rejection_reason }
GET|POST /api/v1/admin/platform-payment-methods/
PATCH|DELETE /api/v1/admin/platform-payment-methods/{id}/
GET    /api/v1/admin/boost-payments/
POST   /api/v1/admin/boost-payments/{id}/approve/
POST   /api/v1/admin/boost-payments/{id}/reject/
```

Règles : montant = plan/package backend ; seller ne peut pas s’auto-approuver ; Free boutique implicite ; limites produits à la publication ; services exigent abo SERVICE actif.

Réponses publiques produits/services : `is_boosted`, `sponsored_label` (« Promu »).

### Admin (`/api/v1/admin/`)
```
GET/PATCH  /admin/users/              # ✅ liste + is_active/role (filtres role/is_active/search)
GET/PATCH  /admin/stores/{id}/status/
CRUD       /admin/categories/
GET        /admin/orders/             # Phase 3.4 ✅
GET        /admin/orders/{id}/
GET        /admin/payments/
PATCH      /admin/reviews/{id}/moderate/
GET        /admin/stats/              # ✅ compteurs plateforme
```

## Sécurité API

- Les RIB vendeurs ne sont **jamais** exposés publiquement
- Accessibles uniquement lors du checkout / paiement d'une commande du client concerné
- Isolation vendeur : queries filtrées par `store.owner = request.user`
- Validation stricte côté serializers DRF
- Tokens JWT : access court (15 min) + refresh (7 j) en cookies HttpOnly
- **Rôles** : `CLIENT` | `SELLER` | `ADMIN` — source de vérité = `request.user.role`
- **Permissions** : `IsAuthenticatedUser`, `IsClient`, `IsSeller`, `IsAdminRole`, `IsSellerOrAdmin`, `IsStoreOwner` (futur)
- Par défaut : `IsAuthenticatedUser` — les routes publiques utilisent `AllowAny`
- `401` = non authentifié ; `403` = authentifié mais interdit
- Frontend (middleware Next.js / hooks) = UX uniquement ; le backend refuse toujours les accès non autorisés

### Access probes (Étape 4 — pas de logique métier)

```
GET /api/v1/auth/access/authenticated/   # IsAuthenticatedUser
GET /api/v1/auth/access/client/          # IsClient
GET /api/v1/auth/access/seller/          # IsSeller
GET /api/v1/auth/access/admin/           # IsAdminRole
GET /api/v1/auth/access/seller-or-admin/ # IsSellerOrAdmin
```

## Versioning

Préfixe `/api/v1/` — breaking changes futurs → `/api/v2/`.
