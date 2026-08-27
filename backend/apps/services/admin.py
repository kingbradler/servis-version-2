from django.contrib import admin

from apps.services.models import Service, ServiceImage, ServiceRequest


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 0
    readonly_fields = ("id", "created_at")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "professional_profile",
        "category",
        "price",
        "price_type",
        "status",
        "is_featured",
        "created_at",
    )
    list_filter = ("status", "price_type", "category", "is_featured")
    search_fields = (
        "name",
        "slug",
        "professional_profile__display_name",
        "professional_profile__owner__email",
    )
    readonly_fields = ("id", "slug", "created_at", "updated_at")
    raw_id_fields = ("professional_profile", "category")
    inlines = [ServiceImageInline]


@admin.register(ServiceImage)
class ServiceImageAdmin(admin.ModelAdmin):
    list_display = ("service", "order", "alt_text", "created_at")
    raw_id_fields = ("service",)


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    """Django admin read-oriented — status changes go through API workflow only."""

    list_display = (
        "id",
        "service",
        "client",
        "professional",
        "status",
        "requested_date",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = (
        "service__name",
        "client__email",
        "professional__display_name",
        "phone",
    )
    readonly_fields = (
        "id",
        "service",
        "client",
        "professional",
        "status",
        "message",
        "requested_date",
        "requested_time",
        "address",
        "phone",
        "created_at",
        "updated_at",
    )
    raw_id_fields = ("service", "client", "professional")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
