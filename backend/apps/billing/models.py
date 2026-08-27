"""Billing models — plans, subscriptions, platform payments, boosts (Phase 6.8).

Manual payments only. Admin validates proofs.
Separate from marketplace order payments (apps.payments).
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PlanType(models.TextChoices):
    STORE_FREE = "STORE_FREE", "Boutique Free"
    STORE_STANDARD = "STORE_STANDARD", "Boutique Standard"
    STORE_PRO = "STORE_PRO", "Boutique Pro"
    SERVICE_STANDARD = "SERVICE_STANDARD", "Services Standard"
    SERVICE_PRO = "SERVICE_PRO", "Services Pro"


class PlanCategory(models.TextChoices):
    STORE = "STORE", "Boutique"
    SERVICE = "SERVICE", "Services"


class Plan(models.Model):
    """Commercial offer (seeded; admin can deactivate)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        "code",
        max_length=40,
        unique=True,
        choices=PlanType.choices,
    )
    name = models.CharField("nom", max_length=120)
    plan_type = models.CharField(
        "type",
        max_length=40,
        choices=PlanType.choices,
        db_index=True,
    )
    category = models.CharField(
        "catégorie",
        max_length=20,
        choices=PlanCategory.choices,
        db_index=True,
    )
    price = models.DecimalField(
        "prix (DH)",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    duration_days = models.PositiveIntegerField("durée (jours)", default=30)
    product_limit = models.PositiveIntegerField(
        "limite produits actifs",
        null=True,
        blank=True,
        help_text="Null = illimité. Ignoré pour les plans SERVICE.",
    )
    product_image_limit = models.PositiveIntegerField(
        "limite photos par produit",
        default=1,
        help_text="Nombre max d'images par article boutique. Ignoré pour les plans SERVICE.",
    )
    service_enabled = models.BooleanField("autorise les services", default=False)
    advanced_stats = models.BooleanField("stats avancées", default=False)
    visibility_level = models.PositiveSmallIntegerField(
        "niveau de visibilité",
        default=0,
        help_text="0=base, 1=amélioré, 2=pro — n'équivaut pas à une note.",
    )
    boosts_allowed = models.BooleanField("boosts autorisés", default=False)
    is_active = models.BooleanField("actif", default=True, db_index=True)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "plan"
        verbose_name_plural = "plans"
        ordering = ["sort_order", "price"]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"

    @property
    def is_free(self) -> bool:
        return self.price == 0 or self.code == PlanType.STORE_FREE


class SubscriptionStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    ACTIVE = "ACTIVE", "Actif"
    EXPIRED = "EXPIRED", "Expiré"
    REJECTED = "REJECTED", "Refusé"
    CANCELLED = "CANCELLED", "Annulé"


class Subscription(models.Model):
    """
    Seller subscription for STORE or SERVICE category.

    Billing entity = User (SELLER). Store-only sellers need no ProfessionalProfile.
    At most one ACTIVE subscription per (owner, category).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        verbose_name="professionnel",
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
        verbose_name="plan",
    )
    category = models.CharField(
        "catégorie",
        max_length=20,
        choices=PlanCategory.choices,
        db_index=True,
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING,
        db_index=True,
    )
    starts_at = models.DateTimeField("début", null=True, blank=True)
    expires_at = models.DateTimeField("expiration", null=True, blank=True)
    activated_at = models.DateTimeField("activé le", null=True, blank=True)
    cancelled_at = models.DateTimeField("annulé le", null=True, blank=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "abonnement"
        verbose_name_plural = "abonnements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "category", "status"]),
            models.Index(fields=["status", "expires_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "category"],
                condition=Q(status=SubscriptionStatus.ACTIVE),
                name="uniq_active_subscription_per_owner_category",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.owner_id} {self.plan.code} ({self.status})"


class PlatformPaymentMethod(models.Model):
    """SERVIS platform payment instructions (admin-managed). Not seller store methods."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField("nom", max_length=120)
    account_name = models.CharField("bénéficiaire", max_length=150)
    account_number = models.CharField("numéro / compte", max_length=120, blank=True)
    instructions = models.TextField("instructions", blank=True)
    is_active = models.BooleanField("actif", default=True, db_index=True)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "moyen de paiement SERVIS"
        verbose_name_plural = "moyens de paiement SERVIS"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class SubscriptionPaymentStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    PROOF_SUBMITTED = "PROOF_SUBMITTED", "Preuve envoyée"
    APPROVED = "APPROVED", "Approuvé"
    REJECTED = "REJECTED", "Refusé"


class SubscriptionPayment(models.Model):
    """Manual payment for a subscription — admin approves."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="abonnement",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_payments",
        verbose_name="professionnel",
    )
    amount = models.DecimalField(
        "montant",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_method = models.ForeignKey(
        PlatformPaymentMethod,
        on_delete=models.PROTECT,
        related_name="subscription_payments",
        verbose_name="moyen de paiement",
    )
    status = models.CharField(
        "statut",
        max_length=20,
        choices=SubscriptionPaymentStatus.choices,
        default=SubscriptionPaymentStatus.PENDING,
        db_index=True,
    )
    reference = models.CharField("référence", max_length=120, blank=True)
    proof = models.CharField("preuve (clé storage)", max_length=500, blank=True)
    submitted_at = models.DateTimeField("preuve envoyée le", null=True, blank=True)
    reviewed_at = models.DateTimeField("revu le", null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_subscription_payments",
        verbose_name="revu par",
    )
    rejection_reason = models.TextField("motif de refus", blank=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "paiement d'abonnement"
        verbose_name_plural = "paiements d'abonnement"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"SubPay {self.id} ({self.status})"


class BoostTargetType(models.TextChoices):
    STORE = "STORE", "Boutique"
    PRODUCT = "PRODUCT", "Produit"
    SERVICE = "SERVICE", "Service"


class BoostStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    ACTIVE = "ACTIVE", "Actif"
    EXPIRED = "EXPIRED", "Expiré"
    REJECTED = "REJECTED", "Refusé"
    CANCELLED = "CANCELLED", "Annulé"


class BoostPackage(models.Model):
    """Priced boost duration packages (7j / 30j)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField("code", max_length=40, unique=True)
    name = models.CharField("nom", max_length=120)
    duration_days = models.PositiveIntegerField("durée (jours)")
    price = models.DecimalField(
        "prix (DH)",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    is_active = models.BooleanField("actif", default=True, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "forfait boost"
        verbose_name_plural = "forfaits boost"
        ordering = ["duration_days"]

    def __str__(self) -> str:
        return self.name


class BoostPaymentStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    PROOF_SUBMITTED = "PROOF_SUBMITTED", "Preuve envoyée"
    APPROVED = "APPROVED", "Approuvé"
    REJECTED = "REJECTED", "Refusé"


class BoostPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="boost_payments",
    )
    amount = models.DecimalField(
        "montant",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_method = models.ForeignKey(
        PlatformPaymentMethod,
        on_delete=models.PROTECT,
        related_name="boost_payments",
    )
    status = models.CharField(
        max_length=20,
        choices=BoostPaymentStatus.choices,
        default=BoostPaymentStatus.PENDING,
        db_index=True,
    )
    reference = models.CharField(max_length=120, blank=True)
    proof = models.CharField(max_length=500, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_boost_payments",
    )
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class Boost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="boosts",
        verbose_name="professionnel",
    )
    package = models.ForeignKey(
        BoostPackage,
        on_delete=models.PROTECT,
        related_name="boosts",
    )
    target_type = models.CharField(max_length=20, choices=BoostTargetType.choices)
    target_id = models.UUIDField("cible")
    duration_days = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=BoostStatus.choices,
        default=BoostStatus.PENDING,
        db_index=True,
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    payment = models.OneToOneField(
        BoostPayment,
        on_delete=models.PROTECT,
        related_name="boost",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "boost"
        verbose_name_plural = "boosts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id", "status"]),
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"Boost {self.target_type}:{self.target_id} ({self.status})"
