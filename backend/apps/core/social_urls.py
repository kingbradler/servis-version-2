"""Validate Instagram / TikTok / Facebook profile & media URLs."""

from __future__ import annotations

from urllib.parse import urlparse

from rest_framework import serializers

SOCIAL_HOSTS = {
    "instagram": {"instagram.com", "www.instagram.com"},
    "tiktok": {"tiktok.com", "www.tiktok.com", "vm.tiktok.com", "m.tiktok.com"},
    "facebook": {"facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"},
}

VIDEO_HOSTS = SOCIAL_HOSTS["instagram"] | SOCIAL_HOSTS["tiktok"]


def _normalize_url(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if not value.startswith(("http://", "https://")):
        value = f"https://{value}"
    return value


def validate_social_url(value: str | None, *, networks: set[str] | None = None) -> str:
    """
    Return cleaned HTTPS URL or empty string.
    networks: subset of {'instagram','tiktok','facebook'} — default all.
    """
    value = _normalize_url(value or "")
    if not value:
        return ""

    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        raise serializers.ValidationError("URL invalide.")
    host = (parsed.hostname or "").lower()
    allowed: set[str] = set()
    keys = networks or {"instagram", "tiktok", "facebook"}
    for key in keys:
        allowed |= SOCIAL_HOSTS.get(key, set())
    if host not in allowed:
        raise serializers.ValidationError(
            "Lien non autorisé. Utilisez Instagram, TikTok ou Facebook."
        )
    # Prefer https
    if parsed.scheme == "http":
        value = "https://" + value[len("http://") :]
    return value


def validate_video_url(value: str | None) -> str:
    """Product video: Instagram or TikTok only."""
    value = _normalize_url(value or "")
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        raise serializers.ValidationError("URL vidéo invalide.")
    host = (parsed.hostname or "").lower()
    if host not in VIDEO_HOSTS:
        raise serializers.ValidationError(
            "La vidéo doit être un lien Instagram ou TikTok."
        )
    if parsed.scheme == "http":
        value = "https://" + value[len("http://") :]
    return value
