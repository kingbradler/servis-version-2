"""Serializers for professional and product reviews."""

from __future__ import annotations

from django.db.models import Avg, Count
from rest_framework import serializers

from apps.orders.models import OrderItem, OrderStatus
from apps.professionals.models import ProfessionalProfile
from apps.products.models import Product
from apps.reviews.models import ProductReview, Review
from apps.services.models import ServiceRequest, ServiceRequestStatus
from apps.stores.validators import sanitize_text


class ReviewAuthorSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class ReviewProfessionalBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    slug = serializers.CharField()


class ReviewSerializer(serializers.ModelSerializer):
    author = ReviewAuthorSerializer(read_only=True)
    professional = ReviewProfessionalBriefSerializer(read_only=True)
    service_request_id = serializers.UUIDField(
        source="service_request.id", read_only=True
    )

    class Meta:
        model = Review
        fields = (
            "id",
            "author",
            "professional",
            "service_request_id",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = fields


class ReviewCreateSerializer(serializers.Serializer):
    service_request_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False, allow_blank=True, max_length=2000, default=""
    )

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        try:
            service_request = ServiceRequest.objects.select_related(
                "professional", "professional__owner", "client"
            ).get(id=attrs["service_request_id"])
        except ServiceRequest.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"service_request_id": "Demande introuvable."}
            ) from exc

        if service_request.client_id != user.id:
            raise serializers.ValidationError(
                {"service_request_id": "Cette demande ne vous appartient pas."}
            )
        if service_request.status != ServiceRequestStatus.COMPLETED:
            raise serializers.ValidationError(
                {
                    "service_request_id": (
                        "Vous ne pouvez noter qu'après une prestation terminée."
                    )
                }
            )
        if hasattr(service_request, "review"):
            raise serializers.ValidationError(
                {"service_request_id": "Un avis existe déjà pour cette demande."}
            )
        if service_request.professional.owner_id == user.id:
            raise serializers.ValidationError(
                {"service_request_id": "Vous ne pouvez pas noter votre propre profil."}
            )

        attrs["service_request"] = service_request
        attrs["comment"] = sanitize_text(attrs.get("comment") or "")
        return attrs

    def create(self, validated_data):
        service_request = validated_data["service_request"]
        return Review.objects.create(
            author=self.context["request"].user,
            professional=service_request.professional,
            service_request=service_request,
            rating=validated_data["rating"],
            comment=validated_data.get("comment") or "",
        )


class ReviewSummarySerializer(serializers.Serializer):
    professional_id = serializers.UUIDField()
    slug = serializers.CharField()
    average_rating = serializers.FloatField(allow_null=True)
    ratings_count = serializers.IntegerField()


class EligibleRequestSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    professional = ReviewProfessionalBriefSerializer()
    service_name = serializers.CharField()
    completed_at = serializers.DateTimeField()


def professional_review_summary(professional: ProfessionalProfile) -> dict:
    stats = professional.reviews.filter(is_visible=True).aggregate(
        average_rating=Avg("rating"),
        ratings_count=Count("id"),
    )
    avg = stats["average_rating"]
    return {
        "professional_id": professional.id,
        "slug": professional.slug,
        "average_rating": round(float(avg), 2) if avg is not None else None,
        "ratings_count": stats["ratings_count"] or 0,
    }


class ProductReviewSerializer(serializers.ModelSerializer):
    author = ReviewAuthorSerializer(read_only=True)
    product = serializers.SerializerMethodField()
    order_item_id = serializers.UUIDField(source="order_item.id", read_only=True)

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "author",
            "product",
            "order_item_id",
            "product_name_snapshot",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = fields

    def get_product(self, obj):
        return {
            "id": obj.product_id,
            "name": obj.product.name,
            "slug": obj.product.slug,
            "store_slug": obj.product.store.slug,
        }


class ProductReviewCreateSerializer(serializers.Serializer):
    order_item_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False, allow_blank=True, max_length=2000, default=""
    )

    def validate(self, attrs):
        user = self.context["request"].user
        try:
            item = OrderItem.objects.select_related(
                "order",
                "order__user",
                "order__store",
                "order__store__owner",
                "product",
                "product__store",
            ).get(id=attrs["order_item_id"])
        except OrderItem.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"order_item_id": "Ligne de commande introuvable."}
            ) from exc

        if item.order.user_id != user.id:
            raise serializers.ValidationError(
                {"order_item_id": "Cette commande ne vous appartient pas."}
            )
        if item.order.status != OrderStatus.COMPLETED:
            raise serializers.ValidationError(
                {
                    "order_item_id": (
                        "Vous ne pouvez noter qu'après une commande terminée."
                    )
                }
            )
        if item.product_id is None:
            raise serializers.ValidationError(
                {"order_item_id": "Ce produit n'est plus disponible pour un avis."}
            )
        if hasattr(item, "product_review"):
            raise serializers.ValidationError(
                {"order_item_id": "Un avis existe déjà pour cet article."}
            )
        if item.order.store.owner_id == user.id:
            raise serializers.ValidationError(
                {"order_item_id": "Vous ne pouvez pas noter votre propre produit."}
            )

        attrs["order_item"] = item
        attrs["comment"] = sanitize_text(attrs.get("comment") or "")
        return attrs

    def create(self, validated_data):
        item = validated_data["order_item"]
        return ProductReview.objects.create(
            author=self.context["request"].user,
            product=item.product,
            order_item=item,
            product_name_snapshot=item.product_name_snapshot,
            rating=validated_data["rating"],
            comment=validated_data.get("comment") or "",
        )


class ProductReviewSummarySerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    store_slug = serializers.CharField()
    product_slug = serializers.CharField()
    average_rating = serializers.FloatField(allow_null=True)
    ratings_count = serializers.IntegerField()


class EligibleOrderItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    product_name = serializers.CharField()
    store_name = serializers.CharField()
    store_slug = serializers.CharField()
    product_slug = serializers.CharField(allow_null=True)
    order_id = serializers.UUIDField()
    completed_at = serializers.DateTimeField()


def product_review_summary(product: Product) -> dict:
    stats = product.reviews.filter(is_visible=True).aggregate(
        average_rating=Avg("rating"),
        ratings_count=Count("id"),
    )
    avg = stats["average_rating"]
    return {
        "product_id": product.id,
        "store_slug": product.store.slug,
        "product_slug": product.slug,
        "average_rating": round(float(avg), 2) if avg is not None else None,
        "ratings_count": stats["ratings_count"] or 0,
    }
