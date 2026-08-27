"""Dispute / litige models — client claims on orders or service requests."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class DisputeReason(models.TextChoices):
    NOT_RECEIVED = "NOT_RECEIVED", "Non reçu / non livré"
    NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED", "Non conforme à la description"
    NOT_PERFORMED = "NOT_PERFORMED", "Prestation non réalisée"
    PAYMENT_ISSUE = "PAYMENT_ISSUE", "Problème de paiement"
    OTHER = "OTHER", "Autre"


class DisputeStatus(models.TextChoices):
    OPEN = "OPEN", "Ouvert"
    SELLER_REPLIED = "SELLER_REPLIED", "Réponse vendeur"
    RESOLVED = "RESOLVED", "Résolu"
    CLOSED = "CLOSED", "Fermé"
    REJECTED = "REJECTED", "Rejeté"


OPEN_STATUSES = (DisputeStatus.OPEN, DisputeStatus.SELLER_REPLIED)


class Dispute(models.Model):
    """
    One active (OPEN / SELLER_REPLIED) dispute per order OR service request.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="disputes_opened",
        verbose_name="ouvert par",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="disputes",
        null=True,
        blank=True,
        verbose_name="commande",
    )
    service_request = models.ForeignKey(
        "pro_services.ServiceRequest",
        on_delete=models.CASCADE,
        related_name="disputes",
        null=True,
        blank=True,
        verbose_name="demande de service",
    )
    reason = models.CharField(
        "motif",
        max_length=40,
        choices=DisputeReason.choices,
        default=DisputeReason.OTHER,
    )
    description = models.TextField("description", max_length=3000)
    seller_reply = models.TextField("réponse vendeur", blank=True, max_length=3000)
    admin_note = models.TextField("note admin", blank=True, max_length=3000)
    status = models.CharField(
        "statut",
        max_length=20,
        choices=DisputeStatus.choices,
        default=DisputeStatus.OPEN,
        db_index=True,
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "litige"
        verbose_name_plural = "litiges"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["opened_by", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(order__isnull=False, service_request__isnull=True)
                    | Q(order__isnull=True, service_request__isnull=False)
                ),
                name="dispute_order_xor_service_request",
            ),
            models.UniqueConstraint(
                fields=["order"],
                condition=Q(
                    order__isnull=False,
                    status__in=["OPEN", "SELLER_REPLIED"],
                ),
                name="uniq_open_dispute_per_order",
            ),
            models.UniqueConstraint(
                fields=["service_request"],
                condition=Q(
                    service_request__isnull=False,
                    status__in=["OPEN", "SELLER_REPLIED"],
                ),
                name="uniq_open_dispute_per_service_request",
            ),
        ]

    def __str__(self) -> str:
        return f"Dispute<{self.id}> {self.status}"

    @property
    def is_open(self) -> bool:
        return self.status in OPEN_STATUSES
