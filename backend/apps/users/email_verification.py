"""Email verification tokens and sending."""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.is_verified}{user.email}"


email_verification_token = EmailVerificationTokenGenerator()


def make_uid(user) -> str:
    return urlsafe_base64_encode(force_bytes(user.pk))


def decode_uid(uidb64: str):
    try:
        return force_str(urlsafe_base64_decode(uidb64))
    except (TypeError, ValueError, OverflowError):
        return None


def build_verification_url(user) -> str:
    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    uid = make_uid(user)
    token = email_verification_token.make_token(user)
    return f"{frontend}/verify-email?uid={uid}&token={token}"


def send_verification_email(user) -> bool:
    """
    Send verification email. Returns True if send_mail succeeded.
    Failures are logged — registration must not crash if mail fails.
    """
    verify_url = build_verification_url(user)
    subject = "Confirmez votre adresse e-mail — SERVIS"
    message = (
        f"Bonjour {user.first_name or 'bonjour'},\n\n"
        "Bienvenue sur SERVIS. Pour confirmer votre adresse e-mail, "
        "ouvrez ce lien :\n\n"
        f"{verify_url}\n\n"
        "Ce lien expire après quelques jours. Si vous n'avez pas créé de compte, "
        "ignorez ce message.\n\n"
        "— L'équipe SERVIS\n"
    )
    html = (
        f"<p>Bonjour {user.first_name or ''},</p>"
        "<p>Bienvenue sur <strong>SERVIS</strong>. Cliquez pour confirmer "
        "votre adresse e-mail :</p>"
        f'<p><a href="{verify_url}">Confirmer mon e-mail</a></p>'
        f"<p style='color:#888;font-size:12px'>Ou copiez ce lien :<br>{verify_url}</p>"
        "<p>— L'équipe SERVIS</p>"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)
        return False
