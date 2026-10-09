"""Validation helpers for products and images."""

from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.files.uploadedfile import UploadedFile
from django.utils.html import strip_tags
from PIL import Image
from rest_framework import serializers

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ("JPEG",),
    "image/png": ("PNG",),
    "image/webp": ("WEBP",),
}
MIME_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
EXT_FOR_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# Magic bytes for common formats (SVG / EXE rejected)
JPEG_MAGIC = (b"\xff\xd8\xff",)
PNG_MAGIC = (b"\x89PNG\r\n\x1a\n",)
WEBP_RIFF = b"RIFF"
WEBP_WEBP = b"WEBP"


def sanitize_text(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = strip_tags(str(value)).strip()
    return cleaned.replace("<", "").replace(">", "")


def validate_price(value) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise serializers.ValidationError("Prix invalide.") from exc
    if amount <= 0:
        raise serializers.ValidationError("Le prix doit être strictement supérieur à 0.")
    if amount.as_tuple().exponent < -2:
        raise serializers.ValidationError("Le prix accepte au maximum 2 décimales.")
    return amount.quantize(Decimal("0.01"))


def validate_stock(value) -> int:
    try:
        stock = int(value)
    except (TypeError, ValueError) as exc:
        raise serializers.ValidationError("Stock invalide.") from exc
    if stock < 0:
        raise serializers.ValidationError("Le stock ne peut pas être négatif.")
    return stock


def _extension_ok(filename: str) -> bool:
    name = (filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS)


def _magic_matches(header: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return any(header.startswith(m) for m in JPEG_MAGIC)
    if content_type == "image/png":
        return any(header.startswith(m) for m in PNG_MAGIC)
    if content_type == "image/webp":
        return header.startswith(WEBP_RIFF) and WEBP_WEBP in header[:16]
    return False


def _sniff_mime(header: bytes) -> str | None:
    if any(header.startswith(m) for m in JPEG_MAGIC):
        return "image/jpeg"
    if any(header.startswith(m) for m in PNG_MAGIC):
        return "image/png"
    if header.startswith(WEBP_RIFF) and WEBP_WEBP in header[:16]:
        return "image/webp"
    return None


def validate_product_image_file(uploaded: UploadedFile) -> UploadedFile:
    """
    Validate uploaded product images by size, declared type, magic bytes, and Pillow.
    Rejects SVG, executables, and extension spoofing.
    """
    if not isinstance(uploaded, UploadedFile):
        raise serializers.ValidationError("Fichier image invalide.")

    size = getattr(uploaded, "size", None)
    if size is not None and size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Image trop volumineuse (max 5 Mo).")

    header = uploaded.read(32)
    uploaded.seek(0)
    sniffed = _sniff_mime(header)

    content_type = (uploaded.content_type or "").lower().split(";")[0].strip()
    content_type = MIME_ALIASES.get(content_type, content_type)
    # Phones often send "" or application/octet-stream; trust JPEG/PNG/WebP bytes.
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        if sniffed:
            content_type = sniffed
        else:
            raise serializers.ValidationError(
                "Format non autorisé. Formats acceptés: JPEG, PNG, WebP "
                "(pas HEIC). Sur iPhone : Réglages → Appareil photo → Formats → "
                "Le plus compatible, ou exportez en JPEG."
            )

    if not _magic_matches(header, content_type):
        if sniffed:
            content_type = sniffed
        else:
            raise serializers.ValidationError(
                "Le contenu du fichier ne correspond pas à une image JPEG/PNG/WebP."
            )

    filename = getattr(uploaded, "name", "") or ""
    if not _extension_ok(filename):
        if content_type in EXT_FOR_MIME:
            stem = Path(filename).stem or "photo"
            uploaded.name = f"{stem}{EXT_FOR_MIME[content_type]}"
        else:
            raise serializers.ValidationError(
                "Extension non autorisée. Utilisez .jpg, .jpeg, .png ou .webp."
            )

    # SVG / script sniff
    sniff = header[:200].lower()
    if b"<svg" in sniff or b"<?xml" in sniff:
        raise serializers.ValidationError("Les fichiers SVG ne sont pas autorisés.")

    try:
        with Image.open(uploaded) as img:
            img.verify()
            fmt = (img.format or "").upper()
    except Exception as exc:
        raise serializers.ValidationError("Fichier image corrompu ou invalide.") from exc
    finally:
        uploaded.seek(0)

    allowed_formats = ALLOWED_IMAGE_CONTENT_TYPES[content_type]
    if fmt not in allowed_formats:
        raise serializers.ValidationError(
            "Le type MIME ne correspond pas au contenu de l'image."
        )

    return uploaded
