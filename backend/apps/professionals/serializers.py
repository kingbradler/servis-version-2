"""Serializers for ProfessionalProfile — public / seller / admin."""

from rest_framework import serializers

from apps.core.geo import location_payload, validate_coordinate_pair
from apps.core.slug import slugify_text, unique_slug
from apps.core.social_urls import validate_social_url
from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
from apps.stores.models import City
from apps.stores.serializers import CityPublicSerializer
from apps.stores.validators import sanitize_text, validate_phone


def _validate_instagram(value):
    return validate_social_url(value, networks={"instagram"})


def _validate_tiktok(value):
    return validate_social_url(value, networks={"tiktok"})


def _validate_facebook(value):
    return validate_social_url(value, networks={"facebook"})


class ProfessionalPublicSerializer(serializers.ModelSerializer):
    city = CityPublicSerializer(read_only=True)
    location = serializers.SerializerMethodField()
    has_coordinates = serializers.BooleanField(read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = ProfessionalProfile
        fields = (
            "id",
            "display_name",
            "slug",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
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


class ProfessionalCreateSerializer(serializers.ModelSerializer):
    city = serializers.UUIDField()

    class Meta:
        model = ProfessionalProfile
        fields = (
            "display_name",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
        )

    def validate_display_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom affiché est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError("Le nom est trop court.")
        return value

    def validate_headline(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le métier / titre est obligatoire.")
        return value

    def validate_bio(self, value):
        return sanitize_text(value)

    def validate_address(self, value):
        return sanitize_text(value)

    def validate_neighborhood(self, value):
        return sanitize_text(value)

    def validate_postal_code(self, value):
        return sanitize_text(value)

    def validate_instagram_url(self, value):
        return _validate_instagram(value)

    def validate_tiktok_url(self, value):
        return _validate_tiktok(value)

    def validate_facebook_url(self, value):
        return _validate_facebook(value)

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
                {
                    field: "Ce champ ne peut pas être défini par le client."
                    for field in leaked
                }
            )

        lat = attrs.get("latitude")
        lng = attrs.get("longitude")
        attrs["latitude"], attrs["longitude"] = validate_coordinate_pair(lat, lng)

        request = self.context["request"]
        if ProfessionalProfile.objects.filter(owner=request.user).exists():
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Vous avez déjà un profil professionnel "
                        "(un seul profil par compte en v1)."
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        display_name = validated_data["display_name"]
        base = slugify_text(f"{display_name}-{validated_data['headline']}")
        slug = unique_slug(ProfessionalProfile, base)
        return ProfessionalProfile.objects.create(
            owner=user,
            slug=slug,
            status=ProfessionalStatus.DRAFT,
            **validated_data,
        )


class ProfessionalSellerSerializer(serializers.ModelSerializer):
    city = CityPublicSerializer(read_only=True)
    location = serializers.SerializerMethodField()
    has_coordinates = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProfessionalProfile
        fields = (
            "id",
            "display_name",
            "slug",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "has_coordinates",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_location(self, obj):
        return location_payload(obj)


class ProfessionalUpdateSerializer(serializers.ModelSerializer):
    city = serializers.UUIDField(required=False)

    class Meta:
        model = ProfessionalProfile
        fields = (
            "display_name",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
        )

    def validate_display_name(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le nom affiché est obligatoire.")
        return value

    def validate_headline(self, value):
        value = sanitize_text(value)
        if not value:
            raise serializers.ValidationError("Le métier / titre est obligatoire.")
        return value

    def validate_bio(self, value):
        return sanitize_text(value)

    def validate_address(self, value):
        return sanitize_text(value)

    def validate_neighborhood(self, value):
        return sanitize_text(value)

    def validate_postal_code(self, value):
        return sanitize_text(value)

    def validate_instagram_url(self, value):
        return _validate_instagram(value)

    def validate_tiktok_url(self, value):
        return _validate_tiktok(value)

    def validate_facebook_url(self, value):
        return _validate_facebook(value)

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
                {
                    field: "Ce champ ne peut pas être défini par le client."
                    for field in leaked
                }
            )

        instance = self.instance
        lat = attrs["latitude"] if "latitude" in attrs else instance.latitude
        lng = attrs["longitude"] if "longitude" in attrs else instance.longitude
        lat, lng = validate_coordinate_pair(lat, lng)
        if "latitude" in attrs or "longitude" in attrs:
            attrs["latitude"] = lat
            attrs["longitude"] = lng
        return attrs

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if "display_name" in validated_data or "headline" in validated_data:
            base = slugify_text(f"{instance.display_name}-{instance.headline}")
            instance.slug = unique_slug(
                ProfessionalProfile, base, exclude_pk=instance.pk
            )
        instance.save()
        return instance


class ProfessionalAdminSerializer(serializers.ModelSerializer):
    city = CityPublicSerializer(read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalProfile
        fields = (
            "id",
            "display_name",
            "slug",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "status",
            "owner_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "display_name",
            "slug",
            "headline",
            "bio",
            "city",
            "phone",
            "whatsapp",
            "avatar",
            "cover",
            "instagram_url",
            "tiktok_url",
            "facebook_url",
            "address",
            "neighborhood",
            "postal_code",
            "latitude",
            "longitude",
            "location",
            "owner_email",
            "created_at",
            "updated_at",
        )

    def get_location(self, obj):
        return location_payload(obj)
