"""Storage abstraction layer for SERVIS.

Supports local filesystem (dev) and Supabase Storage (v1),
swappable for S3/R2 later.

Apps never call Supabase directly — only via get_storage_backend().
"""

from __future__ import annotations

import json
import logging
import uuid
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO
from urllib.parse import quote

from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PROOF_EXTENSIONS = IMAGE_EXTENSIONS | {".pdf"}
SIGNED_URL_MAX_AGE = 3600  # 1 hour default


class StorageError(Exception):
    """Safe storage failure — message is client-safe (no secrets)."""


class StorageBackend(ABC):
    """Abstract storage backend interface."""

    @abstractmethod
    def upload(
        self,
        path: str,
        file: BinaryIO,
        content_type: str,
        *,
        private: bool = False,
    ) -> str:
        """Upload a file.

        Returns a storage object key (path) when private=True,
        or a public URL / key usable for public assets when private=False.
        For SERVIS: private uploads return the object key; public return a URL.
        """

    @abstractmethod
    def delete(self, path: str, *, private: bool = False) -> bool:
        """Delete a file from storage. Returns True if removed or already gone."""

    @abstractmethod
    def get_signed_url(self, path: str, expires_in: int = SIGNED_URL_MAX_AGE) -> str:
        """Generate a temporary URL for a private object."""

    @abstractmethod
    def get_public_url(self, path: str) -> str:
        """Public URL for a public object key."""


def _safe_ext(filename: str, allowed: set[str], default: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext == ".jpeg":
        ext = ".jpg"
    if ext not in allowed:
        return default
    return ext


def build_product_image_path(store_id, product_id, filename: str = "") -> str:
    """products/{store_id}/{product_id}/{uuid}.ext"""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".jpg")
    return f"products/{store_id}/{product_id}/{uuid.uuid4().hex}{ext}"


def build_store_logo_path(store_id, filename: str = "") -> str:
    """stores/{store_id}/logo/{uuid}.ext"""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".png")
    return f"stores/{store_id}/logo/{uuid.uuid4().hex}{ext}"


def build_store_banner_path(store_id, filename: str = "") -> str:
    """stores/{store_id}/banner/{uuid}.ext"""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".webp")
    return f"stores/{store_id}/banner/{uuid.uuid4().hex}{ext}"


def build_avatar_path(user_id, filename: str = "") -> str:
    """avatars/{user_id}/{uuid}.ext"""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".jpg")
    return f"avatars/{user_id}/{uuid.uuid4().hex}{ext}"


def build_service_image_path(professional_id, service_id, filename: str = "") -> str:
    """services/{professional_id}/{service_id}/{uuid}.ext"""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".jpg")
    return f"services/{professional_id}/{service_id}/{uuid.uuid4().hex}{ext}"


def build_payment_proof_path(parent_id, filename: str = "") -> str:
    """payment-proofs/{parent_id}/{uuid}.ext — private objects (order or SR)."""
    ext = _safe_ext(filename, PROOF_EXTENSIONS, ".jpg")
    return f"payment-proofs/{parent_id}/{uuid.uuid4().hex}{ext}"


def build_billing_proof_path(payment_id, filename: str = "") -> str:
    """billing-proofs/{payment_id}/{uuid}.ext — private subscription/boost proofs."""
    ext = _safe_ext(filename, PROOF_EXTENSIONS, ".jpg")
    return f"billing-proofs/{payment_id}/{uuid.uuid4().hex}{ext}"


def build_hero_slide_path(filename: str = "") -> str:
    """hero-slides/{uuid}.ext — public homepage carousel."""
    ext = _safe_ext(filename, IMAGE_EXTENSIONS, ".jpg")
    return f"hero-slides/{uuid.uuid4().hex}{ext}"


def extract_storage_path(value: str | None) -> str | None:
    """Extract object key from a stored URL or return the key if already relative."""
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    # Already an object key
    for prefix in (
        "products/",
        "stores/",
        "avatars/",
        "payment-proofs/",
        "billing-proofs/",
        "services/",
    ):
        if value.startswith(prefix):
            return value
    # Local media URL: media/products/... or /media/products/...
    for marker in ("/media/", "media/"):
        idx = value.find(marker)
        if idx != -1:
            return value[idx + len(marker) :].lstrip("/")
    # Supabase public URL
    marker = "/object/public/"
    idx = value.find(marker)
    if idx != -1:
        rest = value[idx + len(marker) :]
        # bucket/path...
        parts = rest.split("/", 1)
        if len(parts) == 2:
            return parts[1]
    # Supabase signed URL path segment
    marker = "/object/sign/"
    idx = value.find(marker)
    if idx != -1:
        rest = value[idx + len(marker) :]
        parts = rest.split("/", 1)
        if len(parts) == 2:
            # may include ?token=
            return parts[1].split("?", 1)[0]
    return None


class LocalStorageBackend(StorageBackend):
    """Local filesystem — public under MEDIA_ROOT, private under PRIVATE_MEDIA_ROOT."""

    def __init__(
        self,
        base_path: str,
        media_url: str = "/media/",
        private_base_path: str | None = None,
        signed_url_base: str = "/api/v1/storage/signed/",
    ):
        self.base_path = Path(base_path)
        self.private_base_path = Path(
            private_base_path
            or getattr(settings, "PRIVATE_MEDIA_ROOT", Path(base_path).parent / "private_media")
        )
        self.media_url = media_url if media_url.endswith("/") else f"{media_url}/"
        self.signed_url_base = signed_url_base

    def _root(self, *, private: bool) -> Path:
        return self.private_base_path if private else self.base_path

    def upload(
        self,
        path: str,
        file: BinaryIO,
        content_type: str,
        *,
        private: bool = False,
    ) -> str:
        del content_type
        dest = self._root(private=private) / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = file.read()
        dest.write_bytes(data)
        if private:
            return path  # object key only
        return f"{self.media_url}{quote(path.replace(chr(92), '/'))}"

    def delete(self, path: str, *, private: bool = False) -> bool:
        key = extract_storage_path(path) or path
        target = self._root(private=private) / key
        if target.is_file():
            target.unlink()
            return True
        # Try the other root if mis-flagged (best-effort cleanup)
        other = self._root(private=not private) / key
        if other.is_file():
            other.unlink()
            return True
        return False

    def get_public_url(self, path: str) -> str:
        key = extract_storage_path(path) or path
        return f"{self.media_url}{quote(key.replace(chr(92), '/'))}"

    def get_signed_url(self, path: str, expires_in: int = SIGNED_URL_MAX_AGE) -> str:
        key = extract_storage_path(path) or path
        token = signing.dumps(
            {"p": key, "e": int(expires_in)},
            salt="servis-storage-signed",
        )
        base = self.signed_url_base
        if not base.endswith("/"):
            base = f"{base}/"
        return f"{base}{quote(token, safe='')}/"


class SupabaseStorageBackend(StorageBackend):
    """Supabase Storage — public bucket + private bucket for proofs."""

    def __init__(
        self,
        url: str,
        service_key: str,
        bucket: str,
        private_bucket: str | None = None,
    ):
        self.url = (url or "").rstrip("/")
        self.service_key = service_key or ""
        self.bucket = bucket or "servis"
        self.private_bucket = private_bucket or getattr(
            settings, "SUPABASE_PRIVATE_BUCKET", "servis-private"
        )

    def _ensure_configured(self) -> None:
        if not self.url or not self.service_key:
            raise StorageError(
                "Stockage distant non configuré. "
                "Définir SUPABASE_URL et SUPABASE_SERVICE_KEY, "
                "ou STORAGE_BACKEND=local."
            )

    def _bucket(self, *, private: bool) -> str:
        return self.private_bucket if private else self.bucket

    def _headers(self, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def upload(
        self,
        path: str,
        file: BinaryIO,
        content_type: str,
        *,
        private: bool = False,
    ) -> str:
        self._ensure_configured()
        bucket = self._bucket(private=private)
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{path}"
        data = file.read()
        req = urllib.request.Request(
            endpoint,
            data=data,
            method="POST",
            headers={
                **self._headers(content_type),
                "x-upsert": "true",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status not in (200, 201):
                    raise StorageError("Échec de l'upload du fichier.")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:200]
            logger.warning("Supabase upload failed (%s): %s", exc.code, body)
            if exc.code == 404:
                raise StorageError(
                    "Bucket de stockage introuvable. Vérifiez la configuration."
                ) from exc
            raise StorageError("Échec de l'upload du fichier.") from exc
        except urllib.error.URLError as exc:
            logger.warning("Supabase unreachable: %s", exc)
            raise StorageError("Service de stockage indisponible.") from exc

        if private:
            return path
        return self.get_public_url(path)

    def delete(self, path: str, *, private: bool = False) -> bool:
        if not self.url or not self.service_key:
            return False
        key = extract_storage_path(path) or path
        bucket = self._bucket(private=private)
        endpoint = f"{self.url}/storage/v1/object/remove"
        payload = json.dumps({"prefixes": [key], "bucketId": bucket}).encode("utf-8")
        # Official remove uses bucket in path in some versions; try object/remove with body
        endpoint = f"{self.url}/storage/v1/object/{bucket}"
        payload = json.dumps({"prefixes": [key]}).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            method="DELETE",
            headers=self._headers("application/json"),
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status in (200, 204)
        except urllib.error.HTTPError as exc:
            logger.warning("Supabase delete failed (%s) for %s", exc.code, key)
            return False
        except urllib.error.URLError:
            return False

    def get_public_url(self, path: str) -> str:
        key = extract_storage_path(path) or path
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{key}"

    def get_signed_url(self, path: str, expires_in: int = SIGNED_URL_MAX_AGE) -> str:
        self._ensure_configured()
        key = extract_storage_path(path) or path
        bucket = self.private_bucket
        endpoint = f"{self.url}/storage/v1/object/sign/{bucket}/{key}"
        payload = json.dumps({"expiresIn": expires_in}).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            method="POST",
            headers=self._headers("application/json"),
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            logger.warning("Supabase signed URL failed (%s)", exc.code)
            raise StorageError("Impossible de générer un lien d'accès temporaire.") from exc
        except urllib.error.URLError as exc:
            raise StorageError("Service de stockage indisponible.") from exc

        signed = data.get("signedURL") or data.get("signedUrl")
        if not signed:
            raise StorageError("Impossible de générer un lien d'accès temporaire.")
        if signed.startswith("http"):
            return signed
        return f"{self.url}/storage/v1{signed}"


def resolve_local_signed_path(token: str, max_age: int = SIGNED_URL_MAX_AGE) -> str:
    """Validate a local signed token and return the private object key."""
    try:
        payload = signing.loads(
            token,
            salt="servis-storage-signed",
            max_age=max_age,
        )
    except signing.BadSignature as exc:
        raise StorageError("Lien expiré ou invalide.") from exc
    path = payload.get("p") if isinstance(payload, dict) else None
    if not path or not isinstance(path, str):
        raise StorageError("Lien expiré ou invalide.")
    # Only allow known private prefixes
    if not (
        path.startswith("payment-proofs/") or path.startswith("billing-proofs/")
    ):
        raise StorageError("Lien expiré ou invalide.")
    return path


def get_storage_backend() -> StorageBackend:
    """Factory — returns configured storage backend from settings/env."""
    backend = getattr(settings, "STORAGE_BACKEND", "local")

    if backend == "supabase":
        return SupabaseStorageBackend(
            url=settings.SUPABASE_URL,
            service_key=settings.SUPABASE_SERVICE_KEY,
            bucket=settings.SUPABASE_STORAGE_BUCKET,
            private_bucket=getattr(
                settings, "SUPABASE_PRIVATE_BUCKET", "servis-private"
            ),
        )

    if backend == "local":
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        if not str(media_url).startswith("/"):
            media_url = f"/{media_url}"
        return LocalStorageBackend(
            base_path=str(settings.MEDIA_ROOT),
            media_url=media_url,
            private_base_path=str(
                getattr(settings, "PRIVATE_MEDIA_ROOT", settings.BASE_DIR / "private_media")
            ),
            signed_url_base="/api/v1/storage/signed/",
        )

    raise ValueError(f"Unknown storage backend: {backend}")


def sign_private_url(stored: str | None, expires_in: int = SIGNED_URL_MAX_AGE) -> str | None:
    """Turn a stored private key/URL into a temporary access URL."""
    if not stored:
        return None
    key = extract_storage_path(stored) or stored
    # Legacy public media URLs for proofs — still return as absolute media if present
    if stored.startswith("http://") or stored.startswith("https://"):
        if "/object/public/" in stored:
            # Old public proofs — still return as-is (legacy) but prefer resigning if key extractable
            pass
        elif "payment-proofs/" not in stored and "/media/" not in stored and "media/" not in stored:
            return stored
    try:
        return get_storage_backend().get_signed_url(key, expires_in=expires_in)
    except StorageError:
        logger.warning("Could not sign private URL for key=%s", key[:80])
        return None
