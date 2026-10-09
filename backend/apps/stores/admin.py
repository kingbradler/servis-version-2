"""Django admin for City and Store."""

from django.contrib import admin

from apps.stores.models import City, Store


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "region", "is_active", "created_at")
    list_filter = ("is_active", "region")
    search_fields = ("name", "slug", "region")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "owner",
        "city",
        "neighborhood",
        "latitude",
        "longitude",
        "status",
        "created_at",
    )
    list_filter = ("status", "city", "created_at")
    search_fields = (
        "name",
        "slug",
        "owner__email",
        "phone",
        "whatsapp",
        "address",
        "neighborhood",
    )
    readonly_fields = ("id", "slug", "created_at", "updated_at")
    raw_id_fields = ("owner", "city")
    actions = ["approve_stores", "suspend_stores"]
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "id",
                    "owner",
                    "name",
                    "slug",
                    "description",
                    "logo",
                    "banner",
                    "status",
                    "phone",
                    "whatsapp",
                    "tiktok_url",
                    "youtube_url",
                    "facebook_url",
                )
            },
        ),
        (
            "Localisation",
            {
                "fields": (
                    "city",
                    "address",
                    "neighborhood",
                    "postal_code",
                    "latitude",
                    "longitude",
                )
            },
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.action(description="Approuver les boutiques sélectionnées (PENDING → ACTIVE)")
    def approve_stores(self, request, queryset):
        updated = queryset.filter(status="PENDING").update(status="ACTIVE")
        self.message_user(request, f"{updated} boutique(s) approuvée(s).")

    @admin.action(description="Suspendre les boutiques sélectionnées")
    def suspend_stores(self, request, queryset):
        updated = queryset.filter(status="ACTIVE").update(status="SUSPENDED")
        self.message_user(request, f"{updated} boutique(s) suspendue(s).")
