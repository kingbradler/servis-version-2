"""Public and admin City API views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stores.models import City
from apps.stores.serializers import CityAdminSerializer, CityPublicSerializer
from apps.users.permissions import IsAdminRole


class CityListView(APIView):
    """List active cities — public."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Cities"],
        summary="Liste des villes actives",
        responses={200: CityPublicSerializer(many=True)},
    )
    def get(self, request):
        qs = City.objects.filter(is_active=True).order_by("name")
        return Response(CityPublicSerializer(qs, many=True).data)


class CityDetailView(APIView):
    """Retrieve an active city by slug — public."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Cities"],
        summary="Détail d'une ville active",
        responses={200: CityPublicSerializer, 404: None},
    )
    def get(self, request, slug):
        try:
            city = City.objects.get(slug=slug, is_active=True)
        except City.DoesNotExist:
            return Response({"detail": "Ville introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CityPublicSerializer(city).data)


@extend_schema_view(
    list=extend_schema(tags=["Admin — Cities"], summary="Liste admin des villes"),
    create=extend_schema(tags=["Admin — Cities"], summary="Créer une ville"),
    retrieve=extend_schema(tags=["Admin — Cities"], summary="Détail admin ville"),
    partial_update=extend_schema(tags=["Admin — Cities"], summary="Modifier une ville"),
    destroy=extend_schema(
        tags=["Admin — Cities"],
        summary="Désactiver une ville (soft delete)",
        description="Ne supprime pas la ligne — is_active=false.",
    ),
)
class CityAdminViewSet(viewsets.ModelViewSet):
    """Admin CRUD for cities — hard destroy replaced by soft deactivate."""

    permission_classes = [IsAdminRole]
    serializer_class = CityAdminSerializer
    queryset = City.objects.all().order_by("name")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        city = self.get_object()
        city.is_active = False
        city.save(update_fields=["is_active", "updated_at"])
        return Response(
            {
                "detail": "Ville désactivée.",
                "id": str(city.id),
                "is_active": False,
            },
            status=status.HTTP_200_OK,
        )
