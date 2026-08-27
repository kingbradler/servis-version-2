"""
Access-control probe endpoints.

These are NOT business features — they exist to enforce and test role gates
before Phase 3 (stores/products). Replace/extend with real seller/admin APIs later.
"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import (
    IsAdminRole,
    IsAuthenticatedUser,
    IsClient,
    IsSeller,
    IsSellerOrAdmin,
)


class AuthenticatedAccessView(APIView):
    """Any authenticated user (CLIENT / SELLER / ADMIN)."""

    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        tags=["Access"],
        summary="Contrôle d'accès — authentifié",
        responses={200: OpenApiResponse(description="Accès autorisé")},
    )
    def get(self, request):
        return Response(
            {
                "detail": "Accès autorisé.",
                "role": request.user.role,
                "scope": "authenticated",
            }
        )


class ClientAccessView(APIView):
    """CLIENT role only."""

    permission_classes = [IsClient]

    @extend_schema(
        tags=["Access"],
        summary="Contrôle d'accès — client",
        responses={200: OpenApiResponse(description="Accès client")},
    )
    def get(self, request):
        return Response(
            {
                "detail": "Accès client autorisé.",
                "role": request.user.role,
                "scope": "client",
            }
        )


class SellerAccessView(APIView):
    """SELLER role only — future /seller/* APIs."""

    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Access"],
        summary="Contrôle d'accès — vendeur",
        responses={200: OpenApiResponse(description="Accès vendeur")},
    )
    def get(self, request):
        return Response(
            {
                "detail": "Accès vendeur autorisé.",
                "role": request.user.role,
                "scope": "seller",
            }
        )


class AdminAccessView(APIView):
    """ADMIN role only — future /admin/* APIs."""

    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Access"],
        summary="Contrôle d'accès — admin",
        responses={200: OpenApiResponse(description="Accès admin")},
    )
    def get(self, request):
        return Response(
            {
                "detail": "Accès admin autorisé.",
                "role": request.user.role,
                "scope": "admin",
            }
        )


class SellerOrAdminAccessView(APIView):
    """SELLER or ADMIN."""

    permission_classes = [IsSellerOrAdmin]

    @extend_schema(
        tags=["Access"],
        summary="Contrôle d'accès — vendeur ou admin",
        responses={200: OpenApiResponse(description="Accès vendeur/admin")},
    )
    def get(self, request):
        return Response(
            {
                "detail": "Accès vendeur/admin autorisé.",
                "role": request.user.role,
                "scope": "seller_or_admin",
            }
        )
