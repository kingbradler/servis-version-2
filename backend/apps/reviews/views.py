"""Review API views — professionals + products."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.orders.models import OrderItem, OrderStatus
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.products.models import Product
from apps.reviews.models import ProductReview, Review
from apps.reviews.serializers import (
    EligibleOrderItemSerializer,
    EligibleRequestSerializer,
    ProductReviewCreateSerializer,
    ProductReviewSerializer,
    ProductReviewSummarySerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    ReviewSummarySerializer,
    product_review_summary,
    professional_review_summary,
)
from apps.services.models import ServiceRequest, ServiceRequestStatus
from apps.users.permissions import CanShop, IsAdminRole


def _get_public_professional(slug: str) -> ProfessionalProfile:
    try:
        return ProfessionalProfile.objects.get(
            slug=slug, status=ProfessionalStatus.ACTIVE
        )
    except ProfessionalProfile.DoesNotExist as exc:
        raise NotFound("Professionnel introuvable.") from exc


def _get_product_by_slugs(store_slug: str, product_slug: str) -> Product:
    try:
        return Product.objects.select_related("store").get(
            store__slug=store_slug, slug=product_slug
        )
    except Product.DoesNotExist as exc:
        raise NotFound("Produit introuvable.") from exc


class ProfessionalReviewListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ReviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        professional = _get_public_professional(self.kwargs["slug"])
        return (
            Review.objects.filter(professional=professional, is_visible=True)
            .select_related("author", "professional", "service_request")
            .order_by("-created_at")
        )

    @extend_schema(
        tags=["Reviews"],
        summary="Avis publics d'un professionnel",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ProfessionalReviewSummaryView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Reviews"],
        summary="Moyenne et nombre d'avis d'un professionnel",
        responses={200: ReviewSummarySerializer},
    )
    def get(self, request, slug: str):
        professional = _get_public_professional(slug)
        data = professional_review_summary(professional)
        return Response(ReviewSummarySerializer(data).data)


class ReviewCreateView(generics.CreateAPIView):
    permission_classes = [CanShop]
    serializer_class = ReviewCreateSerializer

    @extend_schema(
        tags=["Reviews"],
        summary="Créer un avis (demande terminée uniquement)",
        request=ReviewCreateSerializer,
        responses={201: ReviewSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


class MyReviewsListView(generics.ListAPIView):
    permission_classes = [CanShop]
    serializer_class = ReviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            Review.objects.filter(author=self.request.user)
            .select_related("author", "professional", "service_request")
            .order_by("-created_at")
        )

    @extend_schema(tags=["Reviews"], summary="Mes avis")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class EligibleReviewRequestsView(generics.ListAPIView):
    """Completed service requests that can still receive a review."""

    permission_classes = [CanShop]
    serializer_class = EligibleRequestSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            ServiceRequest.objects.filter(
                client=self.request.user,
                status=ServiceRequestStatus.COMPLETED,
                review__isnull=True,
            )
            .select_related("professional", "service")
            .order_by("-updated_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else queryset
        payload = [
            {
                "id": row.id,
                "professional": {
                    "id": row.professional.id,
                    "display_name": row.professional.display_name,
                    "slug": row.professional.slug,
                },
                "service_name": row.service.name,
                "completed_at": row.updated_at,
            }
            for row in rows
        ]
        serializer = EligibleRequestSerializer(payload, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(
        tags=["Reviews"],
        summary="Demandes terminées éligibles à un avis",
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)


class AdminReviewHideView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Reviews"],
        summary="Masquer / réafficher un avis (modération)",
    )
    def post(self, request, review_id):
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist as exc:
            raise NotFound("Avis introuvable.") from exc
        visible = request.data.get("is_visible")
        if visible is None:
            review.is_visible = not review.is_visible
        else:
            review.is_visible = bool(visible)
        review.save(update_fields=["is_visible", "updated_at"])
        return Response(
            {
                "id": str(review.id),
                "is_visible": review.is_visible,
            }
        )


# ── Product reviews ──────────────────────────────────────────────────


class ProductReviewListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductReviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        product = _get_product_by_slugs(
            self.kwargs["store_slug"], self.kwargs["product_slug"]
        )
        return (
            ProductReview.objects.filter(product=product, is_visible=True)
            .select_related("author", "product", "product__store", "order_item")
            .order_by("-created_at")
        )

    @extend_schema(tags=["Reviews"], summary="Avis publics d'un produit")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ProductReviewSummaryView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Reviews"],
        summary="Moyenne et nombre d'avis d'un produit",
        responses={200: ProductReviewSummarySerializer},
    )
    def get(self, request, store_slug: str, product_slug: str):
        product = _get_product_by_slugs(store_slug, product_slug)
        data = product_review_summary(product)
        return Response(ProductReviewSummarySerializer(data).data)


class ProductReviewCreateView(generics.CreateAPIView):
    permission_classes = [CanShop]
    serializer_class = ProductReviewCreateSerializer

    @extend_schema(
        tags=["Reviews"],
        summary="Créer un avis produit (commande terminée)",
        request=ProductReviewCreateSerializer,
        responses={201: ProductReviewSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        review = ProductReview.objects.select_related(
            "author", "product", "product__store", "order_item"
        ).get(pk=review.pk)
        return Response(
            ProductReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


class MyProductReviewsListView(generics.ListAPIView):
    permission_classes = [CanShop]
    serializer_class = ProductReviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            ProductReview.objects.filter(author=self.request.user)
            .select_related("author", "product", "product__store", "order_item")
            .order_by("-created_at")
        )

    @extend_schema(tags=["Reviews"], summary="Mes avis produits")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class EligibleProductReviewItemsView(generics.ListAPIView):
    permission_classes = [CanShop]
    serializer_class = EligibleOrderItemSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            OrderItem.objects.filter(
                order__user=self.request.user,
                order__status=OrderStatus.COMPLETED,
                product__isnull=False,
                product_review__isnull=True,
            )
            .select_related("order", "order__store", "product", "product__store")
            .order_by("-order__updated_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else queryset
        payload = [
            {
                "id": row.id,
                "product_name": row.product_name_snapshot,
                "store_name": row.order.store_name_snapshot or row.order.store.name,
                "store_slug": row.product.store.slug if row.product_id else "",
                "product_slug": row.product.slug if row.product_id else None,
                "order_id": row.order_id,
                "completed_at": row.order.updated_at,
            }
            for row in rows
        ]
        serializer = EligibleOrderItemSerializer(payload, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(
        tags=["Reviews"],
        summary="Articles de commandes terminées éligibles à un avis",
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)


class AdminProductReviewHideView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(
        tags=["Reviews"],
        summary="Masquer / réafficher un avis produit",
    )
    def post(self, request, review_id):
        try:
            review = ProductReview.objects.get(id=review_id)
        except ProductReview.DoesNotExist as exc:
            raise NotFound("Avis produit introuvable.") from exc
        visible = request.data.get("is_visible")
        if visible is None:
            review.is_visible = not review.is_visible
        else:
            review.is_visible = bool(visible)
        review.save(update_fields=["is_visible", "updated_at"])
        return Response(
            {
                "id": str(review.id),
                "is_visible": review.is_visible,
            }
        )
