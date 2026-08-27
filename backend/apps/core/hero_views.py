"""Homepage hero slides — public list + admin CRUD with image upload."""

from __future__ import annotations

from django.utils.html import strip_tags
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import HeroSlide
from apps.core.storage import (
    StorageError,
    build_hero_slide_path,
    extract_storage_path,
    get_storage_backend,
)
from apps.products.validators import validate_product_image_file
from apps.users.permissions import IsAdminRole


def _sanitize(value: str | None, *, max_len: int) -> str:
    cleaned = strip_tags(str(value or "")).strip()
    return cleaned[:max_len]


def _absolutize(request, url: str | None) -> str:
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class HeroSlideSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = (
            "id",
            "title",
            "highlight",
            "subtitle",
            "image",
            "cta_href",
            "cta_label",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_image(self, obj):
        return _absolutize(self.context.get("request"), obj.image)


class HeroSlideWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    highlight = serializers.CharField(max_length=120, required=False, allow_blank=True)
    subtitle = serializers.CharField(max_length=300, required=False, allow_blank=True)
    image_url = serializers.CharField(max_length=500, required=False, allow_blank=True)
    image = serializers.FileField(required=False)
    cta_href = serializers.CharField(max_length=200, required=False, allow_blank=True)
    cta_label = serializers.CharField(max_length=80, required=False, allow_blank=True)
    sort_order = serializers.IntegerField(required=False, min_value=0)
    is_active = serializers.BooleanField(required=False)

    def validate_image(self, value):
        if value is None:
            return value
        return validate_product_image_file(value)

    def validate_is_active(self, value):
        if isinstance(value, str):
            return value.strip().lower() in ("1", "true", "yes", "on")
        return bool(value)

    def validate(self, attrs):
        creating = self.context.get("creating", False)
        has_file = attrs.get("image") is not None
        has_url = bool((attrs.get("image_url") or "").strip())
        if creating and not has_file and not has_url:
            raise serializers.ValidationError(
                {"image": "Ajoutez une photo (fichier) ou une URL d'image."}
            )
        if creating and not (attrs.get("title") or "").strip():
            raise serializers.ValidationError({"title": "Le titre est obligatoire."})
        return attrs


def _upload_slide_image(uploaded) -> str:
    storage = get_storage_backend()
    path = build_hero_slide_path(getattr(uploaded, "name", "slide.jpg"))
    content_type = uploaded.content_type or "image/jpeg"
    try:
        return storage.upload(path, uploaded, content_type, private=False)
    except StorageError as exc:
        raise serializers.ValidationError({"image": str(exc)}) from exc
    except Exception as exc:
        raise serializers.ValidationError(
            {"image": "Impossible d'enregistrer l'image. Réessayez."}
        ) from exc


def _apply_write(slide: HeroSlide | None, data: dict, *, creating: bool) -> HeroSlide:
    uploaded = data.get("image")
    image_url = _sanitize(data.get("image_url"), max_len=500)

    if uploaded is not None:
        new_url = _upload_slide_image(uploaded)
        if slide and slide.image:
            key = extract_storage_path(slide.image)
            if key and key.startswith("hero-slides/"):
                try:
                    get_storage_backend().delete(key, private=False)
                except Exception:
                    pass
        image_value = new_url
    elif image_url:
        image_value = image_url
    elif creating:
        raise serializers.ValidationError(
            {"image": "Ajoutez une photo (fichier) ou une URL d'image."}
        )
    else:
        image_value = slide.image  # type: ignore[union-attr]

    title = _sanitize(data.get("title"), max_len=120)
    if not title:
        title = slide.title if slide else ""
    if not title:
        raise serializers.ValidationError({"title": "Le titre est obligatoire."})

    if "sort_order" in data:
        sort_order = int(data["sort_order"])
    else:
        sort_order = slide.sort_order if slide else 0

    if "is_active" in data:
        is_active = bool(data["is_active"])
    else:
        is_active = slide.is_active if slide else True

    fields = {
        "title": title,
        "highlight": (
            _sanitize(data.get("highlight"), max_len=120)
            if "highlight" in data or creating
            else slide.highlight  # type: ignore[union-attr]
        ),
        "subtitle": (
            _sanitize(data.get("subtitle"), max_len=300)
            if "subtitle" in data or creating
            else slide.subtitle  # type: ignore[union-attr]
        ),
        "image": image_value,
        "cta_href": (
            (_sanitize(data.get("cta_href"), max_len=200) or "/products")
            if "cta_href" in data or creating
            else slide.cta_href  # type: ignore[union-attr]
        ),
        "cta_label": (
            (_sanitize(data.get("cta_label"), max_len=80) or "Découvrir")
            if "cta_label" in data or creating
            else slide.cta_label  # type: ignore[union-attr]
        ),
        "sort_order": sort_order,
        "is_active": is_active,
    }

    if creating:
        return HeroSlide.objects.create(**fields)

    assert slide is not None
    for key, value in fields.items():
        setattr(slide, key, value)
    slide.save()
    return slide


class PublicHeroSlideListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Marketplace"], summary="Slides du hero accueil")
    def get(self, request):
        qs = HeroSlide.objects.filter(is_active=True).order_by("sort_order", "created_at")
        return Response(HeroSlideSerializer(qs, many=True, context={"request": request}).data)


class AdminHeroSlideListCreateView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(tags=["Admin — Hero"], summary="Lister les slides hero")
    def get(self, request):
        qs = HeroSlide.objects.all().order_by("sort_order", "created_at")
        return Response(HeroSlideSerializer(qs, many=True, context={"request": request}).data)

    @extend_schema(tags=["Admin — Hero"], summary="Créer un slide hero")
    def post(self, request):
        ser = HeroSlideWriteSerializer(
            data=request.data, context={"creating": True}
        )
        ser.is_valid(raise_exception=True)
        slide = _apply_write(None, ser.validated_data, creating=True)
        return Response(
            HeroSlideSerializer(slide, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminHeroSlideDetailView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, slide_id):
        try:
            return HeroSlide.objects.get(pk=slide_id)
        except HeroSlide.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound("Slide introuvable.")

    @extend_schema(tags=["Admin — Hero"], summary="Détail slide hero")
    def get(self, request, slide_id):
        slide = self._get(slide_id)
        return Response(HeroSlideSerializer(slide, context={"request": request}).data)

    @extend_schema(tags=["Admin — Hero"], summary="Modifier un slide hero")
    def patch(self, request, slide_id):
        slide = self._get(slide_id)
        ser = HeroSlideWriteSerializer(
            data=request.data, partial=True, context={"creating": False}
        )
        ser.is_valid(raise_exception=True)
        slide = _apply_write(slide, ser.validated_data, creating=False)
        return Response(HeroSlideSerializer(slide, context={"request": request}).data)

    @extend_schema(tags=["Admin — Hero"], summary="Supprimer un slide hero")
    def delete(self, request, slide_id):
        slide = self._get(slide_id)
        key = extract_storage_path(slide.image)
        if key and key.startswith("hero-slides/"):
            try:
                get_storage_backend().delete(key, private=False)
            except Exception:
                pass
        slide.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
