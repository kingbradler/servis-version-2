"""Django admin configuration for User model."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from apps.users.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for the custom User model."""

    ordering = ("-created_at",)
    list_display = (
        "email",
        "full_name",
        "role",
        "is_verified",
        "is_active",
        "is_staff",
        "created_at",
    )
    list_filter = ("role", "is_verified", "is_active", "is_staff", "created_at")
    search_fields = ("email", "first_name", "last_name", "phone")
    readonly_fields = ("id", "created_at", "updated_at", "email_verified_at", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Informations personnelles"), {"fields": ("first_name", "last_name", "phone", "avatar")}),
        (_("Rôle & vérification"), {"fields": ("role", "is_verified", "email_verified_at")}),
        (
            _("Permissions"),
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        (_("Dates"), {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    @admin.display(description="Nom complet")
    def full_name(self, obj: User) -> str:
        return obj.full_name
