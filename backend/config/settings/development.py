"""Development settings for SERVIS."""

from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(  # noqa: F405
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,testserver,0.0.0.0",
    ).split(",")
    if host.strip()
]
# Cloud / LAN preview proxies send various Host headers.
ALLOWED_HOSTS.append("*")

CORS_ALLOW_ALL_ORIGINS = False

# Keep console emails unless EMAIL_BACKEND is set in .env (e.g. Resend SMTP).
_email_backend = os.getenv("EMAIL_BACKEND", "").strip()  # noqa: F405
if _email_backend:
    EMAIL_BACKEND = _email_backend
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Local filesystem unless STORAGE_BACKEND=supabase is set explicitly
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # noqa: F405

# Optional DATABASE_URL for local Postgres; else POSTGRES_* or SQLite
_database_url = os.getenv("DATABASE_URL", "").strip()  # noqa: F405
if _database_url:
    from urllib.parse import unquote, urlparse

    _p = urlparse(_database_url)
    if _p.scheme in ("postgres", "postgresql"):
        DATABASES = {  # noqa: F405
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": unquote(_p.path.lstrip("/")),
                "USER": unquote(_p.username or ""),
                "PASSWORD": unquote(_p.password or ""),
                "HOST": _p.hostname or "localhost",
                "PORT": str(_p.port or "5432"),
            }
        }
elif os.getenv("USE_SQLITE", "false").lower() == "true":  # noqa: F405
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
        }
    }

# Relaxed auth throttles for local iteration / test suites
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "200/min",
        "auth_register": "100/hour",
        "auth_password_reset": "60/hour",
        "auth_email": "60/hour",
    },
}
