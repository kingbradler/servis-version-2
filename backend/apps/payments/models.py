"""Seller-owned manual payments with proof — Phase 3.5 (revised).

Client pays the seller directly. Seller confirms/rejects proof.
No external gateways. Admin does NOT confirm payments.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class PaymentMethodType(models.TextChoices):
    MOBILE_MONEY = "MOBILE_MONEY", "Mobile Money"
    BANK_TRANSFER = "BANK_TRANSFER", "Virement bancaire"
    CASH = "CASH", "Espèces"
    OTHER = "OTHER", "Autre"


class PaymentMethod(models.Model):
    """Payment instructions owned by a store (seller configures)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(
        "stores.Store",
        on_delete=models.CASCADE,
        related_name="payment_methods",
        verbose_name="boutique",
    )
    type = models.CharField(
        "type",
        max_length=30,
        choices=PaymentMethodType.choices,
        default=PaymentMethodType.MOBILE_MONEY,
    )
    label = models.CharField("libellé", max_length=120)
    account_name = models.CharField("nom du bénéficiaire", max_length=150)
    account_number = models.CharField("numéro / compte", max_length=120, blank=True)
    instructions = models.TextField("instructions", blank=True)
    is_active = models.BooleanField("actif", default=True, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "moyen de paiement"
        verbose_name_plural = "moyens de paiement"
        ordering = ["label"]
        indexes = [
            models.Index(fields=["store", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.label} ({self.store_id})"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    PROOF_SUBMITTED = "PROOF_SUBMITTED", "Preuve envoyée"
    CONFIRMED = "CONFIRMED", "Confirmé"
    REJECTED = "REJECTED", "Rejeté"
    CANCELLED = "CANCELLED", "Annulé"


class PaymentProofStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Soumise"
    ACCEPTED = "ACCEPTED", "Acceptée"
    REJECTED = "REJECTED", "Rejetée"
    SUPERSEDED = "SUPERSEDED", "Remplacée"


class Payment(models.Model):
    """
    One payment per order OR per service request (exactly one parent).
    Amount is snapshotted from Order.total_amount or Service.price.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payment",
        verbose_name="commande",
        null=True,
        blank=True,
    )
    service_request = models.OneToOneField(
        "pro_services.ServiceRequest",
        on_delete=models.PROTECT,
        related_name="payment",
        verbose_name="demande de service",
        null=True,
        blank=True,
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="payments",
        verbose_name="moyen de paiement",
    )
    amount = models.DecimalField(
        "montant",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField("devise", max_length=3, default="MAD")
    status = models.CharField(
        "statut",
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    # Convenience pointer to latest proof file URL (history in PaymentProof)
    proof = models.CharField("preuve courante", max_length=500, blank=True)
    proof_uploaded_at = models.DateTimeField(
        "dernière preuve le", null=True, blank=True
    )
    seller_reviewed_at = models.DateTimeField(
        "revu par vendeur le", null=True, blank=True
    )
    seller_rejection_reason = models.TextField("motif de rejet", blank=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "paiement"
        verbose_name_plural = "paiements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(order__isnull=False, service_request__isnull=True)
                    | models.Q(order__isnull=True, service_request__isnull=False)
                ),
                name="payment_order_xor_service_request",
            ),
        ]

    def __str__(self) -> str:
        return f"Payment<{self.id}> {self.status}"

    @property
    def is_paid(self) -> bool:
        return self.status == PaymentStatus.CONFIRMED


class PaymentProof(models.Model):
    """Historical proof uploads for a payment."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="proofs",
        verbose_name="paiement",
    )
    file_url = models.CharField("fichier", max_length=500)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_proofs",
        verbose_name="envoyé par",
    )
    uploaded_at = models.DateTimeField("envoyé le", default=timezone.now, editable=False)
    status = models.CharField(
        "statut",
        max_length=20,
        choices=PaymentProofStatus.choices,
        default=PaymentProofStatus.SUBMITTED,
        db_index=True,
    )
    rejection_reason = models.TextField("motif de rejet", blank=True)

    class Meta:
        verbose_name = "preuve de paiement"
        verbose_name_plural = "preuves de paiement"
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["payment", "-uploaded_at"]),
        ]

    def __str__(self) -> str:
        return f"Proof<{self.id}> {self.status}"
