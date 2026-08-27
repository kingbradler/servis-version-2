"""Core models — site-wide feedback & homepage hero slides."""

from __future__ import annotations

import uuid

from django.db import models
from django.utils import timezone


class SiteFeedbackKind(models.TextChoices):
    MESSAGE = "MESSAGE", "Message"
    RECOMMENDATION = "RECOMMENDATION", "Recommandation"


class SiteFeedback(models.Model):
    """
    Public footer form: messages or recommendations about SERVIS.
    Additive — does not alter existing domain apps.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(
        "type",
        max_length=20,
        choices=SiteFeedbackKind.choices,
        default=SiteFeedbackKind.MESSAGE,
        db_index=True,
    )
    name = models.CharField("nom", max_length=120)
    email = models.EmailField("email", blank=True)
    body = models.TextField("message", max_length=3000)
    is_read = models.BooleanField("lu", default=False, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "message / recommandation"
        verbose_name_plural = "messages & recommandations"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.kind} — {self.name}"


class HeroSlide(models.Model):
    """Homepage full-bleed carousel slides — managed by admin."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField("titre", max_length=120)
    highlight = models.CharField("surbrillance", max_length=120, blank=True)
    subtitle = models.CharField("sous-titre", max_length=300, blank=True)
    image = models.CharField("image", max_length=500)
    cta_href = models.CharField("lien CTA", max_length=200, default="/products")
    cta_label = models.CharField("libellé CTA", max_length=80, default="Découvrir")
    sort_order = models.PositiveIntegerField("ordre", default=0, db_index=True)
    is_active = models.BooleanField("actif", default=True, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "slide accueil"
        verbose_name_plural = "slides accueil"
        ordering = ["sort_order", "created_at"]

    def __str__(self) -> str:
        return f"{self.sort_order}. {self.title}"
