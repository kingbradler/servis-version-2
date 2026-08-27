from django.contrib import admin

from apps.core.models import HeroSlide, SiteFeedback


@admin.register(SiteFeedback)
class SiteFeedbackAdmin(admin.ModelAdmin):
    list_display = ("kind", "name", "email", "is_read", "created_at")
    list_filter = ("kind", "is_read", "created_at")
    search_fields = ("name", "email", "body")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ("sort_order", "title", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "highlight", "subtitle")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("sort_order", "created_at")
