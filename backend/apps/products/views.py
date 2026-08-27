"""Public, seller, and admin Product API views."""

from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.models import Product, ProductImage, ProductStatus
from apps.products.serializers import (
    ProductAdminSerializer,
    ProductCreateSerializer,
    ProductImageSerializer,
    ProductImageUploadSerializer,
    ProductPublicSerializer,
    ProductSellerSerializer,
    resolve_publish_status,
)
from apps.products.transitions import assert_transition
from apps.stores.models import Store, StoreStatus
from apps.users.permissions import IsAdminRole, IsSeller


def public_product_queryset():
    """ACTIVE products on ACTIVE stores in active cities; inactive categories excluded."""
    from apps.billing.models import BoostTargetType
    from apps.billing.ranking import annotate_is_boosted

    qs = (
        Product.objects.filter(
            status=ProductStatus.ACTIVE,
            store__status=StoreStatus.ACTIVE,
            store__city__is_active=True,
        )
        .filter(Q(category__isnull=True) | Q(category__is_active=True))
        .select_related("store", "category", "store__city")
        .prefetch_related("images")
    )
    return annotate_is_boosted(qs, BoostTargetType.PRODUCT)


class PublicProductListView(generics.ListAPIView):
    """Marketplace product listing — public."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProductPublicSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "name", "price"]
    ordering = ["-is_boosted", "-created_at"]

    def get_queryset(self):
        qs = public_product_queryset()
        params = self.request.query_params

        city = params.get("city")
        if city:
            qs = qs.filter(store__city__slug=city)

        category = params.get("category")
        if category:
            qs = qs.filter(category__slug=category, category__is_active=True)

        store = params.get("store")
        if store:
            qs = qs.filter(store__slug=store)

        featured = params.get("featured")
        if featured is not None and featured.lower() in ("1", "true", "yes"):
            qs = qs.filter(is_featured=True)

        min_price = params.get("min_price")
        if min_price is not None and min_price != "":
            try:
                qs = qs.filter(price__gte=Decimal(min_price))
            except (InvalidOperation, ValueError) as exc:
                raise ValidationError({"min_price": "Prix minimum invalide."}) from exc

        max_price = params.get("max_price")
        if max_price is not None and max_price != "":
            try:
                qs = qs.filter(price__lte=Decimal(max_price))
            except (InvalidOperation, ValueError) as exc:
                raise ValidationError({"max_price": "Prix maximum invalide."}) from exc

        return qs

    @extend_schema(
        tags=["Products"],
        summary="Liste des produits publics",
        parameters=[
            OpenApiParameter(name="city", required=False, type=str),
            OpenApiParameter(name="category", required=False, type=str),
            OpenApiParameter(name="store", required=False, type=str),
            OpenApiParameter(name="min_price", required=False, type=str),
            OpenApiParameter(name="max_price", required=False, type=str),
            OpenApiParameter(name="search", required=False, type=str),
            OpenApiParameter(name="featured", required=False, type=bool),
            OpenApiParameter(name="ordering", required=False, type=str),
            OpenApiParameter(name="page", required=False, type=int),
            OpenApiParameter(name="page_size", required=False, type=int),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PublicStoreProductDetailView(generics.RetrieveAPIView):
    """
    Public product detail — slug unique per store only.

    GET /api/v1/stores/{store_slug}/products/{product_slug}/
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProductPublicSerializer
    lookup_field = "slug"
    lookup_url_kwarg = "product_slug"

    def get_queryset(self):
        store_slug = self.kwargs["store_slug"]
        return public_product_queryset().filter(store__slug=store_slug)

    @extend_schema(
        tags=["Products"],
        summary="Détail produit public (store_slug + product_slug)",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SellerProductListCreateView(APIView):
    """GET list / POST create — scoped to request.user.store."""

    permission_classes = [IsSeller]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _store_or_error(self, user):
        try:
            return user.store
        except Store.DoesNotExist as exc:
            raise ValidationError(
                {"detail": "Vous devez créer une boutique avant d'ajouter des produits."}
            ) from exc

    @extend_schema(
        tags=["Seller — Products"],
        summary="Liste de mes produits",
        responses={200: ProductSellerSerializer(many=True)},
    )
    def get(self, request):
        store = self._store_or_error(request.user)
        qs = (
            Product.objects.filter(store=store)
            .select_related("category", "store")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        from apps.core.pagination import StandardPagination

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        ser = ProductSellerSerializer(page, many=True)
        return paginator.get_paginated_response(ser.data)

    @extend_schema(
        tags=["Seller — Products"],
        summary="Créer un produit",
        request=ProductCreateSerializer,
        responses={201: ProductSellerSerializer},
    )
    def post(self, request):
        self._store_or_error(request.user)
        serializer = ProductCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        product = (
            Product.objects.select_related("category", "store")
            .prefetch_related("images")
            .get(pk=product.pk)
        )
        return Response(
            ProductSellerSerializer(product).data,
            status=status.HTTP_201_CREATED,
        )


class SellerProductDetailView(APIView):
    """GET / PATCH / DELETE own product only. Cross-seller → 404."""

    permission_classes = [IsSeller]

    def _get_own_product(self, user, product_id):
        try:
            return (
                Product.objects.select_related("category", "store")
                .prefetch_related("images")
                .get(pk=product_id, store__owner=user)
            )
        except Product.DoesNotExist as exc:
            raise NotFound("Produit introuvable.") from exc

    @extend_schema(tags=["Seller — Products"], summary="Détail de mon produit")
    def get(self, request, product_id):
        product = self._get_own_product(request.user, product_id)
        return Response(ProductSellerSerializer(product).data)

    @extend_schema(tags=["Seller — Products"], summary="Modifier mon produit")
    def patch(self, request, product_id):
        product = self._get_own_product(request.user, product_id)
        serializer = ProductSellerSerializer(
            product, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSellerSerializer(product).data)

    @extend_schema(tags=["Seller — Products"], summary="Archiver mon produit (soft delete)")
    def delete(self, request, product_id):
        product = self._get_own_product(request.user, product_id)
        if product.status != ProductStatus.ARCHIVED:
            assert_transition(product.status, ProductStatus.ARCHIVED, actor="seller")
            product.status = ProductStatus.ARCHIVED
            product.save(update_fields=["status", "updated_at"])
        return Response(ProductSellerSerializer(product).data)


class SellerProductPublishView(APIView):
    """DRAFT / OUT_OF_STOCK → ACTIVE (or OUT_OF_STOCK if stock=0). Requires ACTIVE store."""

    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Products"], summary="Publier un produit")
    def post(self, request, product_id):
        try:
            product = Product.objects.select_related("store").get(
                pk=product_id, store__owner=request.user
            )
        except Product.DoesNotExist as exc:
            raise NotFound("Produit introuvable.") from exc

        target = resolve_publish_status(
            stock=product.stock, store_status=product.store.status
        )
        if product.status == target:
            return Response(ProductSellerSerializer(product).data)

        # From ARCHIVED — seller cannot republish without going via DRAFT manually?
        # Allow DRAFT → ACTIVE/OUT_OF_STOCK and OUT_OF_STOCK → ACTIVE
        if product.status == ProductStatus.ARCHIVED:
            raise ValidationError(
                {"status": "Un produit archivé ne peut pas être republier directement."}
            )
        from apps.billing.services import assert_product_becoming_listed

        assert_product_becoming_listed(request.user, product)
        assert_transition(product.status, target, actor="seller")
        product.status = target
        product.save(update_fields=["status", "updated_at"])
        return Response(
            ProductSellerSerializer(
                Product.objects.prefetch_related("images")
                .select_related("category", "store")
                .get(pk=product.pk)
            ).data
        )


class SellerProductImageListCreateView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_own_product(self, user, product_id):
        try:
            return Product.objects.get(pk=product_id, store__owner=user)
        except Product.DoesNotExist as exc:
            raise NotFound("Produit introuvable.") from exc

    @extend_schema(tags=["Seller — Products"], summary="Liste des images du produit")
    def get(self, request, product_id):
        product = self._get_own_product(request.user, product_id)
        images = product.images.all()
        return Response(ProductImageSerializer(images, many=True).data)

    @extend_schema(
        tags=["Seller — Products"],
        summary="Ajouter une image produit",
        request=ProductImageUploadSerializer,
        responses={201: ProductImageSerializer},
    )
    def post(self, request, product_id):
        product = self._get_own_product(request.user, product_id)
        serializer = ProductImageUploadSerializer(
            data=request.data, context={"product": product, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(ProductImageSerializer(image).data, status=status.HTTP_201_CREATED)


class SellerProductImageDeleteView(APIView):
    permission_classes = [IsSeller]

    @extend_schema(tags=["Seller — Products"], summary="Supprimer une image produit")
    def delete(self, request, product_id, image_id):
        try:
            image = ProductImage.objects.select_related("product__store").get(
                pk=image_id,
                product_id=product_id,
                product__store__owner=request.user,
            )
        except ProductImage.DoesNotExist as exc:
            raise NotFound("Image introuvable.") from exc

        from apps.core.storage import extract_storage_path, get_storage_backend
        from rest_framework.exceptions import ValidationError

        storage = get_storage_backend()
        key = extract_storage_path(image.image)
        if key:
            try:
                storage.delete(key, private=False)
            except Exception:
                raise ValidationError(
                    {"detail": "Impossible de supprimer le fichier. Réessayez."}
                )
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(tags=["Admin — Products"], summary="Liste admin des produits"),
    retrieve=extend_schema(tags=["Admin — Products"], summary="Détail admin produit"),
    partial_update=extend_schema(tags=["Admin — Products"], summary="Modifier un produit"),
)
class ProductAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = ProductAdminSerializer
    queryset = (
        Product.objects.select_related("store", "store__owner", "category")
        .prefetch_related("images")
        .all()
    )
    http_method_names = ["get", "patch", "post", "head", "options"]
    lookup_field = "id"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "store__slug", "category__slug", "is_featured"]
    search_fields = ["name", "slug", "store__name", "store__owner__email"]
    ordering_fields = ["created_at", "name", "price", "status"]
    ordering = ["-created_at"]

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Méthode non autorisée. Utilisez l'archive dédiée."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @extend_schema(tags=["Admin — Products"], summary="Archiver un produit")
    @action(detail=True, methods=["post"])
    def archive(self, request, id=None):
        product = self.get_object()
        if product.status != ProductStatus.ARCHIVED:
            assert_transition(product.status, ProductStatus.ARCHIVED, actor="admin")
            product.status = ProductStatus.ARCHIVED
            product.save(update_fields=["status", "updated_at"])
        return Response(ProductAdminSerializer(product).data)
