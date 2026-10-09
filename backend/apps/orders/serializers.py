"""Cart and Order serializers."""

from rest_framework import serializers

from apps.orders.models import Cart, CartItem, Order, OrderItem
from apps.products.models import Product


class CartProductSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    store_slug = serializers.CharField(source="store.slug", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "price",
            "stock",
            "status",
            "store_name",
            "store_slug",
        )
        read_only_fields = fields


class CartItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product",
            "quantity",
            "line_total",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_line_total(self, obj):
        return str(obj.line_total)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "items",
            "items_count",
            "total_amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_total_amount(self, obj):
        # Prefer prefetched computation
        total = obj.total_amount
        return str(total)

    def get_items_count(self, obj):
        return obj.items.count()


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source="product.id", read_only=True, allow_null=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_id",
            "product_name_snapshot",
            "unit_price",
            "quantity",
            "subtotal",
            "created_at",
        )
        read_only_fields = fields


class OrderStoreSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    phone = serializers.CharField(required=False, allow_blank=True)
    whatsapp = serializers.CharField(required=False, allow_blank=True)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    store = OrderStoreSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "store",
            "store_name_snapshot",
            "status",
            "total_amount",
            "delivery_name",
            "delivery_phone",
            "delivery_address",
            "delivery_city",
            "delivery_notes",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    """Delivery contact required at checkout (same for all store-split orders)."""

    delivery_name = serializers.CharField(max_length=120)
    delivery_phone = serializers.CharField(max_length=30)
    delivery_address = serializers.CharField(max_length=300, allow_blank=True)
    delivery_city = serializers.CharField(max_length=100)
    delivery_notes = serializers.CharField(
        max_length=400, required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        from django.utils.html import strip_tags

        def clean(value: str) -> str:
            return strip_tags(str(value or "")).strip().replace("<", "").replace(">", "")

        def phone_digits(value: str) -> str:
            mapped = (value or "").translate(
                str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
            )
            return "".join(ch for ch in mapped if ch.isdigit())

        name = clean(attrs.get("delivery_name", ""))
        phone = clean(attrs.get("delivery_phone", ""))
        address = clean(attrs.get("delivery_address", ""))
        city = clean(attrs.get("delivery_city", ""))
        notes = clean(attrs.get("delivery_notes", ""))

        if len(name) < 2:
            raise serializers.ValidationError(
                {"delivery_name": "Indiquez le nom du destinataire."}
            )
        digits = phone_digits(phone)
        if len(digits) < 8:
            raise serializers.ValidationError(
                {"delivery_phone": "Indiquez un numéro de téléphone valide."}
            )
        # City-only is enough (quartier left blank is common).
        if len(address) < 3 and len(city) >= 2:
            address = city
        if len(address) < 3:
            raise serializers.ValidationError(
                {"delivery_address": "Indiquez une adresse ou au moins la ville."}
            )
        if len(city) < 2:
            raise serializers.ValidationError(
                {"delivery_city": "Indiquez la ville de livraison."}
            )

        attrs["delivery_name"] = name[:120]
        attrs["delivery_phone"] = phone[:30]
        attrs["delivery_address"] = address[:300]
        attrs["delivery_city"] = city[:100]
        attrs["delivery_notes"] = notes[:400]
        return attrs


class SellerOrderSerializer(OrderSerializer):
    """Seller view — includes client contact for WhatsApp confirmation."""

    client = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ("client",)

    def get_client(self, obj):
        user = obj.user
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone or "",
        }


class OrderAdminSerializer(OrderSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ("user_id", "user_email")
