"""Resend HTTPS e-mail backend (no live network)."""

from __future__ import annotations

from unittest.mock import patch

from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings

from apps.core.resend_backend import ResendAPIEmailBackend


class _FakeResponse:
    def __init__(self, status=200, body=b'{"id":"re_1"}'):
        self.status = status
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class ResendAPIEmailBackendTests(SimpleTestCase):
    @override_settings(
        EMAIL_HOST_PASSWORD="re_test_key",
        DEFAULT_FROM_EMAIL="SERVIS <noreply@example.com>",
        EMAIL_TIMEOUT=4,
    )
    def test_posts_json_to_resend(self):
        message = EmailMultiAlternatives(
            subject="Confirmez votre adresse e-mail — SERVIS",
            body="Lien de confirmation",
            from_email="SERVIS <noreply@example.com>",
            to=["client@example.com"],
        )
        message.attach_alternative("<p>Confirmer</p>", "text/html")
        captured = {}

        def fake_urlopen(request, timeout=None):
            captured["url"] = request.full_url
            captured["timeout"] = timeout
            captured["auth"] = request.get_header("Authorization")
            captured["body"] = request.data
            return _FakeResponse()

        with patch("apps.core.resend_backend.urllib.request.urlopen", fake_urlopen):
            sent = ResendAPIEmailBackend().send_messages([message])

        self.assertEqual(sent, 1)
        self.assertEqual(captured["url"], "https://api.resend.com/emails")
        self.assertEqual(captured["timeout"], 4)
        self.assertEqual(captured["auth"], "Bearer re_test_key")
        self.assertIn(b"client@example.com", captured["body"])
        self.assertIn(b"Confirmer", captured["body"])
