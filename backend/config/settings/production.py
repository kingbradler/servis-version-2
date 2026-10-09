"""Production settings for SERVIS.

Loaded via DJANGO_SETTINGS_MODULE=config.settings.production (WSGI/ASGI).
Fails fast on missing/insecure required configuration.

Set SERVIS_BOOTSTRAP=true for a first public deploy without Supabase / SMTP.
Turn it off once storage and email are connected.
"""

from __future__ import annotations

import os
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False

BOOTSTRAP = os.getenv("SERVIS_BOOTSTRAP", "false").lower() in ("1", "true", "yes")
CORS_TRUST_VERCEL = os.getenv("CORS_TRUST_VERCEL", "true").lower() in (
    "1",
    "true",
    "yes",
)


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} must be set in production.")
    return value


def _csv_env(name: str) -> list[str]:
    return [
        item.strip()
        for item in os.getenv(name, "").split(",")
        if item.strip()
    ]


def _parse_database_url(url: str) -> dict:
    """Parse postgres:// or postgresql:// DATABASE_URL into Django DATABASES entry."""
    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ImproperlyConfigured(
            "DATABASE_URL must use postgres:// or postgresql:// scheme."
        )
    if not parsed.path or parsed.path == "/":
        raise ImproperlyConfigured("DATABASE_URL must include a database name.")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "OPTIONS": {"sslmode": os.getenv("DB_SSLMODE", "prefer")},
    }


# ── Secrets & hosts ──────────────────────────────────────────────────

_secret = _require_env("DJANGO_SECRET_KEY")
if _secret.startswith("django-insecure") or len(_secret) < 32:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be a strong secret (min 32 chars), "
        "not the insecure development default."
    )
SECRET_KEY = _secret
SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405

_hosts = _csv_env("DJANGO_ALLOWED_HOSTS")
for _platform_host_key in (
    "RENDER_EXTERNAL_HOSTNAME",
    "RAILWAY_PUBLIC_DOMAIN",
):
    _platform_host = os.getenv(_platform_host_key, "").strip()
    if _platform_host:
        _hosts.append(_platform_host)
_hosts = list(dict.fromkeys(_hosts))
if not _hosts:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must list at least one host "
        "(or rely on RENDER_EXTERNAL_HOSTNAME / RAILWAY_PUBLIC_DOMAIN)."
    )
ALLOWED_HOSTS = _hosts

# ── Database (PostgreSQL) ────────────────────────────────────────────

_database_url = os.getenv("DATABASE_URL", "").strip()
if _database_url:
    DATABASES = {"default": _parse_database_url(_database_url)}
else:
    # Explicit discrete vars (no insecure empty password silently)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _require_env("POSTGRES_DB"),
            "USER": _require_env("POSTGRES_USER"),
            "PASSWORD": _require_env("POSTGRES_PASSWORD"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        }
    }

# ── CORS / CSRF ──────────────────────────────────────────────────────
# Default: trust https://*.vercel.app so the site can go live before the
# exact Vercel URL is known. Extra origins still come from env.

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = _csv_env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _csv_env("CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGIN_REGEXES: list[str] = []

if CORS_TRUST_VERCEL:
    CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://([a-z0-9-]+\.)*vercel\.app$"]
    if "https://*.vercel.app" not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append("https://*.vercel.app")

if not CORS_ALLOWED_ORIGINS and not CORS_ALLOWED_ORIGIN_REGEXES:
    raise ImproperlyConfigured(
        "Set CORS_ALLOWED_ORIGINS or keep CORS_TRUST_VERCEL=true."
    )
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured("CSRF_TRUSTED_ORIGINS must be set in production.")

# ── Cookies & HTTPS ──────────────────────────────────────────────────

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
# Readable by SPA JS for double-submit CSRF
CSRF_COOKIE_HTTPONLY = False

JWT_COOKIE_SECURE = True
# Cross-site SPA/API: SameSite=None + Secure. Override via env if same-site.
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "None")
CSRF_COOKIE_SAMESITE = JWT_COOKIE_SAMESITE
# Parent domain (e.g. .servis-superrapid.com) so www can see the session cookie.
JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN", "") or None
CSRF_COOKIE_DOMAIN = JWT_COOKIE_DOMAIN

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() == "true"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"

# ── Static files (WhiteNoise behind Gunicorn) ────────────────────────

MIDDLEWARE = [  # noqa: F405
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],  # noqa: F405
]
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ── Storage ──────────────────────────────────────────────────────────

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "").strip() or (
    "local" if BOOTSTRAP else "supabase"
)
if STORAGE_BACKEND == "supabase":
    SUPABASE_URL = _require_env("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = _require_env("SUPABASE_SERVICE_KEY")
    SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "servis")
    SUPABASE_PRIVATE_BUCKET = os.getenv("SUPABASE_PRIVATE_BUCKET", "servis-private")
elif STORAGE_BACKEND == "local":
    if not BOOTSTRAP:
        raise ImproperlyConfigured(
            "Production must use STORAGE_BACKEND=supabase "
            "(or set SERVIS_BOOTSTRAP=true for a first deploy)."
        )
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "servis")
    SUPABASE_PRIVATE_BUCKET = os.getenv("SUPABASE_PRIVATE_BUCKET", "servis-private")
else:
    raise ImproperlyConfigured(
        f"Unknown STORAGE_BACKEND={STORAGE_BACKEND!r} (use local or supabase)."
    )

# Media uploads go through StorageBackend; local MEDIA_ROOT is not the CDN.
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")

# ── Email ────────────────────────────────────────────────────────────

_INSECURE_EMAIL_BACKENDS = frozenset(
    {
        "django.core.mail.backends.console.EmailBackend",
        "django.core.mail.backends.locmem.EmailBackend",
        "django.core.mail.backends.dummy.EmailBackend",
        "django.core.mail.backends.filebased.EmailBackend",
    }
)

_env_email_backend = os.getenv("EMAIL_BACKEND", "").strip()
_email_host = os.getenv("EMAIL_HOST", "").strip()
_email_user = os.getenv("EMAIL_HOST_USER", "").strip()
_email_password = os.getenv("EMAIL_HOST_PASSWORD", "").strip()
_is_resend = "resend.com" in _email_host.lower()
_smtp_backend = "django.core.mail.backends.smtp.EmailBackend"
_resend_backend = "apps.core.resend_backend.ResendAPIEmailBackend"

if _is_resend and _email_password and (
    not _env_email_backend or _env_email_backend == _smtp_backend
):
    # HTTPS instead of SMTP — Render often hangs on smtp.resend.com:587.
    EMAIL_BACKEND = _resend_backend
elif _env_email_backend:
    EMAIL_BACKEND = _env_email_backend
elif _email_password:
    EMAIL_BACKEND = _smtp_backend
elif BOOTSTRAP:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = _smtp_backend

if EMAIL_BACKEND in _INSECURE_EMAIL_BACKENDS and not BOOTSTRAP:
    raise ImproperlyConfigured(
        "Production forbids console/locmem/dummy/filebased EMAIL_BACKEND. "
        "Set EMAIL_BACKEND to SMTP (or another real delivery backend) "
        "and configure EMAIL_HOST / credentials."
    )

if EMAIL_BACKEND not in _INSECURE_EMAIL_BACKENDS:
    EMAIL_HOST = _require_env("EMAIL_HOST")
    EMAIL_HOST_USER = _require_env("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = _require_env("EMAIL_HOST_PASSWORD")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() in ("1", "true", "yes")
    EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() in ("1", "true", "yes")
    DEFAULT_FROM_EMAIL = _require_env("DEFAULT_FROM_EMAIL")
    SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL).strip() or DEFAULT_FROM_EMAIL
else:
    EMAIL_HOST = os.getenv("EMAIL_HOST", "")
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() in ("1", "true", "yes")
    EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() in ("1", "true", "yes")
    DEFAULT_FROM_EMAIL = os.getenv(
        "DEFAULT_FROM_EMAIL", "SERVIS <noreply@servis.local>"
    )
    SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL).strip() or DEFAULT_FROM_EMAIL

FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
if not FRONTEND_URL:
    if BOOTSTRAP:
        FRONTEND_URL = "https://servis.vercel.app"
    else:
        raise ImproperlyConfigured("FRONTEND_URL must be set in production.")
if "localhost" in FRONTEND_URL or "127.0.0.1" in FRONTEND_URL:
    raise ImproperlyConfigured(
        "FRONTEND_URL must be the public site URL in production "
        "(not localhost)."
    )

# Stricter auth throttles in production (override base)
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "10/min",
        "auth_register": "5/hour",
        "auth_password_reset": "3/hour",
        "auth_email": "3/hour",
    },
}
