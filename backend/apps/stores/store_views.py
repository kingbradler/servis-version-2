"""Public, seller, and admin Store API views."""

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stores.models import Store, StoreStatus
from apps.stores.store_serializers import (
    StoreAdminSerializer,
    StoreCreateSerializer,
    StoreMediaUploadSerializer,
    StorePublicSerializer,
    StoreSellerSerializer,
)
from apps.stores.transitions import assert_transition
from apps.users.permissions import IsAdminRole, IsSeller


class PublicStoreListView(generics.ListAPIView):
    """List ACTIVE stores — public marketplace."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = StorePublicSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = []
    search_fields = ["name", "description"]

    def get_queryset(self):
        from apps.core.geo import (
            apply_geo_filter,
            apply_whitelisted_ordering,
            parse_geo_query,
        )

        qs = Store.objects.filter(
            status=StoreStatus.ACTIVE,
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
            allowed={"created_at", "name", "distance"},
            default="-created_at",
            latitude=geo["latitude"],
            longitude=geo["longitude"],
        )
        return qs

    @extend_schema(
        tags=["Stores"],
        summary="Liste des boutiques actives",
        parameters=[
            OpenApiParameter(name="city", description="Slug ville (ex: tanger)", required=False, type=str),
            OpenApiParameter(name="search", required=False, type=str),
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
                description="Rayon km (max 100, nécessite lat/lng)",
                required=False,
                type=float,
            ),
            OpenApiParameter(
                name="ordering",
                description="created_at|name|distance (préfixe -)",
                required=False,
                type=str,
            ),
            OpenApiParameter(name="page", required=False, type=int),
            OpenApiParameter(name="page_size", required=False, type=int),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PublicStoreDetailView(generics.RetrieveAPIView):
    """Retrieve an ACTIVE store by slug."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = StorePublicSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Store.objects.filter(
            status=StoreStatus.ACTIVE,
            city__is_active=True,
        ).select_related("city")

    @extend_schema(tags=["Stores"], summary="Détail d'une boutique active")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerStoreView(APIView):
    """
    GET/POST/PATCH the authenticated seller's own store.

    Identity always from request.user — never from store_id / owner payload.
    """

    permission_classes = [IsSeller]

    def _get_store(self, user):
        try:
            return Store.objects.select_related("city").get(owner=user)
        except Store.DoesNotExist:
            return None

    @extend_schema(tags=["Seller — Store"], summary="Ma boutique", responses={200: StoreSellerSerializer})
    def get(self, request):
        store = self._get_store(request.user)
        if store is None:
            raise NotFound("Vous n'avez pas encore de boutique.")
        return Response(StoreSellerSerializer(store).data)

    @extend_schema(
        tags=["Seller — Store"],
        summary="Créer ma boutique",
        request=StoreCreateSerializer,
        responses={201: StoreSellerSerializer},
    )
    def post(self, request):
        serializer = StoreCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        store = serializer.save()
        return Response(
            StoreSellerSerializer(store).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=["Seller — Store"],
        summary="Modifier ma boutique",
        request=StoreSellerSerializer,
        responses={200: StoreSellerSerializer},
    )
    def patch(self, request):
        store = self._get_store(request.user)
        if store is None:
            raise NotFound("Vous n'avez pas encore de boutique.")
        serializer = StoreSellerSerializer(
            store, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SellerStoreMediaView(APIView):
    """Upload logo or banner file for the seller's store (replaces URL pasting)."""

    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Seller — Store"],
        summary="Uploader logo ou bannière",
        request=StoreMediaUploadSerializer,
        responses={200: StoreSellerSerializer},
    )
    def post(self, request):
        try:
            store = Store.objects.select_related("city").get(owner=request.user)
        except Store.DoesNotExist as exc:
            raise NotFound("Vous n'avez pas encore de boutique.") from exc
        serializer = StoreMediaUploadSerializer(
            data=request.data, context={"store": store, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        store = serializer.save()
        return Response(StoreSellerSerializer(store).data)


class SellerStoreSubmitView(APIView):
    """DRAFT → PENDING."""

    permission_classes = [IsSeller]

    @extend_schema(
        tags=["Seller — Store"],
        summary="Soumettre la boutique pour validation",
        responses={200: StoreSellerSerializer},
    )
    def post(self, request):
        try:
            store = Store.objects.get(owner=request.user)
        except Store.DoesNotExist as exc:
            raise NotFound("Vous n'avez pas encore de boutique.") from exc

        assert_transition(store.status, StoreStatus.PENDING, actor="seller")
        store.status = StoreStatus.PENDING
        store.save(update_fields=["status", "updated_at"])
        return Response(StoreSellerSerializer(store).data)


@extend_schema_view(
    list=extend_schema(tags=["Admin — Stores"], summary="Liste admin des boutiques"),
    retrieve=extend_schema(tags=["Admin — Stores"], summary="Détail admin boutique"),
    partial_update=extend_schema(tags=["Admin — Stores"], summary="Modifier une boutique"),
)
class StoreAdminViewSet(viewsets.ModelViewSet):
    """Admin store management."""

    permission_classes = [IsAdminRole]
    serializer_class = StoreAdminSerializer
    queryset = Store.objects.select_related("city", "owner").all()
    http_method_names = ["get", "patch", "post", "head", "options"]
    lookup_field = "id"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "city__slug"]
    search_fields = ["name", "slug", "owner__email"]
    ordering_fields = ["created_at", "name", "status"]
    ordering = ["-created_at"]

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Méthode non autorisée. Utilisez les actions dédiées."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _set_status(self, store, target: str):
        assert_transition(store.status, target, actor="admin")
        store.status = target
        store.save(update_fields=["status", "updated_at"])
        return Response(StoreAdminSerializer(store).data)

    @extend_schema(tags=["Admin — Stores"], summary="Approuver (PENDING → ACTIVE)")
    @action(detail=True, methods=["post"])
    def approve(self, request, id=None):
        return self._set_status(self.get_object(), StoreStatus.ACTIVE)

    @extend_schema(tags=["Admin — Stores"], summary="Suspendre (ACTIVE → SUSPENDED)")
    @action(detail=True, methods=["post"])
    def suspend(self, request, id=None):
        store = self.get_object()
        # Allow suspending PENDING as well for moderation
        if store.status == StoreStatus.PENDING:
            store.status = StoreStatus.SUSPENDED
            store.save(update_fields=["status", "updated_at"])
            return Response(StoreAdminSerializer(store).data)
        return self._set_status(store, StoreStatus.SUSPENDED)

    @extend_schema(tags=["Admin — Stores"], summary="Réactiver (SUSPENDED → ACTIVE)")
    @action(detail=True, methods=["post"])
    def activate(self, request, id=None):
        return self._set_status(self.get_object(), StoreStatus.ACTIVE)

    def partial_update(self, request, *args, **kwargs):
        store = self.get_object()
        new_status = request.data.get("status")
        if new_status and new_status != store.status:
            assert_transition(store.status, new_status, actor="admin")
        return super().partial_update(request, *args, **kwargs)
