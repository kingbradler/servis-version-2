"""Django admin for store payment methods and payments (read/manage, no confirm)."""

from django.contrib import admin

from apps.payments.models import Payment, PaymentMethod, PaymentProof


class PaymentProofInline(admin.TabularInline):
    model = PaymentProof
    extra = 0
    readonly_fields = (
        "file_url",
        "uploaded_by",
        "uploaded_at",
        "status",
        "rejection_reason",
    )


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = (
        "label",
        "store",
        "type",
        "account_name",
        "is_active",
        "created_at",
    )
    list_filter = ("type", "is_active", "store")
    search_fields = ("label", "account_name", "account_number", "store__name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "service_request",
        "amount",
        "currency",
        "status",
        "payment_method",
        "created_at",
    )
    list_filter = ("status", "currency", "created_at")
    search_fields = (
        "id",
        "order__id",
        "order__user__email",
        "service_request__id",
        "service_request__client__email",
    )
    readonly_fields = (
        "id",
        "order",
        "service_request",
        "payment_method",
        "amount",
        "currency",
        "status",
        "proof",
        "proof_uploaded_at",
        "seller_reviewed_at",
        "seller_rejection_reason",
        "created_at",
        "updated_at",
    )
    inlines = [PaymentProofInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentProof)
class PaymentProofAdmin(admin.ModelAdmin):
    list_display = ("payment", "status", "uploaded_by", "uploaded_at")
    list_filter = ("status",)
    search_fields = ("payment__id", "file_url")
    readonly_fields = (
        "id",
        "payment",
        "file_url",
        "uploaded_by",
        "uploaded_at",
        "status",
        "rejection_reason",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
