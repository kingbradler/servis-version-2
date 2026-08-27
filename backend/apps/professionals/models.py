"""Professional profiles — Phase 6.1 (soft migration alongside SELLER + Store)."""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.users.choices import UserRole


class ProfessionalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    PENDING = "PENDING", "En attente"
    ACTIVE = "ACTIVE", "Actif"
    SUSPENDED = "SUSPENDED", "Suspendu"


class ProfessionalProfile(models.Model):
    """
    Prestataire / professionnel capable de proposer des services (Phase 6.2+).

    Soft migration: owner must be SELLER. Same user may also own a Store.
    Public marketplace shows ACTIVE profiles only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="professional_profile",
        verbose_name="propriétaire",
    )
    display_name = models.CharField("nom affiché", max_length=150)
    slug = models.SlugField("slug", max_length=180, unique=True, db_index=True)
    headline = models.CharField(
        "métier / titre",
        max_length=150,
        help_text="Ex: Plombier, Coiffeur, Développeur",
    )
    bio = models.TextField("présentation", blank=True)
    city = models.ForeignKey(
        "stores.City",
        on_delete=models.PROTECT,
        related_name="professional_profiles",
        verbose_name="ville",
    )
    address = models.CharField("adresse", max_length=255, blank=True)
    neighborhood = models.CharField("quartier", max_length=120, blank=True)
    postal_code = models.CharField("code postal", max_length=20, blank=True)
    phone = models.CharField("téléphone", max_length=30, blank=True)
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True)
    avatar = models.URLField("avatar", blank=True)
    cover = models.URLField("bannière", blank=True)
    instagram_url = models.URLField("Instagram", blank=True, max_length=500)
    tiktok_url = models.URLField("TikTok", blank=True, max_length=500)
    facebook_url = models.URLField("Facebook", blank=True, max_length=500)
    # Prepared for Phase 6.4 geolocation (nullable until set)
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
        choices=ProfessionalStatus.choices,
        default=ProfessionalStatus.DRAFT,
        db_index=True,
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "profil professionnel"
        verbose_name_plural = "profils professionnels"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "city"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} — {self.headline}"

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
        return self.status == ProfessionalStatus.ACTIVE

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None
