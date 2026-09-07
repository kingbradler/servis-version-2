"""Product serializers — public / seller / admin."""

from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.categories.models import Category
from apps.core.slug import slugify_text, unique_slug
from apps.core.social_urls import validate_video_url
from apps.core.storage import build_product_image_path, get_storage_backend
from apps.products.models import Product, ProductImage, ProductStatus
from apps.products.transitions import assert_can_publish, assert_transition
from apps.products.validators import (
    sanitize_text,
    validate_price,
    validate_product_image_file,
    validate_stock,
)


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "order", "created_at")
        read_only_fields = ("id", "created_at")


class NestedStorePublicSerializer(serializers.Serializer):
    name = serializers.CharField()
    slug = serializers.CharField()


class NestedCategoryPublicSerializer(serializers.Serializer):
    name = serializers.CharField()
    slug = serializers.CharField()


class ProductPublicSerializer(serializers.ModelSerializer):
    store = NestedStorePublicSerializer(read_only=True)
    category = NestedCategoryPublicSerializer(read_only=True, allow_null=True)
    images = ProductImageSerializer(many=True, read_only=True)
    is_boosted = serializers.SerializerMethodField()
    sponsored_label = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "compare_price",
            "stock",
            "status",
            "is_featured",
            "is_boosted",
            "sponsored_label",
            "store",
            "category",
            "images",
            "video_url",
            "created_at",
        )
        read_only_fields = fields

    def get_is_boosted(self, obj) -> bool:
        if hasattr(obj, "is_boosted"):
            return bool(obj.is_boosted)
        from apps.billing.models import BoostTargetType
        from apps.billing.services import has_active_boost

        return has_active_boost(
            target_type=BoostTargetType.PRODUCT, target_id=obj.id
        )

    def get_sponsored_label(self, obj) -> str | None:
        return "Promu" if self.get_is_boosted(obj) else None


class ProductSellerSerializer(serializers.ModelSerializer):
    category = NestedCategoryPublicSerializer(read_only=True, allow_null=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    images = ProductImageSerializer(many=True, read_only=True)
    store_slug = serializers.CharField(source="store.slug", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    store_status = serializers.CharField(source="store.status", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "compare_price",
            "stock",
            "status",
            "is_featured",
            "video_url",
            "category",
            "category_id",
            "images",
            "store_slug",
            "store_name",
            "store_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "status",
            "category",
            "images",
            "store_slug",
            "store_name",
            "store_status",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom du produit est obligatoire.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_price(self, value):
        return validate_price(value)

    def validate_compare_price(self, value):
        if value is None or value == "":
            return None
        return validate_price(value)

    def validate_stock(self, value):
        return validate_stock(value)

    def validate_video_url(self, value):
        return validate_video_url(value)

    def validate(self, attrs):
        forbidden = {"store", "store_id", "owner", "slug", "status", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {field: "Ce champ ne peut pas être défini par le client." for field in leaked}
            )

        category_id = attrs.pop("category_id", serializers.empty)
        if category_id is not serializers.empty:
            if category_id is None:
                attrs["category"] = None
            else:
                attrs["category"] = self._resolve_active_category(category_id)

        price = attrs.get("price", getattr(self.instance, "price", None))
        compare = attrs.get(
            "compare_price",
            getattr(self.instance, "compare_price", None) if "compare_price" not in attrs else attrs.get("compare_price"),
        )
        if "compare_price" in attrs:
            compare = attrs["compare_price"]
        elif self.instance is not None and "compare_price" not in attrs:
            compare = self.instance.compare_price

        if compare is not None and price is not None and compare <= price:
            raise serializers.ValidationError(
                {"compare_price": "Le prix barré doit être strictement supérieur au prix."}
            )
        return attrs

    def _resolve_active_category(self, category_id):
        try:
            category = Category.objects.get(pk=category_id)
        except Category.DoesNotExist as exc:
            raise serializers.ValidationError({"category_id": "Catégorie introuvable."}) from exc
        if not category.is_active:
            raise serializers.ValidationError(
                {"category_id": "Cette catégorie n'est pas disponible."}
            )
        return category

    def update(self, instance, validated_data):
        stock = validated_data.get("stock", instance.stock)
        # Restocking OUT_OF_STOCK does not auto-activate — seller must publish again
        product = super().update(instance, validated_data)
        if stock == 0 and product.status == ProductStatus.ACTIVE:
            product.status = ProductStatus.OUT_OF_STOCK
            product.save(update_fields=["status", "updated_at"])
        return product


class ProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.UUIDField(required=False, allow_null=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    compare_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    stock = serializers.IntegerField(required=False, default=0)
    is_featured = serializers.BooleanField(required=False, default=False)
    video_url = serializers.CharField(required=False, allow_blank=True, default="")
    # Optional HTTPS URLs (no binary) — uploads via dedicated image endpoint
    image_urls = serializers.ListField(
        child=serializers.URLField(max_length=500),
        required=False,
        allow_empty=True,
        max_length=Product.MAX_IMAGES,
    )

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom du produit est obligatoire.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_price(self, value):
        return validate_price(value)

    def validate_compare_price(self, value):
        if value is None:
            return None
        return validate_price(value)

    def validate_stock(self, value):
        return validate_stock(value)

    def validate_video_url(self, value):
        return validate_video_url(value)

    def validate_category(self, category_id):
        if category_id is None:
            return None
        try:
            category = Category.objects.get(pk=category_id)
        except Category.DoesNotExist as exc:
            raise serializers.ValidationError("Catégorie introuvable.") from exc
        if not category.is_active:
            raise serializers.ValidationError("Cette catégorie n'est pas disponible.")
        return category

    def validate_image_urls(self, urls):
        request = self.context.get("request")
        if not request or not urls:
            return urls
        from apps.billing.services import get_product_image_limit

        limit = get_product_image_limit(request.user)
        if len(urls) > limit:
            raise serializers.ValidationError(
                f"Votre plan autorise au maximum {limit} photo(s) par produit."
            )
        return urls

    def validate(self, attrs):
        forbidden = {"store", "store_id", "owner", "slug", "status", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {field: "Ce champ ne peut pas être défini par le client." for field in leaked}
            )

        from apps.stores.models import Store

        request = self.context["request"]
        try:
            store = Store.objects.get(owner=request.user)
        except Store.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"detail": "Vous devez créer une boutique avant d'ajouter des produits."}
            ) from exc

        compare = attrs.get("compare_price")
        price = attrs["price"]
        if compare is not None and compare <= price:
            raise serializers.ValidationError(
                {"compare_price": "Le prix barré doit être strictement supérieur au prix."}
            )

        attrs["store"] = store
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        store = validated_data.pop("store")
        category = validated_data.pop("category", None)
        image_urls = validated_data.pop("image_urls", []) or []
        name = validated_data["name"]
        slug = unique_slug(
            Product,
            slugify_text(name),
            scope_filter={"store_id": store.id},
        )
        product = Product.objects.create(
            store=store,
            category=category,
            slug=slug,
            status=ProductStatus.DRAFT,
            **validated_data,
        )
        for index, url in enumerate(image_urls):
            ProductImage.objects.create(
                product=product,
                image=url,
                order=index,
                alt_text=name,
            )
        return product


class ProductImageUploadSerializer(serializers.Serializer):
    image = serializers.FileField()
    alt_text = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, min_value=0, allow_null=True)

    def validate_image(self, value):
        return validate_product_image_file(value)

    def validate_alt_text(self, value):
        return sanitize_text(value)

    def validate(self, attrs):
        product = self.context["product"]
        request = self.context.get("request")
        from apps.billing.services import get_product_image_limit

        owner = product.store.owner
        if request and getattr(request, "user", None):
            owner = request.user
        limit = get_product_image_limit(owner)
        if product.images.count() >= limit:
            raise serializers.ValidationError(
                {
                    "image": (
                        f"Votre plan autorise au maximum {limit} photo(s) par produit. "
                        "Passez à un abonnement supérieur pour en ajouter plus."
                    ),
                    "error_code": "product_image_limit_exceeded",
                    "product_image_limit": limit,
                }
            )
        return attrs

    def create(self, validated_data):
        product = self.context["product"]
        uploaded = validated_data["image"]
        order = validated_data.get("order")
        if order is None:
            existing = list(product.images.values_list("order", flat=True))
            order = 0
            while order in existing:
                order += 1
        elif product.images.filter(order=order).exists():
            raise serializers.ValidationError(
                {"order": "Cet ordre d'image est déjà utilisé pour ce produit."}
            )

        storage = get_storage_backend()
        path = build_product_image_path(
            product.store_id, product.id, getattr(uploaded, "name", "image.jpg")
        )
        content_type = uploaded.content_type or "image/jpeg"
        try:
            url = storage.upload(path, uploaded, content_type, private=False)
        except Exception as exc:
            from apps.core.storage import StorageError

            if isinstance(exc, StorageError):
                raise serializers.ValidationError({"image": str(exc)}) from exc
            raise serializers.ValidationError(
                {"image": "Impossible d'uploader l'image. Réessayez."}
            ) from exc
        return ProductImage.objects.create(
            product=product,
            image=url,
            alt_text=validated_data.get("alt_text") or "",
            order=order,
        )


class ProductAdminSerializer(serializers.ModelSerializer):
    category = NestedCategoryPublicSerializer(read_only=True, allow_null=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    images = ProductImageSerializer(many=True, read_only=True)
    store = NestedStorePublicSerializer(read_only=True)
    store_id = serializers.UUIDField(source="store.id", read_only=True)
    owner_email = serializers.EmailField(source="store.owner.email", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "store",
            "store_id",
            "owner_email",
            "name",
            "slug",
            "description",
            "price",
            "compare_price",
            "stock",
            "status",
            "is_featured",
            "video_url",
            "category",
            "category_id",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "store",
            "store_id",
            "owner_email",
            "category",
            "images",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        return sanitize_text(value)

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_price(self, value):
        return validate_price(value)

    def validate_compare_price(self, value):
        if value is None or value == "":
            return None
        return validate_price(value)

    def validate_stock(self, value):
        return validate_stock(value)

    def validate_status(self, value):
        if value not in ProductStatus.values:
            raise serializers.ValidationError("Statut invalide.")
        return value

    def validate(self, attrs):
        forbidden = {"store", "store_id", "owner", "slug", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {field: "Ce champ ne peut pas être défini via cet endpoint." for field in leaked}
            )

        category_id = attrs.pop("category_id", serializers.empty)
        if category_id is not serializers.empty:
            if category_id is None:
                attrs["category"] = None
            else:
                try:
                    attrs["category"] = Category.objects.get(pk=category_id)
                except Category.DoesNotExist as exc:
                    raise serializers.ValidationError(
                        {"category_id": "Catégorie introuvable."}
                    ) from exc

        price = attrs.get("price", getattr(self.instance, "price", None))
        if "compare_price" in attrs:
            compare = attrs["compare_price"]
        else:
            compare = getattr(self.instance, "compare_price", None)
        if compare is not None and price is not None and Decimal(compare) <= Decimal(price):
            raise serializers.ValidationError(
                {"compare_price": "Le prix barré doit être strictement supérieur au prix."}
            )

        new_status = attrs.get("status")
        if new_status and self.instance and new_status != self.instance.status:
            assert_transition(self.instance.status, new_status, actor="admin")
            if new_status == ProductStatus.ACTIVE:
                assert_can_publish(self.instance.store.status)
                if attrs.get("stock", self.instance.stock) == 0:
                    attrs["status"] = ProductStatus.OUT_OF_STOCK
        return attrs


def resolve_publish_status(*, stock: int, store_status: str) -> str:
    assert_can_publish(store_status)
    if stock <= 0:
        return ProductStatus.OUT_OF_STOCK
    return ProductStatus.ACTIVE
