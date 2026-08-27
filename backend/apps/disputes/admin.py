from django.contrib import admin

from apps.disputes.models import Dispute


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "reason",
        "opened_by",
        "order",
        "service_request",
        "created_at",
    )
    list_filter = ("status", "reason", "created_at")
    search_fields = ("id", "opened_by__email", "description")
    readonly_fields = (
        "id",
        "opened_by",
        "order",
        "service_request",
        "reason",
        "description",
        "seller_reply",
        "created_at",
        "updated_at",
    )
