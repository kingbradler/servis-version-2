"""City serializers — public vs admin."""

from rest_framework import serializers

from apps.core.slug import slugify_text, unique_slug
from apps.stores.models import City


class CityPublicSerializer(serializers.ModelSerializer):
    """Public city payload — active cities only exposed by the view."""

    class Meta:
        model = City
        fields = ("id", "name", "slug", "region")
        read_only_fields = fields


class CityAdminSerializer(serializers.ModelSerializer):
    """Admin city CRUD — slug auto-generated on create if omitted."""

    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = City
        fields = (
            "id",
            "name",
            "slug",
            "region",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        if self.instance is None:
            name = attrs.get("name", "")
            base = slugify_text(attrs.get("slug") or name)
            attrs["slug"] = unique_slug(City, base)
        elif "slug" in attrs:
            name = attrs.get("name") or self.instance.name
            base = slugify_text(attrs.get("slug") or name)
            attrs["slug"] = unique_slug(City, base, exclude_pk=self.instance.pk)
        return attrs
