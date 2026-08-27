"""Django admin for reviews."""

from django.contrib import admin

from apps.reviews.models import ProductReview, Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "rating",
        "professional",
        "author",
        "is_visible",
        "created_at",
    )
    list_filter = ("rating", "is_visible", "created_at")
    search_fields = (
        "comment",
        "author__email",
        "professional__display_name",
        "professional__slug",
    )
    readonly_fields = (
        "id",
        "author",
        "professional",
        "service_request",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = (
        "rating",
        "product_name_snapshot",
        "product",
        "author",
        "is_visible",
        "created_at",
    )
    list_filter = ("rating", "is_visible", "created_at")
    search_fields = (
        "comment",
        "product_name_snapshot",
        "author__email",
        "product__name",
        "product__slug",
    )
    readonly_fields = (
        "id",
        "author",
        "product",
        "order_item",
        "product_name_snapshot",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
