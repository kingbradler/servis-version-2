# SERVIS

Plateforme SaaS e-commerce multi-vendeurs pour les étudiants entrepreneurs de Tanger, Maroc.

## Structure

```
servis/
├── frontend/     # Next.js + TypeScript + Tailwind CSS
├── backend/      # Django + Django REST Framework
├── docs/         # Architecture, Design System, API
└── docker-compose.yml
```

## Prérequis

- Node.js 20+
- Python 3.12+
- Docker Desktop (optionnel, pour PostgreSQL local)
- Compte Supabase (stockage fichiers en production)

## Développement local

### 1. Base de données

**SQLite (le plus simple)** — dans `backend/.env` :

```env
USE_SQLITE=true
```

**PostgreSQL (recommandé pour coller à la prod)** :

```bash
docker compose up -d
```

Puis dans `backend/.env` :

```env
USE_SQLITE=false
POSTGRES_DB=servis
POSTGRES_USER=servis
POSTGRES_PASSWORD=servis_dev_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
# ou : DATABASE_URL=postgres://servis:servis_dev_password@localhost:5432/servis
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

pip install -r requirements/development.txt
copy .env.example .env   # ou cp .env.example .env
python manage.py migrate
python manage.py seed_catalog
python manage.py runserver
```

- API : http://localhost:8000  
- Swagger : http://localhost:8000/api/docs/  
- Health : http://localhost:8000/api/v1/health/

Settings module local : `config.settings.development` (défaut de `manage.py`).

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

App : http://localhost:3000  

Light / Dark : icône soleil/lune dans la navbar (suit aussi le système).

### Stockage local vs Supabase (dev)

| `STORAGE_BACKEND` | Comportement |
|-------------------|--------------|
| `local` | `backend/media/` + `backend/private_media/` |
| `supabase` | buckets `servis` / `servis-private` (clés dans `.env` backend only) |

`SUPABASE_SERVICE_KEY` **jamais** dans Next.js.

## Production (préparation — Phase 5.3)

SERVIS est conçue pour être déployable sur n’importe quel hébergeur compatible.  
**Aucun déploiement n’est effectué par ce dépôt** : configurez vos services puis pointez les variables.

### Composants nécessaires

| Composant | Rôle |
|-----------|------|
| Frontend Next.js | UI marketplace + dashboards |
| Backend Django (Gunicorn/ASGI) | API `/api/v1/` |
| PostgreSQL | Base de données |
| Supabase Storage | Fichiers publics + preuves privées |
| HTTPS + DNS | Origines frontend/API sécurisées |

### Backend production

```bash
cd backend
pip install -r requirements/production.txt
# Définir DJANGO_SETTINGS_MODULE=config.settings.production
python manage.py collectstatic --noinput
python manage.py migrate
gunicorn config.wsgi:application
```

Tâche planifiée quotidienne (expiration + rappels J-7 / J-3 / J-1) :

```bash
cd backend
python manage.py run_billing_jobs
# Options : --dry-run | --expire-only | --remind-only
```

Variables **obligatoires** en production (voir `backend/.env.example`) :

- `DJANGO_SECRET_KEY` (fort, ≥ 32 caractères)
- `DJANGO_ALLOWED_HOSTS`
- `DATABASE_URL` **ou** `POSTGRES_*`
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` (HTTPS frontend)
- `STORAGE_BACKEND=supabase`
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
- `SUPABASE_STORAGE_BUCKET=servis`
- `SUPABASE_PRIVATE_BUCKET=servis-private`

Comportement forcé en prod :

- `DEBUG=False`
- cookies JWT / CSRF / session **Secure**
- `SameSite=None` par défaut (SPA et API sur domaines différents) — surchargeable
- `SECURE_PROXY_SSL_HEADER` pour reverse proxy
- HSTS, `X_FRAME_OPTIONS=DENY`, nosniff
- WhiteNoise pour les fichiers statiques Django
- Échec au démarrage si secret / hosts / Supabase / DB manquants

### Frontend production

```bash
cd frontend
# .env.production ou variables d’hébergeur :
# NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
# NEXT_PUBLIC_APP_URL=https://www.example.com
npm run build
npm start
```

Aucun secret Supabase côté frontend.

### Buckets Supabase (à créer manuellement)

1. `servis` — **public** (produits, logos, etc.)
2. `servis-private` — **private** (preuves commandes `payment-proofs/` + abonnements/boosts `billing-proofs/`, URLs signées via Django)

### Checklist pré-déploiement

- [ ] HTTPS sur frontend et API  
- [ ] `CORS` / `CSRF` = origines HTTPS exactes  
- [ ] Migrations PostgreSQL appliquées  
- [ ] `collectstatic` OK  
- [ ] Buckets Supabase créés  
- [ ] Test login cookie + CSRF  
- [ ] Test upload image produit + preuve privée  

## Documentation

- [Architecture](docs/architecture.md)
- [Design System](docs/design-system.md)
- [API](docs/api.md)

## Phase actuelle

**Fonctionnel — carte Explorer plein écran**

`/explore` : carte edge-to-edge sous la navbar, contrôles flottants, liste en panneau / bottom sheet.

Précédent : géoloc seller · photos plan (1/3/5) · Phase 7.7 dashboards.
