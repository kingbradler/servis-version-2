"""Public, seller, and admin Service API views."""

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, generics, status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.services.filters import ServiceOrderingFilter, apply_public_service_filters
from apps.services.models import Service, ServiceImage, ServiceStatus
from apps.services.serializers import (
    ServiceAdminSerializer,
    ServiceCreateSerializer,
    ServiceImageSerializer,
    ServiceImageUploadSerializer,
    ServicePublicSerializer,
    ServiceSellerSerializer,
    delete_service_image_file,
)
from apps.services.transitions import assert_can_publish, assert_transition
from apps.users.permissions import IsAdminRole, IsSeller


def public_service_queryset():
    from apps.billing.models import BoostTargetType
    from apps.billing.ranking import annotate_is_boosted

    qs = (
        Service.objects.filter(
            status=ServiceStatus.ACTIVE,
            professional_profile__status=ProfessionalStatus.ACTIVE,
            professional_profile__city__is_active=True,
        )
        .filter(Q(category__isnull=True) | Q(category__is_active=True))
        .select_related(
            "professional_profile",
            "professional_profile__city",
            "category",
        )
        .prefetch_related("images")
    )
    return annotate_is_boosted(qs, BoostTargetType.SERVICE)


class PublicServiceListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ServicePublicSerializer
    # Search handled in apply_public_service_filters (case-insensitive icontains)
    filter_backends = [ServiceOrderingFilter]
    ordering_fields = ["created_at", "name", "price", "distance"]
    ordering = ["-is_boosted", "-created_at"]

    def get_queryset(self):
        return apply_public_service_filters(
            public_service_queryset(), self.request.query_params
        )

    @extend_schema(
        tags=["Services"],
        summary="Liste des services publics (recherche + filtres)",
        parameters=[
            OpenApiParameter(
                name="search",
                description="Nom, description, professionnel (insensible à la casse)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="city",
                description="Slug ou UUID de ville active",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="category",
                description="Slug ou UUID de catégorie (scope SERVICE|BOTH)",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="price_type", required=False, type=str),
            OpenApiParameter(
                name="min_price",
                description="Exclut QUOTE / prix null",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="max_price",
                description="Exclut QUOTE / prix null",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="featured", required=False, type=bool),
            OpenApiParameter(
                name="latitude",
                description="Latitude utilisateur (avec longitude)",
                required=False,
                type=float,
            ),
            OpenApiParameter(
                name="longitude",
                description="Longitude utilisateur (avec latitude)",
                required=False,
                type=float,
            ),
            OpenApiParameter(
                name="radius",
                description="Rayon km max 100 (nécessite lat/lng)",
                required=False,
                type=float,
            ),
            OpenApiParameter(
                name="ordering",
                description="created_at|name|price|distance (préfixe -)",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="page", required=False, type=int),
            OpenApiParameter(name="page_size", required=False, type=int),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PublicServiceDetailView(generics.RetrieveAPIView):
    """
    Public service detail by UUID.

    Slug is unique per professional only, so public detail uses id.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ServicePublicSerializer
    lookup_field = "pk"
    lookup_url_kwarg = "service_id"

    def get_queryset(self):
        return public_service_queryset()

    @extend_schema(tags=["Services"], summary="Détail d'un service public")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerServiceListCreateView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _profile_or_error(self, user):
        try:
            return ProfessionalProfile.objects.get(owner=user)
        except ProfessionalProfile.DoesNotExist as exc:
            raise ValidationError(
                {
                    "detail": (
                        "Vous devez créer un profil professionnel "
                        "avant d'ajouter des services."
                    )
                }
            ) from exc

    @extend_schema(
        tags=["Seller — Services"],
        summary="Liste de mes services",
        responses={200: ServiceSellerSerializer(many=True)},
    )
    def get(self, request):
        profile = self._profile_or_error(request.user)
        qs = (
            Service.objects.filter(professional_profile=profile)
            .select_related("category", "professional_profile")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        from apps.core.pagination import StandardPagination

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        ser = ServiceSellerSerializer(page, many=True)
        return paginator.get_paginated_response(ser.data)

    @extend_schema(
        tags=["Seller — Services"],
        summary="Créer un service",
        request=ServiceCreateSerializer,
        responses={201: ServiceSellerSerializer},
    )
    def post(self, request):
        self._profile_or_error(request.user)
        serializer = ServiceCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        service = serializer.save()
        service = (
            Service.objects.select_related("category", "professional_profile")
            .prefetch_related("images")
            .get(pk=service.pk)
        )
        return Response(
            ServiceSellerSerializer(service).data,
            status=status.HTTP_201_CREATED,
        )


class SellerServiceDetailView(APIView):
    permission_classes = [IsSeller]

    def _get_own_service(self, user, service_id):
        try:
            return (
                Service.objects.select_related("category", "professional_profile")
                .prefetch_related("images")
                .get(pk=service_id, professional_profile__owner=user)
            )
        except Service.DoesNotExist as exc:
            raise NotFound("Service introuvable.") from exc

    @extend_schema(tags=["Seller — Services"], summary="Détail de mon service")
    def get(self, request, service_id):
        service = self._get_own_service(request.user, service_id)
        return Response(ServiceSellerSerializer(service).data)

    @extend_schema(tags=["Seller — Services"], summary="Modifier mon service")
    def patch(self, request, service_id):
        service = self._get_own_service(request.user, service_id)
        serializer = ServiceSellerSerializer(
            service, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        service = serializer.save()
        return Response(ServiceSellerSerializer(service).data)

    @extend_schema(tags=["Seller — Services"], summary="Archiver mon service (soft delete)")
    def delete(self, request, service_id):
        service = self._get_own_service(request.user, service_id)
        if service.status != ServiceStatus.ARCHIVED:
            assert_transition(service.status, ServiceStatus.ARCHIVED, actor="seller")
            service.status = ServiceStatus.ARCHIVED
            service.save(update_fields=["status", "updated_at"])
        return Response(ServiceSellerSerializer(service).data)


class SellerServicePublishView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Services"], summary="Publier un service")
    def post(self, request, service_id):
        try:
            service = Service.objects.select_related("professional_profile").get(
                pk=service_id, professional_profile__owner=request.user
            )
        except Service.DoesNotExist as exc:
            raise NotFound("Service introuvable.") from exc

        assert_can_publish(service.professional_profile.status)
        from apps.billing.services import assert_can_publish_service

        assert_can_publish_service(request.user)
        assert_transition(service.status, ServiceStatus.ACTIVE, actor="seller")
        service.status = ServiceStatus.ACTIVE
        service.save(update_fields=["status", "updated_at"])
        return Response(ServiceSellerSerializer(service).data)


class SellerServiceArchiveView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Services"], summary="Archiver un service")
    def post(self, request, service_id):
        try:
            service = Service.objects.select_related("professional_profile").get(
                pk=service_id, professional_profile__owner=request.user
            )
        except Service.DoesNotExist as exc:
            raise NotFound("Service introuvable.") from exc

        if service.status != ServiceStatus.ARCHIVED:
            assert_transition(service.status, ServiceStatus.ARCHIVED, actor="seller")
            service.status = ServiceStatus.ARCHIVED
            service.save(update_fields=["status", "updated_at"])
        return Response(ServiceSellerSerializer(service).data)


class SellerServiceImageListCreateView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    def _get_own_service(self, user, service_id):
        try:
            return Service.objects.get(
                pk=service_id, professional_profile__owner=user
            )
        except Service.DoesNotExist as exc:
            raise NotFound("Service introuvable.") from exc

    @extend_schema(tags=["Seller — Services"], summary="Liste des images de mon service")
    def get(self, request, service_id):
        service = self._get_own_service(request.user, service_id)
        images = service.images.order_by("order", "created_at")
        return Response(ServiceImageSerializer(images, many=True).data)

    @extend_schema(tags=["Seller — Services"], summary="Ajouter une image")
    def post(self, request, service_id):
        service = self._get_own_service(request.user, service_id)
        serializer = ServiceImageUploadSerializer(
            data=request.data, context={"service": service, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(
            ServiceImageSerializer(image).data, status=status.HTTP_201_CREATED
        )


class SellerServiceImageDeleteView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Services"], summary="Supprimer une image")
    def delete(self, request, service_id, image_id):
        try:
            image = ServiceImage.objects.select_related("service").get(
                pk=image_id,
                service_id=service_id,
                service__professional_profile__owner=request.user,
            )
        except ServiceImage.DoesNotExist as exc:
            raise NotFound("Image introuvable.") from exc
        delete_service_image_file(image)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = ServiceAdminSerializer
    http_method_names = ["get", "patch", "head", "options"]
    lookup_field = "id"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "category", "professional_profile"]
    search_fields = [
        "name",
        "slug",
        "professional_profile__display_name",
        "professional_profile__owner__email",
    ]
    ordering_fields = ["created_at", "name", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Service.objects.select_related(
            "category",
            "professional_profile",
            "professional_profile__owner",
        ).all()

    def partial_update(self, request, *args, **kwargs):
        service = self.get_object()
        new_status = request.data.get("status")
        if new_status is None:
            raise ValidationError({"status": "Le statut est requis."})
        if new_status not in ServiceStatus.values:
            raise ValidationError({"status": "Statut invalide."})
        assert_transition(service.status, new_status, actor="admin")
        service.status = new_status
        service.save(update_fields=["status", "updated_at"])
        return Response(ServiceAdminSerializer(service).data)
