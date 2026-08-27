"""Query helpers for public service discovery (Phase 6.3 + 6.4 geo)."""

from __future__ import annotations

import uuid
from decimal import Decimal, InvalidOperation

from django.db.models import F, Q, QuerySet
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter

from apps.categories.models import Category, CategoryScope
from apps.core.geo import (
    apply_geo_filter,
    apply_whitelisted_ordering,
    parse_geo_query,
)
from apps.services.models import ServicePriceType
from apps.stores.models import City


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def resolve_active_city(value: str) -> City | None:
    qs = City.objects.filter(is_active=True)
    if _is_uuid(value):
        return qs.filter(pk=value).first()
    return qs.filter(slug=value).first()


def resolve_active_category(value: str) -> Category | None:
    qs = Category.objects.filter(is_active=True).filter(
        Q(scope=CategoryScope.SERVICE) | Q(scope=CategoryScope.BOTH)
    )
    if _is_uuid(value):
        return qs.filter(pk=value).first()
    return qs.filter(slug=value).first()


def apply_public_service_filters(qs: QuerySet, params) -> QuerySet:
    """Apply discovery filters. Visibility rules must already be applied on qs."""
    search = (params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(description__icontains=search)
            | Q(professional_profile__display_name__icontains=search)
            | Q(professional_profile__headline__icontains=search)
        )

    city = params.get("city")
    if city:
        resolved = resolve_active_city(city)
        if resolved is None:
            return qs.none()
        qs = qs.filter(professional_profile__city=resolved)

    category = params.get("category")
    if category:
        resolved_cat = resolve_active_category(category)
        if resolved_cat is None:
            return qs.none()
        qs = qs.filter(category=resolved_cat)

    price_type = params.get("price_type")
    if price_type:
        if price_type not in ServicePriceType.values:
            raise ValidationError({"price_type": "Type de prix invalide."})
        qs = qs.filter(price_type=price_type)

    featured = params.get("featured")
    if featured is not None and str(featured).lower() in ("1", "true", "yes"):
        qs = qs.filter(is_featured=True)

    min_price = params.get("min_price")
    max_price = params.get("max_price")
    price_filter_active = False

    if min_price is not None and min_price != "":
        try:
            amount = Decimal(str(min_price))
        except (InvalidOperation, ValueError) as exc:
            raise ValidationError({"min_price": "Prix minimum invalide."}) from exc
        qs = qs.filter(price__gte=amount)
        price_filter_active = True

    if max_price is not None and max_price != "":
        try:
            amount = Decimal(str(max_price))
        except (InvalidOperation, ValueError) as exc:
            raise ValidationError({"max_price": "Prix maximum invalide."}) from exc
        qs = qs.filter(price__lte=amount)
        price_filter_active = True

    if price_filter_active:
        qs = qs.exclude(price_type=ServicePriceType.QUOTE).exclude(price__isnull=True)

    geo = parse_geo_query(params)
    qs = apply_geo_filter(
        qs,
        latitude=geo["latitude"],
        longitude=geo["longitude"],
        radius=geo["radius"],
        lat_field="professional_profile__latitude",
        lng_field="professional_profile__longitude",
    )

    return qs


class ServiceOrderingFilter(OrderingFilter):
    """Whitelist ordering; price sorts put nulls (QUOTE) last; supports distance."""

    ordering_fields = ["created_at", "name", "price", "distance", "is_boosted"]
    ordering_description = (
        "Tri: created_at, name, price, distance, is_boosted "
        "(préfixe - ; distance nécessite lat/lng)"
    )

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset

        if any(f in ("distance", "-distance") for f in ordering):
            geo = parse_geo_query(request.query_params)
            return apply_whitelisted_ordering(
                queryset,
                ordering=",".join(ordering),
                allowed={"created_at", "name", "price", "distance", "is_boosted"},
                default="-is_boosted,-created_at",
                latitude=geo["latitude"],
                longitude=geo["longitude"],
                lat_field="professional_profile__latitude",
                lng_field="professional_profile__longitude",
            )

        resolved = []
        for field in ordering:
            descending = field.startswith("-")
            name = field[1:] if descending else field
            if name == "price":
                expr = (
                    F("price").desc(nulls_last=True)
                    if descending
                    else F("price").asc(nulls_last=True)
                )
                resolved.append(expr)
            else:
                resolved.append(field)
        return queryset.order_by(*resolved)
