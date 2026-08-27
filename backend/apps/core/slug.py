"""Slug utilities for SERVIS models."""

import re
import unicodedata

from django.utils.text import slugify as django_slugify


def slugify_text(value: str) -> str:
    """
    Generate a URL-safe slug from French/Arabic-friendly text.

    Handles accents, spaces, and special characters.
    Example: "Livres & Fournitures" -> "livres-fournitures"
    """
    if not value:
        return ""

    # Normalize unicode (é -> e combining marks stripped via NFKD + slugify)
    normalized = unicodedata.normalize("NFKD", value)
    # Replace & and similar separators with space before slugify
    cleaned = re.sub(r"[&+/|]+", " ", normalized)
    slug = django_slugify(cleaned)
    return slug or "item"


def unique_slug(
    model,
    base_slug: str,
    *,
    exclude_pk=None,
    slug_field: str = "slug",
    scope_filter: dict | None = None,
) -> str:
    """
    Ensure slug uniqueness on a model, appending -2, -3, ... if needed.

    Optional scope_filter scopes uniqueness (e.g. {"store_id": ...} for products).
    """
    slug = base_slug or "item"
    candidate = slug
    counter = 2
    qs = model.objects.all()
    if scope_filter:
        qs = qs.filter(**scope_filter)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)

    while qs.filter(**{slug_field: candidate}).exists():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate
