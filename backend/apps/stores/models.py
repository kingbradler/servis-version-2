"""Store-related models — City + Store (Phase 3.2)."""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.users.choices import UserRole

class City(models.Model):
    """
    Moroccan city available on SERVIS.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField("nom", max_length=100)
    slug = models.SlugField("slug", max_length=120, unique=True, db_index=True)
    region = models.CharField("région", max_length=150)
    is_active = models.BooleanField("active", default=True, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "ville"
        verbose_name_plural = "villes"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self) -> str:
        return self.name


class StoreStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    PENDING = "PENDING", "En attente"
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspendue"


class Store(models.Model):
    """
    Seller boutique on SERVIS.

    v1: one store per SELLER (OneToOne owner).
    Public marketplace shows ACTIVE stores only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="store",
        verbose_name="propriétaire",
    )
    name = models.CharField("nom", max_length=150)
    slug = models.SlugField("slug", max_length=180, unique=True, db_index=True)
    description = models.TextField("description", blank=True)
    logo = models.URLField("logo", blank=True)
    banner = models.URLField("bannière", blank=True)
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="stores",
        verbose_name="ville",
    )
    address = models.CharField("adresse", max_length=255, blank=True)
    neighborhood = models.CharField("quartier", max_length=120, blank=True)
    postal_code = models.CharField("code postal", max_length=20, blank=True)
    latitude = models.DecimalField(
        "latitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("-90")),
            MaxValueValidator(Decimal("90")),
        ],
    )
    longitude = models.DecimalField(
        "longitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("-180")),
            MaxValueValidator(Decimal("180")),
        ],
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=StoreStatus.choices,
        default=StoreStatus.DRAFT,
        db_index=True,
    )
    phone = models.CharField("téléphone", max_length=30, blank=True)
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "boutique"
        verbose_name_plural = "boutiques"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "city"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()
        if self.owner_id:
            owner = getattr(self, "owner", None)
            if owner is not None and owner.role != UserRole.SELLER:
                raise ValidationError(
                    {"owner": "Le propriétaire doit avoir le rôle SELLER."}
                )
        if (self.latitude is None) ^ (self.longitude is None):
            raise ValidationError(
                {
                    "latitude": "Latitude et longitude doivent être définies ensemble.",
                    "longitude": "Latitude et longitude doivent être définies ensemble.",
                }
            )

    @property
    def is_public(self) -> bool:
        return self.status == StoreStatus.ACTIVE

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None
