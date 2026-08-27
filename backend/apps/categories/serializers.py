"""Category serializers — public tree vs admin."""

from rest_framework import serializers

from apps.categories.models import Category
from apps.core.slug import slugify_text, unique_slug


class CategoryChildSerializer(serializers.ModelSerializer):
    """Nested child category for public tree responses."""

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "icon", "scope", "order")
        read_only_fields = fields


class CategoryPublicSerializer(serializers.ModelSerializer):
    """Root category with active children (prefetch required)."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "parent",
            "scope",
            "order",
            "children",
        )
        read_only_fields = fields

    def get_children(self, obj):
        # Prefetched related manager preferred; filter active only
        children = [
            child
            for child in obj.children.all()
            if child.is_active
        ]
        # Ensure order
        children.sort(key=lambda c: (c.order, c.name))
        return CategoryChildSerializer(children, many=True).data


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Single category detail — includes parent slug and children if root."""

    parent_slug = serializers.CharField(source="parent.slug", read_only=True, default=None)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "parent",
            "parent_slug",
            "scope",
            "order",
            "children",
        )
        read_only_fields = fields

    def get_children(self, obj):
        children = [c for c in obj.children.all() if c.is_active]
        children.sort(key=lambda c: (c.order, c.name))
        return CategoryChildSerializer(children, many=True).data


class CategoryAdminSerializer(serializers.ModelSerializer):
    """Admin category CRUD."""

    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "parent",
            "scope",
            "is_active",
            "order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_parent(self, parent):
        if parent is None:
            return parent
        if self.instance and parent.pk == self.instance.pk:
            raise serializers.ValidationError(
                "Une catégorie ne peut pas être son propre parent."
            )
        return parent

    def validate(self, attrs):
        if self.instance is None:
            name = attrs.get("name", "")
            base = slugify_text(attrs.get("slug") or name)
            attrs["slug"] = unique_slug(Category, base)
        elif "slug" in attrs:
            name = attrs.get("name") or self.instance.name
            base = slugify_text(attrs.get("slug") or name)
            attrs["slug"] = unique_slug(Category, base, exclude_pk=self.instance.pk)
        return attrs
