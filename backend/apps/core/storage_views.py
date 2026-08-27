"""Authenticated / signed access to private storage objects."""

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils.encoding import escape_uri_path
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.storage import StorageError, resolve_local_signed_path


class SignedStorageDownloadView(APIView):
    """
    Resolve a short-lived signed token to a private file (local backend).

    No session auth required — possession of a valid token is the capability
    (mirrors Supabase signed URLs). Tokens are only issued after Django
    permission checks in payment serializers.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Storage"],
        summary="Télécharger un fichier privé via URL signée",
    )
    def get(self, request, token: str):
        try:
            path = resolve_local_signed_path(token)
        except StorageError as exc:
            raise Http404(str(exc)) from exc

        root = Path(getattr(settings, "PRIVATE_MEDIA_ROOT", settings.BASE_DIR / "private_media"))
        file_path = (root / path).resolve()
        try:
            file_path.relative_to(root.resolve())
        except ValueError as exc:
            raise Http404("Fichier introuvable.") from exc
        if not file_path.is_file():
            raise Http404("Fichier introuvable.")

        suffix = file_path.suffix.lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
        }.get(suffix, "application/octet-stream")

        as_attachment = str(request.query_params.get("download", "")).lower() in (
            "1",
            "true",
            "yes",
        )
        filename = file_path.name or f"preuve{suffix or '.bin'}"

        response = FileResponse(
            file_path.open("rb"),
            content_type=content_type,
            as_attachment=as_attachment,
            filename=filename,
        )
        if not as_attachment:
            response["Content-Disposition"] = (
                f'inline; filename="{escape_uri_path(filename)}"'
            )
        return response
