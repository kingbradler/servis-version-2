"""Public, seller, and admin ProfessionalProfile API views."""

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, generics, status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.professionals.serializers import (
    ProfessionalAdminSerializer,
    ProfessionalCreateSerializer,
    ProfessionalPublicSerializer,
    ProfessionalSellerSerializer,
    ProfessionalUpdateSerializer,
)
from apps.professionals.transitions import assert_transition
from apps.users.permissions import IsAdminRole, IsSeller


class PublicProfessionalListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProfessionalPublicSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["display_name", "headline", "bio"]

    def get_queryset(self):
        from apps.core.geo import (
            apply_geo_filter,
            apply_whitelisted_ordering,
            parse_geo_query,
        )

        qs = ProfessionalProfile.objects.filter(
            status=ProfessionalStatus.ACTIVE,
            city__is_active=True,
        ).select_related("city", "owner")
        city_slug = self.request.query_params.get("city")
        if city_slug:
            qs = qs.filter(city__slug=city_slug)

        geo = parse_geo_query(self.request.query_params)
        qs = apply_geo_filter(
            qs,
            latitude=geo["latitude"],
            longitude=geo["longitude"],
            radius=geo["radius"],
        )
        qs = apply_whitelisted_ordering(
            qs,
            ordering=self.request.query_params.get("ordering"),
            allowed={"created_at", "display_name", "distance"},
            default="-created_at",
            latitude=geo["latitude"],
            longitude=geo["longitude"],
        )
        return qs

    @extend_schema(
        tags=["Professionals"],
        summary="Liste des profils professionnels actifs",
        parameters=[
            OpenApiParameter(
                name="city",
                description="Slug ville (ex: tanger)",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="search", required=False, type=str),
            OpenApiParameter(name="latitude", required=False, type=float),
            OpenApiParameter(name="longitude", required=False, type=float),
            OpenApiParameter(
                name="radius",
                description="Rayon km (max 100)",
                required=False,
                type=float,
            ),
            OpenApiParameter(
                name="ordering",
                description="created_at|display_name|distance",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="page", required=False, type=int),
            OpenApiParameter(name="page_size", required=False, type=int),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PublicProfessionalDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProfessionalPublicSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return ProfessionalProfile.objects.filter(
            status=ProfessionalStatus.ACTIVE,
            city__is_active=True,
        ).select_related("city")

    @extend_schema(tags=["Professionals"], summary="Détail d'un profil professionnel actif")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerProfessionalView(APIView):
    """GET/POST/PATCH the authenticated seller's professional profile."""

    permission_classes = [IsSeller]

    def _get_profile(self, user):
        try:
            return ProfessionalProfile.objects.select_related("city").get(owner=user)
        except ProfessionalProfile.DoesNotExist:
            return None

    @extend_schema(
        tags=["Seller — Professional"],
        summary="Mon profil professionnel",
        responses={200: ProfessionalSellerSerializer},
    )
    def get(self, request):
        profile = self._get_profile(request.user)
        if profile is None:
            raise NotFound("Vous n'avez pas encore de profil professionnel.")
        return Response(ProfessionalSellerSerializer(profile).data)

    @extend_schema(
        tags=["Seller — Professional"],
        summary="Créer mon profil professionnel",
        request=ProfessionalCreateSerializer,
        responses={201: ProfessionalSellerSerializer},
    )
    def post(self, request):
        if self._get_profile(request.user) is not None:
            raise ValidationError(
                {
                    "detail": (
                        "Vous avez déjà un profil professionnel. "
                        "Utilisez PATCH pour le modifier."
                    )
                }
            )
        serializer = ProfessionalCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            ProfessionalSellerSerializer(profile).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=["Seller — Professional"],
        summary="Modifier mon profil professionnel",
        request=ProfessionalUpdateSerializer,
        responses={200: ProfessionalSellerSerializer},
    )
    def patch(self, request):
        profile = self._get_profile(request.user)
        if profile is None:
            raise NotFound("Vous n'avez pas encore de profil professionnel.")
        serializer = ProfessionalUpdateSerializer(
            profile, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(ProfessionalSellerSerializer(profile).data)


class SellerProfessionalSubmitView(APIView):
    """DRAFT → PENDING for admin review."""

    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Professional"],
        summary="Soumettre mon profil professionnel pour validation",
        responses={200: ProfessionalSellerSerializer},
    )
    def post(self, request):
        try:
            profile = ProfessionalProfile.objects.select_related("city").get(
                owner=request.user
            )
        except ProfessionalProfile.DoesNotExist as exc:
            raise NotFound("Vous n'avez pas encore de profil professionnel.") from exc

        assert_transition(profile.status, ProfessionalStatus.PENDING, actor="seller")
        profile.status = ProfessionalStatus.PENDING
        profile.save(update_fields=["status", "updated_at"])
        return Response(ProfessionalSellerSerializer(profile).data)


class ProfessionalAdminViewSet(viewsets.ModelViewSet):
    """Admin moderation of professional profiles."""

    permission_classes = [IsAdminRole]
    serializer_class = ProfessionalAdminSerializer
    http_method_names = ["get", "patch", "head", "options"]
    lookup_field = "id"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["display_name", "headline", "owner__email"]
    ordering_fields = ["created_at", "display_name", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ProfessionalProfile.objects.select_related("city", "owner").all()

    def partial_update(self, request, *args, **kwargs):
        profile = self.get_object()
        new_status = request.data.get("status")
        if new_status is None:
            raise ValidationError({"status": "Le statut est requis."})
        if new_status not in ProfessionalStatus.values:
            raise ValidationError({"status": "Statut invalide."})
        assert_transition(profile.status, new_status, actor="admin")
        profile.status = new_status
        profile.save(update_fields=["status", "updated_at"])
        return Response(ProfessionalAdminSerializer(profile).data)
