from django.contrib import admin

from apps.professionals.models import ProfessionalProfile


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "headline",
        "city",
        "neighborhood",
        "latitude",
        "longitude",
        "status",
        "owner",
        "created_at",
    )
    list_filter = ("status", "city")
    search_fields = (
        "display_name",
        "headline",
        "owner__email",
        "slug",
        "address",
        "neighborhood",
    )
    readonly_fields = ("id", "slug", "created_at", "updated_at")
    raw_id_fields = ("owner", "city")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "id",
                    "owner",
                    "display_name",
                    "slug",
                    "headline",
                    "bio",
                    "status",
                    "phone",
                    "whatsapp",
                    "avatar",
                    "cover",
                    "instagram_url",
                    "tiktok_url",
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
