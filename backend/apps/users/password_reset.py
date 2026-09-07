"""Password reset tokens and email sending."""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail

from apps.users.email_verification import decode_uid, make_uid, _greeting

logger = logging.getLogger(__name__)

password_reset_token = PasswordResetTokenGenerator()


def build_password_reset_url(user) -> str:
    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    uid = make_uid(user)
    token = password_reset_token.make_token(user)
    return f"{frontend}/reset-password?uid={uid}&token={token}"


def send_password_reset_email(user) -> bool:
    """
    Send password reset email. Returns True if send_mail succeeded.
    Failures are logged — request endpoint must not crash if mail fails.
    """
    reset_url = build_password_reset_url(user)
    subject = "Réinitialisation du mot de passe — SERVIS"
    message = (
        f"{_greeting(user)}\n\n"
        "Vous avez demandé à changer votre mot de passe SERVIS.\n"
        "Ouvrez ce lien pour en choisir un nouveau :\n\n"
        f"{reset_url}\n\n"
        "Le lien expire après quelques heures. Si vous n'avez rien demandé, "
        "ignorez ce message : votre mot de passe ne change pas.\n\n"
        "L'équipe SERVIS\n"
    )
    html = (
        f"<p>{_greeting(user)}</p>"
        "<p>Vous avez demandé à changer votre mot de passe "
        "<strong>SERVIS</strong>.</p>"
        f'<p><a href="{reset_url}">Choisir un nouveau mot de passe</a></p>'
        f"<p style='color:#888;font-size:12px'>Ou copiez ce lien :<br>{reset_url}</p>"
        "<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>"
        "<p>L'équipe SERVIS</p>"
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
        logger.exception("Failed to send password reset email to %s", user.email)
        return False


__all__ = [
    "build_password_reset_url",
    "decode_uid",
    "make_uid",
    "password_reset_token",
    "send_password_reset_email",
]
