"""
Geolocation helpers — Phase 6.4 (no PostGIS / Mapbox).

Public discovery may filter and order by distance using Haversine.
User GPS is never persisted; only query params are used per-request.
"""

from __future__ import annotations

import math
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db.models import F, FloatField, QuerySet, Value
from django.db.models.expressions import ExpressionWrapper
from django.db.models.functions import ACos, Cos, Greatest, Least, Radians, Sin
from rest_framework.exceptions import ValidationError

EARTH_RADIUS_KM = 6371.0
MAX_RADIUS_KM = 100.0
DEFAULT_RADIUS_KM = 10.0


def haversine_km(
    lat1: float | Decimal,
    lon1: float | Decimal,
    lat2: float | Decimal,
    lon2: float | Decimal,
) -> float:
    """Great-circle distance between two WGS84 points, in kilometres."""
    φ1, λ1, φ2, λ2 = map(
        math.radians,
        [float(lat1), float(lon1), float(lat2), float(lon2)],
    )
    dφ = φ2 - φ1
    dλ = λ2 - λ1
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.asin(min(1.0, math.sqrt(a)))


def parse_coordinate(value: Any, *, field: str) -> Decimal | None:
    """Parse a lat/lng query or body value; empty → None."""
    if value is None or value == "":
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field: f"{field} invalide."}) from exc
    return amount


def validate_latitude(value: Decimal | float | None) -> Decimal | None:
    if value is None:
        return None
    amount = Decimal(str(value))
    if amount < Decimal("-90") or amount > Decimal("90"):
        raise ValidationError({"latitude": "Latitude hors limites (−90…90)."})
    return amount


def validate_longitude(value: Decimal | float | None) -> Decimal | None:
    if value is None:
        return None
    amount = Decimal(str(value))
    if amount < Decimal("-180") or amount > Decimal("180"):
        raise ValidationError({"longitude": "Longitude hors limites (−180…180)."})
    return amount


def validate_coordinate_pair(
    latitude: Decimal | float | None,
    longitude: Decimal | float | None,
) -> tuple[Decimal | None, Decimal | None]:
    """
    Latitude and longitude must both be set or both be null.
    Values must be within WGS84 bounds.
    """
    lat = validate_latitude(latitude)
    lng = validate_longitude(longitude)
    if (lat is None) ^ (lng is None):
        raise ValidationError(
            {
                "latitude": "Latitude et longitude doivent être définies ensemble.",
                "longitude": "Latitude et longitude doivent être définies ensemble.",
            }
        )
    return lat, lng


def parse_geo_query(params) -> dict[str, Decimal | float | None]:
    """
    Parse ?latitude=&longitude=&radius= from request query params.

    Rules:
    - lat+lng together, or both absent
    - radius only meaningful with lat+lng (max 100 km)
    - radius without coordinates → 400
    """
    raw_lat = params.get("latitude")
    raw_lng = params.get("longitude")
    raw_radius = params.get("radius")

    lat = parse_coordinate(raw_lat, field="latitude")
    lng = parse_coordinate(raw_lng, field="longitude")
    lat, lng = validate_coordinate_pair(lat, lng)

    radius: float | None = None
    if raw_radius is not None and raw_radius != "":
        if lat is None or lng is None:
            raise ValidationError(
                {
                    "radius": (
                        "Le rayon nécessite latitude et longitude "
                        "(position de l'utilisateur)."
                    )
                }
            )
        try:
            radius = float(raw_radius)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"radius": "Rayon invalide."}) from exc
        if radius <= 0:
            raise ValidationError({"radius": "Le rayon doit être positif."})
        if radius > MAX_RADIUS_KM:
            raise ValidationError(
                {"radius": f"Rayon maximum autorisé : {int(MAX_RADIUS_KM)} km."}
            )

    return {"latitude": lat, "longitude": lng, "radius": radius}


def location_payload(obj) -> dict:
    """Public nested location object for Store / ProfessionalProfile."""
    city = getattr(obj, "city", None)
    lat = getattr(obj, "latitude", None)
    lng = getattr(obj, "longitude", None)
    return {
        "address": getattr(obj, "address", "") or "",
        "city": city.name if city is not None else None,
        "neighborhood": getattr(obj, "neighborhood", "") or "",
        "postal_code": getattr(obj, "postal_code", "") or "",
        "latitude": float(lat) if lat is not None else None,
        "longitude": float(lng) if lng is not None else None,
    }


def _distance_expression(
    user_lat: float, user_lng: float, *, lat_field: str, lng_field: str
):
    """Spherical law of cosines distance in km (Haversine-equivalent)."""
    lat1 = Radians(Value(user_lat, output_field=FloatField()))
    lng1 = Radians(Value(user_lng, output_field=FloatField()))
    lat2 = Radians(F(lat_field))
    lng2 = Radians(F(lng_field))
    cos_c = Sin(lat1) * Sin(lat2) + Cos(lat1) * Cos(lat2) * Cos(lng2 - lng1)
    cos_c = Least(
        Value(1.0, output_field=FloatField()),
        Greatest(Value(-1.0, output_field=FloatField()), cos_c),
    )
    return ExpressionWrapper(
        ACos(cos_c) * Value(EARTH_RADIUS_KM, output_field=FloatField()),
        output_field=FloatField(),
    )


def annotate_distance(
    qs: QuerySet,
    *,
    latitude: float | Decimal,
    longitude: float | Decimal,
    lat_field: str = "latitude",
    lng_field: str = "longitude",
) -> QuerySet:
    """Annotate queryset with `distance_km`."""
    expr = _distance_expression(
        float(latitude),
        float(longitude),
        lat_field=lat_field,
        lng_field=lng_field,
    )
    return qs.annotate(distance_km=expr)


def apply_geo_filter(
    qs: QuerySet,
    *,
    latitude: Decimal | float | None,
    longitude: Decimal | float | None,
    radius: float | None,
    lat_field: str = "latitude",
    lng_field: str = "longitude",
) -> QuerySet:
    """
    When user coordinates (+ optional radius) are provided:
    - exclude entities without coordinates
    - annotate distance_km
    - if radius set, keep only entities within radius km
    """
    if latitude is None or longitude is None:
        return qs

    qs = qs.exclude(**{f"{lat_field}__isnull": True}).exclude(
        **{f"{lng_field}__isnull": True}
    )
    qs = annotate_distance(
        qs,
        latitude=latitude,
        longitude=longitude,
        lat_field=lat_field,
        lng_field=lng_field,
    )

    if radius is not None:
        lat_f = float(latitude)
        lng_f = float(longitude)
        lat_delta = radius / 111.0
        cos_lat = max(0.01, abs(math.cos(math.radians(lat_f))))
        lng_delta = radius / (111.0 * cos_lat)
        qs = qs.filter(
            **{
                f"{lat_field}__gte": lat_f - lat_delta,
                f"{lat_field}__lte": lat_f + lat_delta,
                f"{lng_field}__gte": lng_f - lng_delta,
                f"{lng_field}__lte": lng_f + lng_delta,
            }
        ).filter(distance_km__lte=radius)
    return qs


def apply_distance_ordering(
    qs: QuerySet,
    *,
    ordering: str | None,
    latitude: Decimal | float | None,
    longitude: Decimal | float | None,
    lat_field: str = "latitude",
    lng_field: str = "longitude",
) -> QuerySet:
    """
    Handle ordering=distance / -distance.

    Requires user coordinates; otherwise raises ValidationError (not 500).
    """
    if not ordering:
        return qs
    fields = [f.strip() for f in ordering.split(",") if f.strip()]
    wants_distance = any(f in ("distance", "-distance") for f in fields)
    if not wants_distance:
        return qs

    if latitude is None or longitude is None:
        raise ValidationError(
            {
                "ordering": (
                    "Le tri par distance nécessite latitude et longitude "
                    "(position de l'utilisateur)."
                )
            }
        )

    if "distance_km" not in qs.query.annotations:
        qs = apply_geo_filter(
            qs,
            latitude=latitude,
            longitude=longitude,
            radius=None,
            lat_field=lat_field,
            lng_field=lng_field,
        )

    resolved = []
    for field in fields:
        if field == "distance":
            resolved.append("distance_km")
        elif field == "-distance":
            resolved.append("-distance_km")
        else:
            resolved.append(field)
    return qs.order_by(*resolved)


def apply_whitelisted_ordering(
    qs: QuerySet,
    *,
    ordering: str | None,
    allowed: set[str],
    default: str = "-created_at",
    latitude: Decimal | float | None = None,
    longitude: Decimal | float | None = None,
    lat_field: str = "latitude",
    lng_field: str = "longitude",
) -> QuerySet:
    """
    Apply safe ordering including optional distance.

    `allowed` should list base field names without sign (e.g. {"created_at","name","distance"}).
    """
    raw = (ordering or default).strip() or default
    fields = [f.strip() for f in raw.split(",") if f.strip()]
    for field in fields:
        name = field[1:] if field.startswith("-") else field
        if name not in allowed:
            raise ValidationError({"ordering": f"Tri non autorisé : {name}."})

    if any(f in ("distance", "-distance") for f in fields):
        return apply_distance_ordering(
            qs,
            ordering=raw,
            latitude=latitude,
            longitude=longitude,
            lat_field=lat_field,
            lng_field=lng_field,
        )

    return qs.order_by(*fields)
