"""Validation helpers for services — reuses product image validation."""

from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from apps.products.validators import sanitize_text, validate_product_image_file

# Re-export for callers
__all__ = [
    "sanitize_text",
    "validate_product_image_file",
    "validate_service_price",
    "validate_price_type",
]


def validate_service_price(value) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise serializers.ValidationError("Prix invalide.") from exc
    if amount <= 0:
        raise serializers.ValidationError("Le prix doit être strictement supérieur à 0.")
    if amount.as_tuple().exponent < -2:
        raise serializers.ValidationError("Le prix accepte au maximum 2 décimales.")
    return amount.quantize(Decimal("0.01"))


def validate_price_type(value: str) -> str:
    from apps.services.models import ServicePriceType

    if value not in ServicePriceType.values:
        raise serializers.ValidationError("Type de prix invalide.")
    return value
