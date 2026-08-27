"""Service catalog models — Service + ServiceImage (Phase 6.2)."""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class ServiceStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    ACTIVE = "ACTIVE", "Actif"
    ARCHIVED = "ARCHIVED", "Archivé"


class ServicePriceType(models.TextChoices):
    FIXED = "FIXED", "Prix fixe"
    FROM = "FROM", "À partir de"
    QUOTE = "QUOTE", "Sur devis"


class Service(models.Model):
    """
    Service listed by a professional profile.

    Slug is unique per professional profile (not globally).
    Public marketplace shows ACTIVE services whose profile is ACTIVE.
    """

    MAX_IMAGES = 8

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_profile = models.ForeignKey(
        "professionals.ProfessionalProfile",
        on_delete=models.CASCADE,
        related_name="services",
        verbose_name="profil professionnel",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services",
        verbose_name="catégorie",
    )
    name = models.CharField("nom", max_length=200)
    slug = models.SlugField("slug", max_length=220, db_index=True)
    description = models.TextField("description", blank=True)
    price = models.DecimalField(
        "prix (MAD)",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    price_type = models.CharField(
        "type de prix",
        max_length=10,
        choices=ServicePriceType.choices,
        default=ServicePriceType.FIXED,
        db_index=True,
    )
    duration = models.CharField(
        "durée",
        max_length=80,
        blank=True,
        help_text="Ex: 30 min, 1 h, demi-journée",
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=ServiceStatus.choices,
        default=ServiceStatus.DRAFT,
        db_index=True,
    )
    is_featured = models.BooleanField("mis en avant", default=False, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "service"
        verbose_name_plural = "services"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["professional_profile", "slug"],
                name="uniq_service_profile_slug",
            ),
            models.CheckConstraint(
                condition=Q(price__isnull=True) | Q(price__gt=0),
                name="service_price_positive_or_null",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["status", "price_type"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def is_publicly_visible(self) -> bool:
        from apps.professionals.models import ProfessionalStatus

        if self.status != ServiceStatus.ACTIVE:
            return False
        profile = self.professional_profile
        if profile.status != ProfessionalStatus.ACTIVE:
            return False
        if not profile.city.is_active:
            return False
        if self.category_id and not self.category.is_active:
            return False
        return True


class ServiceImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="service",
    )
    image = models.URLField("image", max_length=500)
    alt_text = models.CharField("texte alternatif", max_length=200, blank=True)
    order = models.PositiveSmallIntegerField("ordre", default=0)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "image de service"
        verbose_name_plural = "images de service"
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["service", "order"],
                name="uniq_service_image_order",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.service_id}#{self.order}"


class ServiceRequestStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    ACCEPTED = "ACCEPTED", "Acceptée"
    REJECTED = "REJECTED", "Refusée"
    CANCELLED = "CANCELLED", "Annulée"
    COMPLETED = "COMPLETED", "Terminée"


class ServiceRequest(models.Model):
    """
    Client request for a professional service (Phase 6.6).

    No payment in v1 — contact / status workflow only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="requests",
        verbose_name="service",
    )
    client = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="service_requests",
        verbose_name="client",
    )
    professional = models.ForeignKey(
        "professionals.ProfessionalProfile",
        on_delete=models.PROTECT,
        related_name="service_requests",
        verbose_name="professionnel",
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=ServiceRequestStatus.choices,
        default=ServiceRequestStatus.PENDING,
        db_index=True,
    )
    message = models.TextField("message")
    requested_date = models.DateField("date souhaitée", null=True, blank=True)
    requested_time = models.TimeField("heure souhaitée", null=True, blank=True)
    address = models.CharField("adresse", max_length=255)
    phone = models.CharField("téléphone", max_length=30)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "demande de service"
        verbose_name_plural = "demandes de service"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["client", "-created_at"]),
            models.Index(fields=["professional", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Request {self.id} ({self.status})"

