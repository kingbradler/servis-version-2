"""Product catalog models — Product + ProductImage (Phase 3.3)."""

import uuid

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from decimal import Decimal


class ProductStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    ACTIVE = "ACTIVE", "Actif"
    OUT_OF_STOCK = "OUT_OF_STOCK", "Rupture de stock"
    ARCHIVED = "ARCHIVED", "Archivé"


class Product(models.Model):
    """
    Product listed by a seller store.

    Slug is unique per store (not globally).
    Public marketplace shows ACTIVE products whose store is ACTIVE.
    """

    # Absolute ceiling (Boutique Pro). Per-plan limits are enforced via billing.
    MAX_IMAGES = 5

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="boutique",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name="catégorie",
    )
    name = models.CharField("nom", max_length=200)
    slug = models.SlugField("slug", max_length=220, db_index=True)
    description = models.TextField("description", blank=True)
    price = models.DecimalField(
        "prix (MAD)",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    compare_price = models.DecimalField(
        "prix barré (MAD)",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    stock = models.PositiveIntegerField("stock", default=0)
    status = models.CharField(
        "statut",
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
    )
    is_featured = models.BooleanField("mis en avant", default=False, db_index=True)
    video_url = models.URLField(
        "vidéo Instagram / TikTok",
        blank=True,
        max_length=500,
        help_text="Lien optionnel vers une vidéo produit (Instagram ou TikTok).",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "produit"
        verbose_name_plural = "produits"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["store", "slug"],
                name="uniq_product_store_slug",
            ),
        ]
        indexes = [
            models.Index(fields=["store", "status"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["status", "price"]),
            models.Index(fields=["is_featured", "status"]),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()
        if self.compare_price is not None and self.price is not None:
            if self.compare_price <= self.price:
                raise ValidationError(
                    {
                        "compare_price": (
                            "Le prix barré doit être strictement supérieur au prix."
                        )
                    }
                )

    def apply_stock_status_rules(self) -> None:
        """Auto OUT_OF_STOCK when ACTIVE and stock hits 0."""
        if self.stock == 0 and self.status == ProductStatus.ACTIVE:
            self.status = ProductStatus.OUT_OF_STOCK

    def save(self, *args, **kwargs):
        self.apply_stock_status_rules()
        return super().save(*args, **kwargs)

    @property
    def is_publicly_visible(self) -> bool:
        from apps.stores.models import StoreStatus

        if self.status != ProductStatus.ACTIVE:
            return False
        if self.store.status != StoreStatus.ACTIVE:
            return False
        if self.category_id and not self.category.is_active:
            return False
        return True


class ProductImage(models.Model):
    """Product gallery image. order=0 is the primary image."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="produit",
    )
    image = models.URLField("URL image", max_length=500)
    alt_text = models.CharField("texte alternatif", max_length=200, blank=True)
    order = models.PositiveSmallIntegerField("ordre", default=0)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "image produit"
        verbose_name_plural = "images produit"
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "order"],
                name="uniq_product_image_order",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "order"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_id}#{self.order}"
