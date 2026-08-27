"""Admin user management views."""

from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminRole
from apps.users.serializers import AdminUserSerializer, AdminUserUpdateSerializer

User = get_user_model()


class AdminUserListView(generics.ListAPIView):
    """List platform users — IsAdminRole only."""

    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer

    @extend_schema(
        tags=["Admin — Users"],
        summary="Lister les utilisateurs",
        parameters=[
            OpenApiParameter("role", str, description="CLIENT|SELLER|ADMIN"),
            OpenApiParameter("is_active", bool),
            OpenApiParameter("search", str, description="email, nom, prénom"),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = User.objects.all().order_by("-created_at")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None and is_active != "":
            qs = qs.filter(is_active=str(is_active).lower() in ("1", "true", "yes"))
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return qs


class AdminUserDetailView(APIView):
    """Retrieve / patch a user — IsAdminRole only."""

    permission_classes = [IsAdminRole]

    def _get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound("Utilisateur introuvable.")

    @extend_schema(
        tags=["Admin — Users"],
        summary="Détail utilisateur",
        responses={200: AdminUserSerializer, 404: OpenApiResponse()},
    )
    def get(self, request, user_id):
        user = self._get_user(user_id)
        return Response(AdminUserSerializer(user).data)

    @extend_schema(
        tags=["Admin — Users"],
        summary="Modifier un utilisateur (actif / rôle)",
        request=AdminUserUpdateSerializer,
        responses={
            200: AdminUserSerializer,
            400: OpenApiResponse(description="Validation"),
            404: OpenApiResponse(),
        },
    )
    def patch(self, request, user_id):
        user = self._get_user(user_id)
        serializer = AdminUserUpdateSerializer(
            user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_200_OK)
