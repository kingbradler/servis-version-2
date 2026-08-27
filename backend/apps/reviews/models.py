"""Review models — service (professionals) and product ratings."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Review(models.Model):
    """
    Verified review of a professional after a COMPLETED service request.

    One review per service request. Does not alter existing ServiceRequest
    or ProfessionalProfile schemas beyond a reverse relation.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_authored",
        verbose_name="auteur",
    )
    professional = models.ForeignKey(
        "professionals.ProfessionalProfile",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="professionnel",
    )
    service_request = models.OneToOneField(
        "pro_services.ServiceRequest",
        on_delete=models.PROTECT,
        related_name="review",
        verbose_name="demande de service",
    )
    rating = models.PositiveSmallIntegerField(
        "note",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField("commentaire", blank=True)
    is_visible = models.BooleanField(
        "visible",
        default=True,
        db_index=True,
        help_text="Masqué par la moderation si False.",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "avis"
        verbose_name_plural = "avis"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["professional", "-created_at"]),
            models.Index(fields=["author", "-created_at"]),
            models.Index(fields=["is_visible", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Review {self.rating}/5 on {self.professional_id}"


class ProductReview(models.Model):
    """
    Verified product review after a COMPLETED order line.

    One review per order item (purchase proof). Product FK kept for public
    aggregation; name snapshot survives product edits.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews_authored",
        verbose_name="auteur",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="produit",
    )
    order_item = models.OneToOneField(
        "orders.OrderItem",
        on_delete=models.PROTECT,
        related_name="product_review",
        verbose_name="ligne commande",
    )
    product_name_snapshot = models.CharField(
        "nom produit (snapshot)", max_length=200
    )
    rating = models.PositiveSmallIntegerField(
        "note",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField("commentaire", blank=True)
    is_visible = models.BooleanField(
        "visible",
        default=True,
        db_index=True,
        help_text="Masqué par la moderation si False.",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "avis produit"
        verbose_name_plural = "avis produits"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
            models.Index(fields=["author", "-created_at"]),
            models.Index(fields=["is_visible", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"ProductReview {self.rating}/5 on {self.product_id}"
