"""Shared validation helpers for store fields."""

import re

from django.utils.html import strip_tags
from rest_framework import serializers


PHONE_RE = re.compile(r"^\+?[\d\s\-().]{8,20}$")


def sanitize_text(value: str | None) -> str:
    """Strip HTML tags and trim — no arbitrary HTML in store text fields."""
    if value is None:
        return ""
    cleaned = strip_tags(str(value)).strip()
    # Remove residual angle brackets
    cleaned = cleaned.replace("<", "").replace(">", "")
    return cleaned


def validate_phone(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if not PHONE_RE.match(value):
        raise serializers.ValidationError(
            "Format de téléphone invalide. Exemple: +212612345678"
        )
    return value
