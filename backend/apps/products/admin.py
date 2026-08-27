"""Django admin for Product and ProductImage."""

from django.contrib import admin

from apps.products.models import Product, ProductImage, ProductStatus


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("image", "alt_text", "order", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("order",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "store",
        "status",
        "price",
        "stock",
        "is_featured",
        "category",
        "created_at",
    )
    list_filter = ("status", "is_featured", "store", "category", "created_at")
    search_fields = ("name", "slug", "store__name", "store__owner__email")
    ordering = ("-created_at",)
    readonly_fields = ("id", "slug", "created_at", "updated_at")
    inlines = [ProductImageInline]
    actions = ["archive_products", "mark_out_of_stock"]

    @admin.action(description="Archiver les produits sélectionnés")
    def archive_products(self, request, queryset):
        updated = queryset.exclude(status=ProductStatus.ARCHIVED).update(
            status=ProductStatus.ARCHIVED
        )
        self.message_user(request, f"{updated} produit(s) archivé(s).")

    @admin.action(description="Marquer en rupture de stock")
    def mark_out_of_stock(self, request, queryset):
        updated = queryset.filter(status=ProductStatus.ACTIVE).update(
            status=ProductStatus.OUT_OF_STOCK
        )
        self.message_user(request, f"{updated} produit(s) marqué(s) OUT_OF_STOCK.")


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "order", "image", "created_at")
    list_filter = ("product",)
    search_fields = ("product__name", "alt_text", "image")
    ordering = ("product", "order")
    readonly_fields = ("id", "created_at")
