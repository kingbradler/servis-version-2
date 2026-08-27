"""Messaging models — 1:1 conversations between client and professional."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    """
    Thread between one client user and one professional profile.

    Unique pair (client, professional). Additive — does not alter existing apps.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messaging_conversations",
        verbose_name="client",
    )
    professional = models.ForeignKey(
        "professionals.ProfessionalProfile",
        on_delete=models.CASCADE,
        related_name="messaging_conversations",
        verbose_name="professionnel",
    )
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "conversation"
        verbose_name_plural = "conversations"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["client", "professional"],
                name="uniq_messaging_client_professional",
            )
        ]
        indexes = [
            models.Index(fields=["client", "-updated_at"]),
            models.Index(fields=["professional", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return f"Conversation {self.id}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="conversation",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messaging_messages",
        verbose_name="expéditeur",
    )
    body = models.TextField("message", max_length=4000)
    created_at = models.DateTimeField("envoyé le", default=timezone.now, editable=False)
    read_at = models.DateTimeField("lu le", null=True, blank=True)

    class Meta:
        verbose_name = "message"
        verbose_name_plural = "messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["conversation", "read_at"]),
        ]

    def __str__(self) -> str:
        return f"Message {self.id}"
