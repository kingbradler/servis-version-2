# Mettre SERVIS en ligne

Deux services, deux branchements :

```
Navigateur  →  Vercel (Next.js)  →  Render (Django API + Postgres)
                     cookies JWT / CSRF en HTTPS, SameSite=None
```

L’API fait confiance à `https://*.vercel.app` par défaut (`CORS_TRUST_VERCEL=true`). Vous n’avez pas besoin de connaître l’URL Vercel avant de lancer l’API.

## Étape 1 — Publier le site (Vercel)

1. Cliquez sur **Publier** dans Cursor.
2. Root Directory : **`frontend`**.
3. Laissez `NEXT_PUBLIC_API_URL` vide pour l’instant (ou `http://localhost:8000/api/v1` — le catalogue restera vide tant que l’API n’est pas en ligne).
4. Notez l’URL, ex. `https://servis-xxxx.vercel.app`.

## Étape 2 — Publier l’API (Render)

1. [Render](https://render.com) → New → Blueprint → ce dépôt (`render.yaml`).
2. Postgres + service `servis-api` sont créés. `SERVIS_BOOTSTRAP=true` : pas besoin de Supabase ni Resend pour le premier lancement.
3. Renseignez `FRONTEND_URL=https://servis-xxxx.vercel.app` (l’URL de l’étape 1).
4. Health : `https://servis-api.onrender.com/api/v1/health/` → `{"status":"ok"}`.

L’hostname Render (`RENDER_EXTERNAL_HOSTNAME`) est accepté automatiquement dans `ALLOWED_HOSTS`.

## Étape 3 — Brancher le frontend sur l’API

Dans Vercel → Settings → Environment Variables :

```text
NEXT_PUBLIC_API_URL=https://servis-api.onrender.com/api/v1
NEXT_PUBLIC_APP_URL=https://servis-xxxx.vercel.app
```

Redéployez le frontend. Accueil, catégories, login et panier parlent alors à l’API.

## Étape 4 — (plus tard) Fichiers et e-mails

| Service | Pour quoi |
|---------|-----------|
| Supabase — buckets `servis` (public) et `servis-private` | Photos produits, preuves |
| Resend SMTP | Vérification de compte, mot de passe |

Puis sur Render :

```text
SERVIS_BOOTSTRAP=false
STORAGE_BACKEND=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=<service_role>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.resend.com
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=re_xxxxxxxxx
DEFAULT_FROM_EMAIL=SERVIS <onboarding@resend.dev>
```

## Domaine perso (www + api)

Si le site est `https://www.servis-superrapid.com` et l’API
`https://api.servis-superrapid.com`, ajoutez sur **Render** :

```text
JWT_COOKIE_DOMAIN=.servis-superrapid.com
JWT_COOKIE_SAMESITE=None
FRONTEND_URL=https://www.servis-superrapid.com
```

Sans `JWT_COOKIE_DOMAIN`, le cookie de session reste sur `api.` : le site
renvoie `/admin` et `/dashboard` vers la page de connexion même si vous êtes
connecté. Après avoir ajouté la variable : **Déconnexion**, puis reconnexion,
puis ouvrez `https://www.servis-superrapid.com/admin` (pas l’admin Django de
l’API).

Pour promouvoir un compte (Supabase → SQL Editor) :

```sql
UPDATE users_user
SET role = 'ADMIN', is_staff = true, is_superuser = true, is_verified = true
WHERE lower(email) = lower('votre@email.com');
```

`role` doit être exactement `ADMIN` (majuscules).

## Checklist

- [ ] Site Vercel HTTPS
- [ ] API health 200
- [ ] `NEXT_PUBLIC_API_URL` pointe vers l’API
- [ ] Login cookie (frontend et API en HTTPS)
- [ ] Catégories visibles sur l’accueil
- [ ] (plus tard) upload image + e-mail de vérification
