"""Core API views."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring and dev verification."""
    return Response(
        {
            "status": "ok",
            "service": "servis-api",
            "version": "1.0.0",
        }
    )
