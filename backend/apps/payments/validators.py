"""Validators for payment proof files (images + PDF)."""

from django.core.files.uploadedfile import UploadedFile
from django.utils.html import strip_tags
from PIL import Image
from rest_framework import serializers

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ("JPEG",),
    "image/png": ("PNG",),
    "image/webp": ("WEBP",),
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_PDF_CONTENT_TYPES = {"application/pdf"}
ALLOWED_PDF_EXTENSIONS = {".pdf"}
MAX_PROOF_BYTES = 8 * 1024 * 1024  # 8 MB

JPEG_MAGIC = (b"\xff\xd8\xff",)
PNG_MAGIC = (b"\x89PNG\r\n\x1a\n",)
WEBP_RIFF = b"RIFF"
WEBP_WEBP = b"WEBP"
PDF_MAGIC = b"%PDF"


def sanitize_text(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = strip_tags(str(value)).strip()
    return cleaned.replace("<", "").replace(">", "")


def _ext(filename: str) -> str:
    name = (filename or "").lower()
    for ext in ALLOWED_IMAGE_EXTENSIONS | ALLOWED_PDF_EXTENSIONS:
        if name.endswith(ext):
            return ext
    return ""


def validate_proof_file(uploaded: UploadedFile) -> UploadedFile:
    """Accept JPEG/PNG/WebP/PDF — validate magic bytes / Pillow, reject SVG."""
    if not isinstance(uploaded, UploadedFile):
        raise serializers.ValidationError("Fichier invalide.")

    content_type = (uploaded.content_type or "").lower().split(";")[0].strip()
    ext = _ext(getattr(uploaded, "name", "") or "")
    size = getattr(uploaded, "size", None)
    if size is not None and size > MAX_PROOF_BYTES:
        raise serializers.ValidationError("Fichier trop volumineux (max 8 Mo).")

    header = uploaded.read(32)
    uploaded.seek(0)

    if content_type in ALLOWED_PDF_CONTENT_TYPES or ext in ALLOWED_PDF_EXTENSIONS:
        if content_type not in ALLOWED_PDF_CONTENT_TYPES:
            raise serializers.ValidationError("Type MIME PDF invalide.")
        if ext not in ALLOWED_PDF_EXTENSIONS:
            raise serializers.ValidationError("Extension PDF requise (.pdf).")
        if not header.startswith(PDF_MAGIC):
            raise serializers.ValidationError("Le fichier n'est pas un PDF valide.")
        return uploaded

    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Format non autorisé. Formats: JPEG, PNG, WebP, PDF."
        )
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(
            "Extension non autorisée (.jpg, .jpeg, .png, .webp, .pdf)."
        )

    if content_type == "image/jpeg" and not any(header.startswith(m) for m in JPEG_MAGIC):
        raise serializers.ValidationError("Contenu JPEG invalide.")
    if content_type == "image/png" and not any(header.startswith(m) for m in PNG_MAGIC):
        raise serializers.ValidationError("Contenu PNG invalide.")
    if content_type == "image/webp":
        if not (header.startswith(WEBP_RIFF) and WEBP_WEBP in header[:16]):
            raise serializers.ValidationError("Contenu WebP invalide.")

    sniff = header[:200].lower()
    if b"<svg" in sniff or b"<?xml" in sniff:
        raise serializers.ValidationError("Les fichiers SVG ne sont pas autorisés.")

    try:
        with Image.open(uploaded) as img:
            img.verify()
            fmt = (img.format or "").upper()
    except Exception as exc:
        raise serializers.ValidationError("Image corrompue ou invalide.") from exc
    finally:
        uploaded.seek(0)

    if fmt not in ALLOWED_IMAGE_CONTENT_TYPES[content_type]:
        raise serializers.ValidationError(
            "Le type MIME ne correspond pas au contenu de l'image."
        )
    return uploaded
