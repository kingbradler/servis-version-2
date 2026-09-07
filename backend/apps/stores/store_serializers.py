"""Store serializers — public / seller / admin."""

from rest_framework import serializers

from apps.core.geo import location_payload, validate_coordinate_pair
from apps.core.slug import slugify_text, unique_slug
from apps.core.storage import (
    build_store_banner_path,
    build_store_logo_path,
    get_storage_backend,
)
from apps.products.validators import validate_product_image_file
from apps.stores.models import City, Store, StoreStatus
from apps.stores.serializers import CityPublicSerializer
from apps.stores.validators import sanitize_text, validate_phone


class StoreMediaUploadSerializer(serializers.Serializer):
    """Multipart upload for store logo or banner."""

    image = serializers.FileField()
    kind = serializers.ChoiceField(choices=("logo", "banner"))

    def validate_image(self, value):
        return validate_product_image_file(value)

    def save(self, **kwargs):
        store = self.context["store"]
        uploaded = self.validated_data["image"]
        kind = self.validated_data["kind"]
        storage = get_storage_backend()
        if kind == "logo":
            path = build_store_logo_path(store.id, getattr(uploaded, "name", "logo.jpg"))
        else:
            path = build_store_banner_path(
                store.id, getattr(uploaded, "name", "banner.jpg")
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
        if kind == "logo":
            store.logo = url
            store.save(update_fields=["logo", "updated_at"])
        else:
            store.banner = url
            store.save(update_fields=["banner", "updated_at"])
        return store


class StorePublicSerializer(serializers.ModelSerializer):
    city = CityPublicSerializer(read_only=True)
    location = serializers.SerializerMethodField()
    has_coordinates = serializers.BooleanField(read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = Store
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "banner",
            "city",
            "phone",
            "whatsapp",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "has_coordinates",
            "distance_km",
            "created_at",
        )
        read_only_fields = fields

    def get_location(self, obj):
        return location_payload(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not hasattr(instance, "distance_km"):
            data.pop("distance_km", None)
        return data


class StoreCreateSerializer(serializers.ModelSerializer):
    """Seller creates their boutique — owner/status/slug assigned server-side."""

    city = serializers.UUIDField()

    class Meta:
        model = Store
        fields = (
            "name",
            "description",
            "city",
            "phone",
            "whatsapp",
            "logo",
            "banner",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
        )

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom de la boutique est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError("Le nom est trop court.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_address(self, value):
        return sanitize_text(value)

    def validate_neighborhood(self, value):
        return sanitize_text(value)

    def validate_postal_code(self, value):
        return sanitize_text(value)

    def validate_phone(self, value):
        return validate_phone(value)

    def validate_whatsapp(self, value):
        return validate_phone(value)

    def validate_city(self, city_id):
        try:
            city = City.objects.get(pk=city_id)
        except City.DoesNotExist as exc:
            raise serializers.ValidationError("Ville introuvable.") from exc
        if not city.is_active:
            raise serializers.ValidationError(
                "Cette ville n'est pas disponible pour le moment."
            )
        return city

    def validate(self, attrs):
        forbidden = {"owner", "status", "slug", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {field: "Ce champ ne peut pas être défini par le client." for field in leaked}
            )

        lat = attrs.get("latitude")
        lng = attrs.get("longitude")
        attrs["latitude"], attrs["longitude"] = validate_coordinate_pair(lat, lng)

        request = self.context["request"]
        user = request.user
        if Store.objects.filter(owner=user).exists():
            raise serializers.ValidationError(
                {"detail": "Vous avez déjà une boutique. Un vendeur ne peut en posséder qu'une (v1)."}
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        name = validated_data["name"]
        slug = unique_slug(Store, slugify_text(name))
        return Store.objects.create(
            owner=user,
            slug=slug,
            status=StoreStatus.DRAFT,
            **validated_data,
        )


class StoreSellerSerializer(serializers.ModelSerializer):
    """Seller view/update of their own store."""

    city = CityPublicSerializer(read_only=True)
    city_id = serializers.UUIDField(write_only=True, required=False)
    location = serializers.SerializerMethodField()
    has_coordinates = serializers.BooleanField(read_only=True)

    class Meta:
        model = Store
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "banner",
            "city",
            "city_id",
            "status",
            "phone",
            "whatsapp",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "has_coordinates",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "status",
            "city",
            "location",
            "has_coordinates",
            "created_at",
            "updated_at",
        )

    def get_location(self, obj):
        return location_payload(obj)

    def validate_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom de la boutique est obligatoire.")
        return value

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_address(self, value):
        return sanitize_text(value)

    def validate_neighborhood(self, value):
        return sanitize_text(value)

    def validate_postal_code(self, value):
        return sanitize_text(value)

    def validate_phone(self, value):
        return validate_phone(value)

    def validate_whatsapp(self, value):
        return validate_phone(value)

    def validate(self, attrs):
        forbidden = {"owner", "status", "slug", "role"}
        leaked = forbidden.intersection(self.initial_data.keys())
        if leaked:
            raise serializers.ValidationError(
                {field: "Ce champ ne peut pas être défini par le client." for field in leaked}
            )

        city_id = attrs.pop("city_id", None)
        if city_id is not None:
            try:
                city = City.objects.get(pk=city_id)
            except City.DoesNotExist as exc:
                raise serializers.ValidationError({"city_id": "Ville introuvable."}) from exc
            if not city.is_active:
                raise serializers.ValidationError(
                    {"city_id": "Cette ville n'est pas disponible."}
                )
            attrs["city"] = city

        instance = self.instance
        lat = attrs["latitude"] if "latitude" in attrs else instance.latitude
        lng = attrs["longitude"] if "longitude" in attrs else instance.longitude
        lat, lng = validate_coordinate_pair(lat, lng)
        if "latitude" in attrs or "longitude" in attrs:
            attrs["latitude"] = lat
            attrs["longitude"] = lng
        return attrs

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)


class StoreAdminSerializer(serializers.ModelSerializer):
    city = CityPublicSerializer(read_only=True)
    city_id = serializers.UUIDField(write_only=True, required=False)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = (
            "id",
            "owner_id",
            "owner_email",
            "name",
            "slug",
            "description",
            "logo",
            "banner",
            "city",
            "city_id",
            "status",
            "phone",
            "whatsapp",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "owner_id",
            "owner_email",
            "city",
            "location",
            "created_at",
            "updated_at",
        )

    def get_location(self, obj):
        return location_payload(obj)

    def validate_name(self, value):
        return sanitize_text(value)

    def validate_description(self, value):
        return sanitize_text(value)

    def validate_phone(self, value):
        return validate_phone(value)

    def validate_whatsapp(self, value):
        return validate_phone(value)

    def validate_status(self, value):
        if value not in StoreStatus.values:
            raise serializers.ValidationError("Statut invalide.")
        return value

    def validate(self, attrs):
        city_id = attrs.pop("city_id", None)
        if city_id is not None:
            try:
                city = City.objects.get(pk=city_id)
            except City.DoesNotExist as exc:
                raise serializers.ValidationError({"city_id": "Ville introuvable."}) from exc
            attrs["city"] = city

        instance = self.instance
        lat = attrs["latitude"] if "latitude" in attrs else (
            instance.latitude if instance else None
        )
        lng = attrs["longitude"] if "longitude" in attrs else (
            instance.longitude if instance else None
        )
        if "latitude" in attrs or "longitude" in attrs:
            attrs["latitude"], attrs["longitude"] = validate_coordinate_pair(lat, lng)
        return attrs
