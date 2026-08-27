"""Public and admin Category API views."""

from django.db.models import Prefetch, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.categories.models import Category, CategoryScope
from apps.categories.serializers import (
    CategoryAdminSerializer,
    CategoryDetailSerializer,
    CategoryPublicSerializer,
)
from apps.users.permissions import IsAdminRole


def _scope_q(for_param: str | None):
    """Filter categories by marketplace surface: product | service | (all)."""
    if for_param == "service":
        return Q(scope=CategoryScope.SERVICE) | Q(scope=CategoryScope.BOTH)
    if for_param == "product":
        return Q(scope=CategoryScope.PRODUCT) | Q(scope=CategoryScope.BOTH)
    return Q()


def _active_children_prefetch(for_param: str | None = None):
    children_qs = Category.objects.filter(is_active=True).filter(_scope_q(for_param))
    return Prefetch(
        "children",
        queryset=children_qs.order_by("order", "name"),
    )


class CategoryListView(APIView):
    """
    List active root categories with nested active children.

    Optional ?parent=<slug> returns active children of that parent (flat list).
    Optional ?for=product|service filters by Category.scope.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Categories"],
        summary="Liste des catégories actives (arbre)",
        parameters=[
            OpenApiParameter(
                name="parent",
                description="Slug de la catégorie parente — retourne ses enfants actifs",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="for",
                description="Filtrer: product | service (scope PRODUCT/SERVICE/BOTH)",
                required=False,
                type=str,
            ),
        ],
        responses={200: CategoryPublicSerializer(many=True)},
    )
    def get(self, request):
        for_param = (request.query_params.get("for") or "").strip().lower() or None
        if for_param and for_param not in ("product", "service"):
            return Response(
                {"detail": "Paramètre for invalide (product|service)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parent_slug = request.query_params.get("parent")
        if parent_slug:
            try:
                parent = Category.objects.get(slug=parent_slug, is_active=True)
            except Category.DoesNotExist:
                return Response(
                    {"detail": "Catégorie parente introuvable."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            children = (
                Category.objects.filter(parent=parent, is_active=True)
                .filter(_scope_q(for_param))
                .order_by("order", "name")
            )
            data = CategoryDetailSerializer(children, many=True).data
            for item in data:
                item["children"] = []
            return Response(data)

        roots = (
            Category.objects.filter(parent__isnull=True, is_active=True)
            .filter(_scope_q(for_param))
            .prefetch_related(_active_children_prefetch(for_param))
            .order_by("order", "name")
        )
        return Response(CategoryPublicSerializer(roots, many=True).data)


class CategoryDetailView(APIView):
    """Retrieve an active category by slug."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Categories"],
        summary="Détail d'une catégorie active",
        responses={200: CategoryDetailSerializer, 404: None},
    )
    def get(self, request, slug):
        try:
            category = (
                Category.objects.filter(is_active=True)
                .prefetch_related(_active_children_prefetch())
                .select_related("parent")
                .get(slug=slug)
            )
        except Category.DoesNotExist:
            return Response(
                {"detail": "Catégorie introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CategoryDetailSerializer(category).data)


@extend_schema_view(
    list=extend_schema(tags=["Admin — Categories"], summary="Liste admin des catégories"),
    create=extend_schema(tags=["Admin — Categories"], summary="Créer une catégorie"),
    retrieve=extend_schema(tags=["Admin — Categories"], summary="Détail admin catégorie"),
    partial_update=extend_schema(tags=["Admin — Categories"], summary="Modifier une catégorie"),
    destroy=extend_schema(
        tags=["Admin — Categories"],
        summary="Désactiver une catégorie (soft delete)",
        description=(
            "Ne supprime pas la ligne — is_active=false. "
            "Protège les futurs Product.category FK."
        ),
    ),
)
class CategoryAdminViewSet(viewsets.ModelViewSet):
    """Admin CRUD — DELETE performs soft deactivation."""

    permission_classes = [IsAdminRole]
    serializer_class = CategoryAdminSerializer
    queryset = Category.objects.select_related("parent").all().order_by("order", "name")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        category.is_active = False
        category.save(update_fields=["is_active", "updated_at"])
        return Response(
            {
                "detail": "Catégorie désactivée (soft delete).",
                "id": str(category.id),
                "is_active": False,
            },
            status=status.HTTP_200_OK,
        )
