"""Django admin for Cart and Orders."""

from django.contrib import admin

from apps.orders.models import Cart, CartItem, Order, OrderItem, OrderStatus
from apps.orders.services import cancel_order


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ("product", "quantity", "created_at", "updated_at")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "updated_at")
    search_fields = ("user__email",)
    inlines = [CartItemInline]
    readonly_fields = ("id", "created_at", "updated_at")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "product_name_snapshot",
        "unit_price",
        "quantity",
        "subtotal",
        "created_at",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "store",
        "status",
        "total_amount",
        "created_at",
    )
    list_filter = ("status", "store", "created_at")
    search_fields = ("id", "user__email", "store__name", "store_name_snapshot")
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "user",
        "store",
        "status",
        "total_amount",
        "store_name_snapshot",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline]
    actions = ["mark_cancelled"]

    @admin.action(description="Annuler les commandes sélectionnées")
    def mark_cancelled(self, request, queryset):
        count = 0
        for order in queryset.exclude(status=OrderStatus.CANCELLED):
            cancel_order(order)
            count += 1
        self.message_user(request, f"{count} commande(s) annulée(s).")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "product_name_snapshot",
        "unit_price",
        "quantity",
        "subtotal",
    )
    search_fields = ("product_name_snapshot", "order__id")
    readonly_fields = (
        "id",
        "order",
        "product",
        "product_name_snapshot",
        "unit_price",
        "quantity",
        "subtotal",
        "created_at",
    )
