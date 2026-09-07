"""Django e-mail backend that sends via Resend's HTTPS API.

Render (and many clouds) often hang or block outbound SMTP on port 587.
Resend's HTTP API uses HTTPS and is the reliable path in production.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _html_alternative(message) -> str | None:
    for content, mimetype in getattr(message, "alternatives", None) or []:
        if mimetype == "text/html" and content:
            return content
    return None


class ResendAPIEmailBackend(BaseEmailBackend):
    """Send mail through https://api.resend.com using EMAIL_HOST_PASSWORD as the API key."""

    def send_messages(self, email_messages) -> int:
        if not email_messages:
            return 0
        api_key = (getattr(settings, "EMAIL_HOST_PASSWORD", "") or "").strip()
        if not api_key:
            raise ValueError("EMAIL_HOST_PASSWORD (clé API Resend) is required.")
        timeout = int(getattr(settings, "EMAIL_TIMEOUT", 8) or 8)
        sent = 0
        for message in email_messages:
            if not self._send_one(message, api_key=api_key, timeout=timeout):
                if not self.fail_silently:
                    raise RuntimeError("Resend rejected or failed to send an e-mail.")
                continue
            sent += 1
        return sent

    def _send_one(self, message, *, api_key: str, timeout: int) -> bool:
        recipients = list(message.to or []) + list(message.cc or []) + list(message.bcc or [])
        recipients = [addr for addr in recipients if addr]
        if not recipients:
            return False
        payload: dict = {
            "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
            "to": recipients,
            "subject": message.subject or "",
            "text": message.body or "",
        }
        html = _html_alternative(message)
        if html:
            payload["html"] = html
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            RESEND_API_URL,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "servis-api",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return 200 <= getattr(response, "status", 200) < 300
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:500]
            logger.error("Resend HTTP %s: %s", exc.code, body)
            if not self.fail_silently:
                raise
            return False
        except Exception:
            logger.exception("Resend request failed")
            if not self.fail_silently:
                raise
            return False
