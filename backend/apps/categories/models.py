"""Category models for SERVIS marketplace catalog."""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class CategoryScope(models.TextChoices):
    """Which marketplace surfaces may use this category."""

    PRODUCT = "PRODUCT", "Produits"
    SERVICE = "SERVICE", "Services"
    BOTH = "BOTH", "Produits et services"


class Category(models.Model):
    """
    Product/service category with optional parent (tree, 2 levels recommended in v1).

    Soft-deactivation via is_active preferred over hard DELETE (future Product FK).
    `scope` distinguishes product vs service catalogs without splitting tables.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField("nom", max_length=120)
    slug = models.SlugField("slug", max_length=140, unique=True, db_index=True)
    description = models.TextField("description", blank=True)
    icon = models.CharField(
        "icône",
        max_length=64,
        blank=True,
        help_text="Nom d'icône Lucide côté frontend (ex: smartphone).",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="catégorie parente",
        db_index=True,
    )
    scope = models.CharField(
        "périmètre",
        max_length=10,
        choices=CategoryScope.choices,
        default=CategoryScope.BOTH,
        db_index=True,
        help_text="PRODUCT, SERVICE ou BOTH — défaut BOTH (compatibilité).",
    )
    is_active = models.BooleanField("active", default=True, db_index=True)
    order = models.PositiveIntegerField("ordre", default=0, db_index=True)
    created_at = models.DateTimeField("créé le", default=timezone.now, editable=False)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "catégorie"
        verbose_name_plural = "catégories"
        ordering = ["order", "name"]
        indexes = [
            models.Index(fields=["parent", "is_active", "order"]),
            models.Index(fields=["scope", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()
        parent_pk = self.parent_id
        if parent_pk is None and self.parent is not None:
            parent_pk = self.parent.pk
        if self.pk and parent_pk and parent_pk == self.pk:
            raise ValidationError(
                {"parent": "Une catégorie ne peut pas être son propre parent."}
            )

    def save(self, *args, **kwargs):
        parent_pk = self.parent_id
        if parent_pk is None and getattr(self, "parent", None) is not None:
            parent_pk = self.parent.pk
        if self.pk and parent_pk and parent_pk == self.pk:
            raise ValidationError(
                {"parent": "Une catégorie ne peut pas être son propre parent."}
            )
        return super().save(*args, **kwargs)
