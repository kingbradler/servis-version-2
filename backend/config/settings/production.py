"""Production settings for SERVIS.

Loaded via DJANGO_SETTINGS_MODULE=config.settings.production (WSGI/ASGI).
Fails fast on missing/insecure required configuration.
"""

from __future__ import annotations

import os
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} must be set in production.")
    return value


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

_hosts = [
    host.strip()
    for host in _require_env("DJANGO_ALLOWED_HOSTS").split(",")
    if host.strip()
]
if not _hosts:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must list at least one host.")
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

# ── CORS / CSRF (must be explicit — no localhost defaults) ───────────

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in _require_env("CORS_ALLOWED_ORIGINS").split(",")
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in _require_env("CSRF_TRUSTED_ORIGINS").split(",")
    if origin.strip()
]
if not CORS_ALLOWED_ORIGINS or not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured(
        "CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS must be set in production."
    )

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
JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN", "") or None

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

# ── Storage — Supabase required ──────────────────────────────────────

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "supabase")
if STORAGE_BACKEND != "supabase":
    raise ImproperlyConfigured(
        "Production must use STORAGE_BACKEND=supabase "
        f"(got {STORAGE_BACKEND!r})."
    )
SUPABASE_URL = _require_env("SUPABASE_URL")
SUPABASE_SERVICE_KEY = _require_env("SUPABASE_SERVICE_KEY")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "servis")
SUPABASE_PRIVATE_BUCKET = os.getenv("SUPABASE_PRIVATE_BUCKET", "servis-private")

# Media uploads go through StorageBackend; local MEDIA_ROOT is not the CDN.
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")

# ── Email — real delivery required (no console / locmem / dummy) ─────

_INSECURE_EMAIL_BACKENDS = frozenset(
    {
        "django.core.mail.backends.console.EmailBackend",
        "django.core.mail.backends.locmem.EmailBackend",
        "django.core.mail.backends.dummy.EmailBackend",
        "django.core.mail.backends.filebased.EmailBackend",
    }
)

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
).strip()
if EMAIL_BACKEND in _INSECURE_EMAIL_BACKENDS:
    raise ImproperlyConfigured(
        "Production forbids console/locmem/dummy/filebased EMAIL_BACKEND. "
        "Set EMAIL_BACKEND to SMTP (or another real delivery backend) "
        "and configure EMAIL_HOST / credentials."
    )

EMAIL_HOST = _require_env("EMAIL_HOST")
EMAIL_HOST_USER = _require_env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = _require_env("EMAIL_HOST_PASSWORD")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() in ("1", "true", "yes")
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() in ("1", "true", "yes")

DEFAULT_FROM_EMAIL = _require_env("DEFAULT_FROM_EMAIL")
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL).strip() or DEFAULT_FROM_EMAIL

FRONTEND_URL = _require_env("FRONTEND_URL").rstrip("/")
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
