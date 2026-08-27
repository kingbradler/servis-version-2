"""Production settings fail-fast checks (email + frontend URL)."""

from __future__ import annotations

import importlib
import os
import sys
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

_PROD_MODULE = "config.settings.production"

_BASE_ENV = {
    "DJANGO_SECRET_KEY": "production-secret-key-at-least-32-chars-long",
    "DJANGO_ALLOWED_HOSTS": "api.example.com",
    "DATABASE_URL": "postgres://servis:pass@localhost:5432/servis",
    "CORS_ALLOWED_ORIGINS": "https://www.example.com",
    "CSRF_TRUSTED_ORIGINS": "https://www.example.com",
    "SUPABASE_URL": "https://xxxx.supabase.co",
    "SUPABASE_SERVICE_KEY": "service-role-key",
    "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
    "EMAIL_HOST": "smtp.example.com",
    "EMAIL_HOST_USER": "resend",
    "EMAIL_HOST_PASSWORD": "re_test_key",
    "DEFAULT_FROM_EMAIL": "SERVIS <noreply@example.com>",
    "FRONTEND_URL": "https://www.example.com",
}


def _reload_production(env: dict):
    """Import production settings with a controlled environment."""
    # Drop cached module so env changes apply
    sys.modules.pop(_PROD_MODULE, None)
    # base is already loaded for the test runner — production imports from it
    with mock.patch.dict(os.environ, env, clear=False):
        return importlib.import_module(_PROD_MODULE)


class ProductionEmailSettingsTests(SimpleTestCase):
    def tearDown(self):
        sys.modules.pop(_PROD_MODULE, None)

    def test_rejects_console_email_backend(self):
        env = {
            **_BASE_ENV,
            "EMAIL_BACKEND": "django.core.mail.backends.console.EmailBackend",
        }
        with self.assertRaises(ImproperlyConfigured) as ctx:
            _reload_production(env)
        self.assertIn("EMAIL_BACKEND", str(ctx.exception))

    def test_rejects_localhost_frontend_url(self):
        env = {**_BASE_ENV, "FRONTEND_URL": "http://localhost:3000"}
        with self.assertRaises(ImproperlyConfigured) as ctx:
            _reload_production(env)
        self.assertIn("FRONTEND_URL", str(ctx.exception))

    def test_requires_email_host(self):
        env = {k: v for k, v in _BASE_ENV.items() if k != "EMAIL_HOST"}
        # Ensure empty if present in process env
        env["EMAIL_HOST"] = ""
        with self.assertRaises(ImproperlyConfigured) as ctx:
            _reload_production(env)
        self.assertIn("EMAIL_HOST", str(ctx.exception))

    def test_accepts_smtp_config(self):
        mod = _reload_production(_BASE_ENV)
        self.assertEqual(
            mod.EMAIL_BACKEND, "django.core.mail.backends.smtp.EmailBackend"
        )
        self.assertEqual(mod.EMAIL_HOST, "smtp.example.com")
        self.assertEqual(mod.FRONTEND_URL, "https://www.example.com")
        self.assertEqual(
            mod.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth_login"], "10/min"
        )
