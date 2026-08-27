"""Cart and Order models — Phase 3.4."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Cart(models.Model):
    """One cart per authenticated CLIENT (OneToOne)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
        verbose_name="client",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "panier"
        verbose_name_plural = "paniers"

    def __str__(self) -> str:
        return f"Cart<{self.user_id}>"

    @property
    def total_amount(self) -> Decimal:
        total = Decimal("0.00")
        for item in self.items.select_related("product"):
            total += item.product.price * item.quantity
        return total.quantize(Decimal("0.01"))


class CartItem(models.Model):
    """Line in a client cart. Price always read from Product, never stored here."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="panier",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="produit",
    )
    quantity = models.PositiveIntegerField(
        "quantité",
        validators=[MinValueValidator(1)],
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "article panier"
        verbose_name_plural = "articles panier"
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="uniq_cart_product",
            ),
        ]
        indexes = [
            models.Index(fields=["cart", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_id} x{self.quantity}"

    @property
    def line_total(self) -> Decimal:
        return (self.product.price * self.quantity).quantize(Decimal("0.01"))


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    CONFIRMED = "CONFIRMED", "Confirmée"
    PROCESSING = "PROCESSING", "En préparation"
    READY = "READY", "Prête"
    COMPLETED = "COMPLETED", "Terminée"
    CANCELLED = "CANCELLED", "Annulée"


class Order(models.Model):
    """
    Client order scoped to a single store.

    Multi-store carts create multiple Order rows at checkout.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name="client",
    )
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name="boutique",
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(
        "total (MAD)",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    store_name_snapshot = models.CharField("nom boutique (snapshot)", max_length=150)
    # Delivery / pickup contact — captured at checkout (snapshot, not linked to profile)
    delivery_name = models.CharField("destinataire", max_length=120, blank=True)
    delivery_phone = models.CharField("téléphone livraison", max_length=30, blank=True)
    delivery_address = models.CharField("adresse", max_length=300, blank=True)
    delivery_city = models.CharField("ville", max_length=100, blank=True, default="")
    delivery_notes = models.CharField("notes livraison", max_length=400, blank=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "commande"
        verbose_name_plural = "commandes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["store", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Order<{self.id}> {self.status}"


class OrderItem(models.Model):
    """Frozen line item — name/price snapshot survive product edits."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="commande",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="produit",
    )
    product_name_snapshot = models.CharField("nom produit (snapshot)", max_length=200)
    unit_price = models.DecimalField(
        "prix unitaire (MAD)",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    quantity = models.PositiveIntegerField(
        "quantité",
        validators=[MinValueValidator(1)],
    )
    subtotal = models.DecimalField(
        "sous-total (MAD)",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "ligne commande"
        verbose_name_plural = "lignes commande"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["order", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_name_snapshot} x{self.quantity}"
