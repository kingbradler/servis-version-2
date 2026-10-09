"""Serializers for Service — public / seller / admin."""

from django.db import transaction
from rest_framework import serializers

from apps.categories.models import Category
from apps.core.slug import slugify_text, unique_slug
from apps.core.storage import (
    StorageError,
    build_service_image_path,
    extract_storage_path,
    get_storage_backend,
)
from apps.professionals.models import ProfessionalProfile
from apps.services.models import Service, ServiceImage, ServicePriceType, ServiceStatus
from apps.services.validators import (
    sanitize_text,
    validate_price_type,
    validate_product_image_file,
    validate_service_price,
)


class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ("id", "image", "alt_text", "order", "created_at")
        read_only_fields = fields


class NestedCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    slug = serializers.CharField()


class ProfessionalBriefSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    city_slug = serializers.CharField(source="city.slug", read_only=True)
    location = serializers.SerializerMethodField()
    has_coordinates = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProfessionalProfile
        fields = (
            "id",
            "display_name",
            "slug",
            "headline",
            "phone",
            "whatsapp",
            "avatar",
            "city_name",
            "city_slug",
            "address",
            "neighborhood",
            "latitude",
            "longitude",
            "location",
            "has_coordinates",
        )
        read_only_fields = fields

    def get_location(self, obj):
        from apps.core.geo import location_payload

        return location_payload(obj)


class ServicePublicSerializer(serializers.ModelSerializer):
    professional = ProfessionalBriefSerializer(
        source="professional_profile", read_only=True
    )
    category = NestedCategorySerializer(read_only=True, allow_null=True)
    images = ServiceImageSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    distance_km = serializers.FloatField(read_only=True, required=False)
    is_boosted = serializers.SerializerMethodField()
    sponsored_label = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "price_type",
            "duration",
            "is_featured",
            "is_boosted",
            "sponsored_label",
            "professional",
            "category",
            "images",
            "primary_image",
            "distance_km",
            "created_at",
        )
        read_only_fields = fields

    def get_primary_image(self, obj) -> str | None:
        first = obj.images.all()[:1]
        return first[0].image if first else None

    def get_is_boosted(self, obj) -> bool:
        if hasattr(obj, "is_boosted"):
            return bool(obj.is_boosted)
        from apps.billing.models import BoostTargetType
        from apps.billing.services import has_active_boost

        return has_active_boost(
            target_type=BoostTargetType.SERVICE, target_id=obj.id
        )

    def get_sponsored_label(self, obj) -> str | None:
        return "Promu" if self.get_is_boosted(obj) else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not hasattr(instance, "distance_km"):
            data.pop("distance_km", None)
        return data


def _assert_no_ownership_leak(initial_data) -> None:
    forbidden = {
        "professional_profile",
        "professional_profile_id",
        "owner",
        "owner_id",
        "slug",
        "status",
        "role",
    }
    leaked = forbidden.intersection(initial_data.keys())
    if leaked:
        raise serializers.ValidationError(
            {field: "Ce champ ne peut pas être défini par le client." for field in leaked}
        )


def _resolve_active_category(category_id):
    if category_id is None:
        return None
    from apps.categories.models import CategoryScope

    try:
        category = Category.objects.get(pk=category_id)
    except Category.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"category_id": "Catégorie introuvable."}
        ) from exc
    if not category.is_active:
        raise serializers.ValidationError(
            {"category_id": "Cette catégorie n'est pas disponible."}
        )
    if category.scope not in (CategoryScope.SERVICE, CategoryScope.BOTH):
        raise serializers.ValidationError(
            {"category_id": "Cette catégorie n'est pas utilisable pour les services."}
        )
    return category


def _validate_price_vs_type(price, price_type: str) -> None:
    if price_type == ServicePriceType.QUOTE:
        return
    if price is None:
        raise serializers.ValidationError(
            {
                "price": (
                    "Le prix est obligatoire pour un tarif fixe ou « à partir de »."
                )
            }
        )


class ServiceSellerSerializer(serializers.ModelSerializer):
    category = NestedCategorySerializer(read_only=True, allow_null=True)
    category_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    images = ServiceImageSerializer(many=True, read_only=True)
    profile_status = serializers.CharField(
        source="professional_profile.status", read_only=True
    )

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "price_type",
            "duration",
            "status",
            "is_featured",
            "category",
            "category_id",
            "images",
            "profile_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "status",
            "category",
            "images",
            "profile_status",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom du service est obligatoire.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_duration(self, value):
        return sanitize_text(value)

    def validate_price(self, value):
        return validate_service_price(value)

    def validate_price_type(self, value):
        return validate_price_type(value)

    def validate(self, attrs):
        _assert_no_ownership_leak(self.initial_data)

        if "category_id" in attrs:
            attrs["category"] = _resolve_active_category(attrs.pop("category_id"))

        price = attrs.get("price", getattr(self.instance, "price", None))
        price_type = attrs.get(
            "price_type", getattr(self.instance, "price_type", ServicePriceType.FIXED)
        )
        if "price" in attrs or "price_type" in attrs:
            _validate_price_vs_type(price, price_type)
        return attrs

    def update(self, instance, validated_data):
        name_changed = "name" in validated_data and validated_data["name"] != instance.name
        service = super().update(instance, validated_data)
        if name_changed:
            service.slug = unique_slug(
                Service,
                slugify_text(service.name),
                scope_filter={"professional_profile_id": service.professional_profile_id},
                exclude_pk=service.pk,
            )
            service.save(update_fields=["slug", "updated_at"])
        return service


class ServiceCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.UUIDField(required=False, allow_null=True)
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    price_type = serializers.ChoiceField(
        choices=ServicePriceType.choices, default=ServicePriceType.FIXED
    )
    duration = serializers.CharField(required=False, allow_blank=True, default="")
    is_featured = serializers.BooleanField(required=False, default=False)

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom du service est obligatoire.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_duration(self, value):
        return sanitize_text(value)

    def validate_price(self, value):
        return validate_service_price(value)

    def validate_price_type(self, value):
        return validate_price_type(value)

    def validate_category(self, category_id):
        if category_id is None:
            return None
        from apps.categories.models import CategoryScope

        try:
            category = Category.objects.get(pk=category_id)
        except Category.DoesNotExist as exc:
            raise serializers.ValidationError("Catégorie introuvable.") from exc
        if not category.is_active:
            raise serializers.ValidationError("Cette catégorie n'est pas disponible.")
        if category.scope not in (CategoryScope.SERVICE, CategoryScope.BOTH):
            raise serializers.ValidationError(
                "Cette catégorie n'est pas utilisable pour les services."
            )
        return category

    def validate(self, attrs):
        _assert_no_ownership_leak(self.initial_data)
        request = self.context["request"]
        try:
            profile = ProfessionalProfile.objects.get(owner=request.user)
        except ProfessionalProfile.DoesNotExist as exc:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Vous devez créer un profil professionnel "
                        "avant d'ajouter des services."
                    )
                }
            ) from exc

        _validate_price_vs_type(
            attrs.get("price"), attrs.get("price_type", ServicePriceType.FIXED)
        )
        attrs["professional_profile"] = profile
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        profile = validated_data.pop("professional_profile")
        category = validated_data.pop("category", None)
        name = validated_data["name"]
        slug = unique_slug(
            Service,
            slugify_text(name),
            scope_filter={"professional_profile_id": profile.id},
        )
        return Service.objects.create(
            professional_profile=profile,
            category=category,
            slug=slug,
            status=ServiceStatus.DRAFT,
            **validated_data,
        )


class ServiceImageUploadSerializer(serializers.Serializer):
    image = serializers.FileField()
    alt_text = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, min_value=0, allow_null=True)

    def validate_image(self, value):
        return validate_product_image_file(value)

    def validate_alt_text(self, value):
        return sanitize_text(value)

    def validate(self, attrs):
        service = self.context["service"]
        if service.images.count() >= Service.MAX_IMAGES:
            raise serializers.ValidationError(
                {"image": f"Maximum {Service.MAX_IMAGES} images par service."}
            )
        return attrs

    def create(self, validated_data):
        service = self.context["service"]
        uploaded = validated_data["image"]
        alt_text = validated_data.get("alt_text") or service.name
        order = validated_data.get("order")
        if order is None:
            used = set(service.images.values_list("order", flat=True))
            order = 0
            while order in used:
                order += 1
        elif service.images.filter(order=order).exists():
            raise serializers.ValidationError(
                {"order": "Cet ordre d'image est déjà utilisé."}
            )

        path = build_service_image_path(
            service.professional_profile_id, service.id, uploaded.name
        )
        try:
            url = get_storage_backend().upload(
                path, uploaded, uploaded.content_type or "image/jpeg", private=False
            )
        except StorageError as exc:
            raise serializers.ValidationError({"image": str(exc)}) from exc

        return ServiceImage.objects.create(
            service=service,
            image=url,
            alt_text=alt_text,
            order=order,
        )


class ServiceAdminSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(
        source="professional_profile.display_name", read_only=True
    )
    owner_email = serializers.EmailField(
        source="professional_profile.owner.email", read_only=True
    )
    category_name = serializers.CharField(
        source="category.name", read_only=True, default=None
    )

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "price_type",
            "duration",
            "status",
            "is_featured",
            "professional_name",
            "owner_email",
            "category_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "price_type",
            "duration",
            "is_featured",
            "professional_name",
            "owner_email",
            "category_name",
            "created_at",
            "updated_at",
        )


def delete_service_image_file(image: ServiceImage) -> None:
    key = extract_storage_path(image.image)
    if key:
        try:
            get_storage_backend().delete(key, private=False)
        except StorageError:
            pass
