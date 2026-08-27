from django.contrib import admin

from apps.billing.models import (
    Boost,
    BoostPackage,
    BoostPayment,
    Plan,
    PlatformPaymentMethod,
    Subscription,
    SubscriptionPayment,
)


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "category",
        "price",
        "product_limit",
        "product_image_limit",
        "boosts_allowed",
        "is_active",
        "sort_order",
    )
    list_filter = ("category", "is_active")
    search_fields = ("code", "name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "plan",
        "category",
        "status",
        "starts_at",
        "expires_at",
    )
    list_filter = ("status", "category")
    search_fields = ("owner__email", "plan__code")
    raw_id_fields = ("owner", "plan")


@admin.register(PlatformPaymentMethod)
class PlatformPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "account_name", "account_number", "is_active", "sort_order")
    list_filter = ("is_active",)


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "amount",
        "status",
        "payment_method",
        "submitted_at",
        "reviewed_at",
    )
    list_filter = ("status",)
    raw_id_fields = ("subscription", "owner", "payment_method", "reviewed_by")


@admin.register(BoostPackage)
class BoostPackageAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "duration_days", "price", "is_active")


@admin.register(BoostPayment)
class BoostPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "amount", "status", "reviewed_at")
    list_filter = ("status",)
    raw_id_fields = ("owner", "payment_method", "reviewed_by")


@admin.register(Boost)
class BoostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "target_type",
        "target_id",
        "status",
        "starts_at",
        "expires_at",
        "amount",
    )
    list_filter = ("status", "target_type")
    raw_id_fields = ("owner", "package", "payment")
