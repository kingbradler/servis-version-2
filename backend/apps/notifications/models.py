"""In-app notifications for SERVIS users."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class NotificationType(models.TextChoices):
    ORDER_NEW = "ORDER_NEW", "Nouvelle commande"
    PAYMENT_PROOF = "PAYMENT_PROOF", "Preuve de paiement"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED", "Paiement confirmé"
    PAYMENT_REJECTED = "PAYMENT_REJECTED", "Paiement rejeté"
    MESSAGE_NEW = "MESSAGE_NEW", "Nouveau message"
    SUB_EXPIRING = "SUB_EXPIRING", "Abonnement bientôt expiré"
    SUB_EXPIRED = "SUB_EXPIRED", "Abonnement expiré"
    DISPUTE_OPENED = "DISPUTE_OPENED", "Nouveau litige"
    DISPUTE_REPLY = "DISPUTE_REPLY", "Réponse litige"
    DISPUTE_RESOLVED = "DISPUTE_RESOLVED", "Litige traité"
    SYSTEM = "SYSTEM", "Système"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="destinataire",
    )
    type = models.CharField(
        "type",
        max_length=40,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
    )
    title = models.CharField("titre", max_length=160)
    body = models.CharField("message", max_length=500, blank=True)
    link = models.CharField("lien", max_length=300, blank=True)
    is_read = models.BooleanField("lu", default=False, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "notification"
        verbose_name_plural = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.type} → {self.user_id}"
